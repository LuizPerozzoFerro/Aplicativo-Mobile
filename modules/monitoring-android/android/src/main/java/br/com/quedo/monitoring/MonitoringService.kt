package br.com.quedo.monitoring

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder

/**
 * Serviço em primeiro plano do monitoramento (spec 03, seção 5.1), do tipo
 * `specialUse`: nenhum tipo catalogado descreve "observar o uso de outros
 * apps", e o `dataSync` tem teto de 6 horas por dia desde o Android 15 (A2 do
 * protótipo). A justificativa em inglês está no manifesto do módulo.
 *
 * Nesta etapa (passo 1) ele só existe, verifica e conta as verificações. As
 * regras do momento entram no passo 3.
 *
 * O processo pode morrer a qualquer momento e o sistema recria o serviço
 * (`START_STICKY`, I-31): tudo o que importa vai para `MonitoringState`.
 */
class MonitoringService : Service() {

  /** De onde veio o início, para o evento `service_started` (`ServiceStartOrigin` no JS). */
  enum class Origin(val value: String) { APP("app"), BOOT("boot"), UPDATE("update") }

  companion object {
    /**
     * Intervalo entre verificações. O do protótipo, que custou 0,16% do
     * consumo do aparelho num dia de uso leve (T6).
     */
    const val CHECK_INTERVAL_MS = 20_000L

    /** Se o serviço está vivo neste processo. */
    @Volatile
    var isRunning = false
      private set

    private const val EXTRA_ORIGIN = "br.com.quedo.monitoring.ORIGIN"

    /** Pelo app (com uma tela visível) ou pelo boot, que o Android também permite. */
    fun start(context: Context, origin: Origin) {
      context.startForegroundService(
        Intent(context, MonitoringService::class.java).putExtra(EXTRA_ORIGIN, origin.value)
      )
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, MonitoringService::class.java))
    }
  }

  private var thread: HandlerThread? = null
  private var handler: Handler? = null

  private val check = object : Runnable {
    override fun run() {
      // Uma verificação que falha não pode parar as próximas.
      runCatching { checkOnce() }
      handler?.postDelayed(this, CHECK_INTERVAL_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    // Precisa vir logo: o Android dá poucos segundos entre o
    // startForegroundService e o startForeground.
    Notifier.ensureChannels(this)
    startForeground(
      Notifier.ONGOING_NOTIFICATION_ID,
      Notifier.ongoingNotification(this),
      ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
    )

    // Recriado pelo sistema depois de o monitoramento ter sido desligado: sai.
    if (!MonitoringState.isActive(this)) {
      stopSelf()
      return
    }

    isRunning = true
    MonitoringState.recordServiceStart(this, System.currentTimeMillis())

    // A leitura percorre os eventos de uso: fora da thread principal, para não
    // arriscar um ANR.
    val worker = HandlerThread("quedo-monitoring").apply { start() }
    thread = worker
    handler = Handler(worker.looper).also { it.post(check) }
  }

  /** Se o `service_started` desta criação já foi gravado. */
  private var startRecorded = false

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (isRunning && !startRecorded) {
      startRecorded = true
      // Sem intent: o sistema recriou o serviço depois de matar o processo
      // (START_STICKY, I-31).
      val origin = intent?.getStringExtra(EXTRA_ORIGIN) ?: "restart"
      EventStore.append(this, "service_started", mapOf("origin" to origin))
    }
    return START_STICKY
  }

  override fun onDestroy() {
    handler?.removeCallbacks(check)
    thread?.quitSafely()
    thread = null
    handler = null
    isRunning = false
    super.onDestroy()
  }

  private fun checkOnce() {
    MonitoringState.recordCheck(this, System.currentTimeMillis())
  }
}
