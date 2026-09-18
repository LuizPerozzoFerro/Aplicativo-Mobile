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
    if (LimitConfig.firedAt(this) > 0L) return // ja alertou; A5 vai tratar a pausa

    val targets = LimitConfig.packages(this)
    if (targets.isEmpty()) return

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
      val message = LimitConfig.message(this)
      val sent = runCatching { Notifier.sendLimitAlert(this, message) }

      EventLog.append(
        context = this,
        source = "UsageLimitService",
        experiment = "A3",
        event = if (sent.isSuccess) "notification_sent" else "notification_failed",
        details = sent.exceptionOrNull()?.let { "${it.javaClass.simpleName}: ${it.message}" }
      )
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
