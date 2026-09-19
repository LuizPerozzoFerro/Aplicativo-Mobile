package expo.modules.labmonitoring

import android.content.Context
import android.os.Handler
import android.os.HandlerThread
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * A7: estima o tempo de rede social no NAVEGADOR, a pergunta Q4 da spec.
 *
 * O DNS so diz que um nome foi consultado, nao quanto tempo a pagina ficou aberta.
 * A estimativa junta dois sinais:
 * - consultas a dominios de rede social que chegam com um navegador na tela (VPN);
 * - o navegador continuar na tela (leitura do A1).
 *
 * Uma sessao comeca na primeira consulta com o navegador na frente. Termina quando
 * o navegador sai da tela, ou quando as consultas param por [GAP_MS]; nesse caso
 * o fim e a ultima consulta. O instante de cada consulta vai para o log, para a
 * estimativa poder ser recalculada com outros intervalos sem repetir o teste.
 *
 * Tudo roda numa thread propria; a VPN so avisa as consultas.
 */
class BrowserSessionTracker(
  private val context: Context,
  private val browsers: () -> Set<String>,
  private val foreground: () -> String?
) {

  companion object {
    /** Sem consulta por este tempo, com o navegador ainda na tela, a sessao acaba. */
    const val GAP_MS = 90_000L

    /** De quanto em quanto tempo confere se o navegador continua na tela. */
    private const val TICK_MS = 5_000L

    private const val MAX_OFFSETS = 300
  }

  private class Session(val browser: String, val domain: String, val startedAt: Long) {
    var lastQueryAt = startedAt
    var largestGap = 0L
    val offsets = mutableListOf<Long>()
  }

  private val thread = HandlerThread("lab-social-sessions").apply { start() }
  private val handler = Handler(thread.looper)

  /** So e lida e escrita na thread do handler. */
  private var session: Session? = null

  private val tick = object : Runnable {
    override fun run() {
      check(System.currentTimeMillis())
      if (session != null) handler.postDelayed(this, TICK_MS)
    }
  }

  /** Chamado pela VPN a cada consulta a dominio de rede social, de qualquer app. */
  fun onQuery(domain: String, at: Long, foregroundPackage: String?) {
    handler.post { handleQuery(domain, at, foregroundPackage) }
  }

  /** Encerra a sessao aberta, se houver, e a thread. */
  fun stop() {
    handler.post {
      session?.let { end(it, endAt = System.currentTimeMillis(), reason = "vpn desligada") }
    }
    thread.quitSafely()
  }

  private fun handleQuery(domain: String, at: Long, foregroundPackage: String?) {
    // Consulta com outro app na frente (inclusive o app do Instagram) nao conta.
    val browser = foregroundPackage?.takeIf { it in browsers() } ?: return

    session?.let { current ->
      if (current.browser != browser) {
        end(current, endAt = at, reason = "outro navegador na tela")
      } else if (at - current.lastQueryAt > GAP_MS) {
        end(current, endAt = current.lastQueryAt, reason = "sem consultas por ${GAP_MS / 1000} s")
      }
    }

    val current = session ?: Session(browser, domain, at).also {
      session = it
      log("social_session_started", "navegador: $browser · dominio: $domain · inicio: ${clock(at)}")
      handler.postDelayed(tick, TICK_MS)
    }
    if (current.offsets.size < MAX_OFFSETS) current.offsets += at - current.startedAt
    current.largestGap = maxOf(current.largestGap, at - current.lastQueryAt)
    current.lastQueryAt = maxOf(current.lastQueryAt, at)
  }

  private fun check(now: Long) {
    val current = session ?: return
    val onScreen = foreground()
    when {
      onScreen != current.browser ->
        end(current, endAt = now, reason = "navegador saiu da tela (agora: ${onScreen ?: "tela apagada ou desconhecido"})")
      now - current.lastQueryAt > GAP_MS ->
        end(current, endAt = current.lastQueryAt, reason = "sem consultas por ${GAP_MS / 1000} s")
    }
  }

  private fun end(current: Session, endAt: Long, reason: String) {
    session = null
    handler.removeCallbacks(tick)
    val seconds = (endAt - current.startedAt) / 1000
    log(
      "social_session_ended",
      "navegador: ${current.browser} · dominio: ${current.domain} · " +
        "inicio: ${clock(current.startedAt)} · fim: ${clock(endAt)} · " +
        "duracao estimada: $seconds s · motivo: $reason · " +
        "consultas: ${current.offsets.size} · maior intervalo: ${current.largestGap / 1000} s · " +
        "consultas em (s): ${current.offsets.joinToString(",") { (it / 1000).toString() }}"
    )
  }

  private fun log(event: String, details: String) {
    EventLog.append(context, "BrowserSessionTracker", "A7", event, details)
  }

  private fun clock(at: Long): String = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date(at))
}
