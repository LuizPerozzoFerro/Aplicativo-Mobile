package expo.modules.labmonitoring

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder

/**
 * Experimento A2: detectar que o usuario passou do limite de uso, com o
 * protótipo fechado.
 *
 * Por que um servico em primeiro plano, e nao algo mais leve:
 *
 * O Android tem uma API feita exatamente para isto,
 * UsageStatsManager.registerAppUsageObserver, que avisa o app quando um grupo de
 * pacotes ultrapassa um tempo. E o que o Bem-estar digital usa nos
 * temporizadores. Mas ela NAO faz parte da API publica (verificado na referencia
 * oficial em 17/09/2026): o sistema a reserva para si. Sem ela, so resta
 * perguntar de tempos em tempos.
 *
 * WorkManager tambem nao serve: o intervalo minimo de trabalho periodico e de 15
 * minutos, grosso demais para um limite de poucos minutos.
 *
 * Sobra o servico em primeiro plano. O tipo escolhido e specialUse, porque
 * nenhum dos tipos catalogados descreve "observar o uso de outros apps" -- o que
 * significa revisao manual do Google Play na publicacao (ver A10).
 */
class UsageLimitService : Service() {

  companion object {

    /**
     * Intervalo entre verificacoes. Vale medir o impacto na bateria (A9/T6): e o
     * principal custo desta abordagem, e a razao de o produto final precisar de
     * um intervalo adaptativo.
     */
    const val CHECK_INTERVAL_MS = 20_000L
  }

  private var thread: HandlerThread? = null
  private var handler: Handler? = null

  private val check = object : Runnable {
    override fun run() {
      runCatching { checkLimit() }
      handler?.postDelayed(this, CHECK_INTERVAL_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    startForegroundWithNotification()

    // A leitura percorre os eventos do dia inteiro; fora da thread principal para
    // nao correr risco de ANR.
    val worker = HandlerThread("lab-usage-limit").apply { start() }
    thread = worker
    handler = Handler(worker.looper).also { it.post(check) }

    EventLog.append(
      context = this,
      source = "UsageLimitService",
      experiment = "A2",
      event = "service_started",
      details = "limite ${LimitConfig.minutes(this)} min, intervalo ${CHECK_INTERVAL_MS / 1000}s"
    )
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // START_STICKY: se o sistema matar o servico por pressao de memoria, ele
    // deve voltar. Se isso realmente acontece num Samsung com economia de bateria
    // ligada e uma das perguntas do A9.
    return START_STICKY
  }

  override fun onDestroy() {
    Handler(mainLooper).post { InterruptionOverlay.hide(this, reason = "servico parado") }
    handler?.removeCallbacks(check)
    thread?.quitSafely()
    thread = null
    handler = null

    EventLog.append(
      context = this,
      source = "UsageLimitService",
      experiment = "A2",
      event = "service_stopped"
    )
    super.onDestroy()
  }

  private fun checkLimit() {
    if (!LimitConfig.isActive(this)) return

    val targets = LimitConfig.packages(this)
    if (targets.isEmpty()) return

    if (LimitConfig.firedAt(this) > 0L) {
      checkAfterLimit(targets)
      return
    }

    val limitMs = LimitConfig.minutes(this) * 60_000L
    val usage = UsageReader.getUsageTodayFromEvents(this)

    val usedMs = usage
      .filter { (it["packageName"] as? String) in targets }
      .sumOf { (it["milliseconds"] as? Long) ?: 0L }

    if (usedMs >= limitMs) {
      LimitConfig.markFired(this, System.currentTimeMillis())
      EventLog.append(
        context = this,
        source = "UsageLimitService",
        experiment = "A2",
        event = "threshold_reached",
        details = "${usedMs / 60000} min de uso para limite de ${LimitConfig.minutes(this)} min"
      )

      // A3: alerta de nivel 1, disparado daqui mesmo -- o app pode estar fechado.
      sendLimitAlert(experiment = "A3", details = null)
    }
  }

  /**
   * Verificacoes feitas durante a pausa em curso, identificada pelo seu fim. So
   * vive na memoria: prova, no pause_ended, que o servico seguiu rodando enquanto
   * os alertas estavam silenciados. Se o servico for recriado no meio da pausa, a
   * conta recomeca dali.
   */
  private var countedPauseUntil = 0L
  private var checksDuringPause = 0

  /**
   * Depois do limite. Alerta de nivel 2 (A4) sempre que a pessoa estiver no app
   * monitorado -- o "se o uso continuar" do documento 01, secao 6.5 --, exceto
   * durante a pausa do A5. Ate o A4, a tela de interrupcao aparecia uma unica vez
   * por limite; agora ela volta a cada reabertura do app, porque so o "Continuar"
   * pausa (decisao do responsavel em 18/09/2026).
   */
  private fun checkAfterLimit(targets: List<String>) {
    val now = System.currentTimeMillis()
    val pausedUntil = LimitConfig.pausedUntil(this)

    // A5: durante a pausa, nenhum alerta, de nenhum nivel.
    if (pausedUntil > now) {
      if (pausedUntil != countedPauseUntil) {
        countedPauseUntil = pausedUntil
        checksDuringPause = 0
      }
      checksDuringPause++
      return
    }

    val foreground = UsageReader.currentForegroundPackage(this)
    val target = foreground?.takeIf { it in targets }

    if (pausedUntil > 0L) {
      // A5: a pausa acabou. O fim so e notado na verificacao seguinte, entao o
      // atraso vai de zero a um intervalo inteiro.
      LimitConfig.clearPause(this)
      val checks = if (countedPauseUntil == pausedUntil) checksDuringPause else 0
      EventLog.append(
        context = this,
        source = "UsageLimitService",
        experiment = "A5",
        event = "pause_ended",
        details = "atraso ${(now - pausedUntil) / 1000} s · " +
          "$checks verificacoes durante a pausa · " +
          "em primeiro plano: ${foreground ?: "desconhecido"}"
      )

      // Decisao do responsavel: primeiro a notificacao. A tela de interrupcao vem
      // no ciclo seguinte, se a pessoa continuar no app.
      if (target != null) {
        sendLimitAlert(experiment = "A5", details = "fim da pausa")
        return
      }
    }

    if (target == null) return
    if (InterruptionOverlay.isShowing || InterruptionActivity.isShowing) return
    if (InterruptionExits.exitedRecently(now)) return

    LimitConfig.markEscalated(this, now)
    showInterruption(target)
  }

  /** Alerta de nivel 1: a notificacao do A3. */
  private fun sendLimitAlert(experiment: String, details: String?) {
    val sent = runCatching { Notifier.sendLimitAlert(this, LimitConfig.message(this)) }

    EventLog.append(
      context = this,
      source = "UsageLimitService",
      experiment = experiment,
      event = if (sent.isSuccess) "notification_sent" else "notification_failed",
      details = sent.exceptionOrNull()?.let { "${it.javaClass.simpleName}: ${it.message}" }
        ?: details
    )
  }

  /** A4: mostra a tela de interrupcao, pela abordagem configurada. */
  private fun showInterruption(foregroundPackage: String) {
    val motivation = LimitConfig.message(this)

    if (LimitConfig.interruptionMode(this) == "activity") {
      val intent = Intent(this, InterruptionActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        putExtra(InterruptionActivity.EXTRA_MOTIVATION, motivation)
        putExtra(InterruptionActivity.EXTRA_RETURN_TO, foregroundPackage)
      }
      val started = runCatching { startActivity(intent) }
      if (started.isSuccess) {
        // I-28: pedir nao e aparecer. Um inicio de activity barrado pelo sistema
        // nao gera excecao (A4), entao o par com o `interruption_shown` da
        // propria activity e o que mostra se a tela chegou a existir.
        EventLog.append(
          context = this,
          source = "UsageLimitService",
          experiment = "A4",
          event = "interruption_requested",
          details = "abordagem: activity · app na frente: $foregroundPackage"
        )
      }
      if (started.isFailure) {
        EventLog.append(
          context = this,
          source = "UsageLimitService",
          experiment = "A4",
          event = "interruption_failed",
          details = "abordagem: activity · " +
            started.exceptionOrNull()?.let { "${it.javaClass.simpleName}: ${it.message}" }
        )
      }
      return
    }

    // A sobreposicao precisa ser adicionada na thread principal.
    Handler(mainLooper).post {
      InterruptionOverlay.show(this, motivation, interruptedPackage = foregroundPackage)
    }
  }

  private fun startForegroundWithNotification() {
    Notifier.ensureChannels(this)
    val notification = Notifier.ongoingNotification(this)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(
        Notifier.ONGOING_NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
      )
    } else {
      startForeground(Notifier.ONGOING_NOTIFICATION_ID, notification)
    }
  }
}
