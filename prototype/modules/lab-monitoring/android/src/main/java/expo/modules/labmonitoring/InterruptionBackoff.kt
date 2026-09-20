package expo.modules.labmonitoring

import android.content.Context
import android.os.SystemClock

/**
 * A4 / impacto I-28: recuo progressivo depois de uma interrupcao suprimida.
 *
 * Quando o app da frente esconde a nossa sobreposicao (I-25), insistir a cada
 * ciclo de 20 s nao adianta nada: a janela vai ser escondida de novo, e o log
 * enche de pares suprimida/descartada. A regra, decidida pelo responsavel em
 * 20/09/2026, e esperar cada vez mais depois de cada falha -- **1, 2, 5 e 15
 * minutos**, com 15 de teto -- e voltar a tentar na hora se a pessoa sair do
 * app monitorado e entrar de novo acima do limite.
 *
 * O estado vive so na memoria do servico. Se o sistema recriar o servico, a
 * contagem volta do zero, o que e aceitavel: recriacao ja e um evento raro, e
 * errar para o lado de tentar de novo e melhor do que ficar calado.
 */
object InterruptionBackoff {

  /** Espera depois da 1a, 2a, 3a falha; da 4a em diante, o ultimo valor. */
  private val DELAYS_MS = longArrayOf(60_000L, 120_000L, 300_000L, 900_000L)

  @Volatile private var failures = 0
  @Volatile private var nextAttemptAt = 0L

  /** Quantas supressoes seguidas ate agora. Para o log do servico. */
  val streak: Int get() = failures

  /** Se ainda estamos esperando para tentar de novo. */
  fun isWaiting(): Boolean = SystemClock.elapsedRealtime() < nextAttemptAt

  /** Quanto falta, em segundos, para a proxima tentativa. */
  fun waitingSeconds(): Long =
    ((nextAttemptAt - SystemClock.elapsedRealtime()) / 1000L).coerceAtLeast(0L)

  /**
   * Registra que a interrupcao nao chegou a tela e agenda a proxima tentativa.
   * Chamado quando a janela suprimida vence o prazo e e descartada.
   */
  fun markSuppressed(context: Context) {
    failures++
    val delay = DELAYS_MS[(failures - 1).coerceAtMost(DELAYS_MS.lastIndex)]
    nextAttemptAt = SystemClock.elapsedRealtime() + delay

    EventLog.append(
      context = context,
      source = "InterruptionBackoff",
      experiment = "A4",
      event = "interruption_backoff",
      details = "supressao $failures · proxima tentativa em ${delay / 60_000} min"
    )
  }

  /** A interrupcao apareceu: a contagem zera. */
  fun markShown() {
    failures = 0
    nextAttemptAt = 0L
  }

  /**
   * A pessoa saiu do app monitorado. Zera a contagem para que a proxima entrada
   * acima do limite seja interrompida na hora.
   */
  fun reset(context: Context, reason: String) {
    if (failures == 0 && nextAttemptAt == 0L) return
    val had = failures
    failures = 0
    nextAttemptAt = 0L

    EventLog.append(
      context = context,
      source = "InterruptionBackoff",
      experiment = "A4",
      event = "interruption_backoff_reset",
      details = "motivo: $reason · supressoes anteriores: $had"
    )
  }
}
