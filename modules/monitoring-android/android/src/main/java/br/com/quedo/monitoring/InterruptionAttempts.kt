package br.com.quedo.monitoring

/**
 * Decide como e quando tentar mostrar a tela de interrupção (spec 03, 5.3).
 * Sem nada do Android, para os testes JUnit.
 *
 * Um app pode esconder a nossa sobreposição (I-25). Quando ela é descartada
 * sem aparecer, a tela própria (Activity) é tentada **uma vez**. Se também
 * falhar, entra o recuo progressivo (1, 2, 5 e 15 minutos, I-28), que zera
 * quando a tela aparece ou quando o usuário sai dos apps monitorados.
 *
 * Só em memória, como no protótipo: depois de uma recriação do serviço,
 * tentar de novo é melhor do que ficar em silêncio.
 */
class InterruptionAttempts {
  enum class Mode { OVERLAY, ACTIVITY }

  companion object {
    private val DELAYS_MS = longArrayOf(60_000L, 120_000L, 300_000L, 900_000L)
  }

  private var failures = 0
  private var nextAttemptAt = 0L
  private var activityTried = false

  /** Como será a próxima tentativa. */
  var mode: Mode = Mode.OVERLAY
    private set

  fun canAttempt(now: Long): Boolean = now >= nextAttemptAt

  /** A sobreposição venceu o prazo sem aparecer. */
  fun overlayHidden(now: Long) {
    if (activityTried) {
      backOff(now)
    } else {
      activityTried = true
      mode = Mode.ACTIVITY
    }
  }

  /** A tela própria também não apareceu. */
  fun activityFailed(now: Long) {
    mode = Mode.OVERLAY
    backOff(now)
  }

  /** A tela apareceu, ou o usuário saiu dos apps monitorados: recomeça do zero. */
  fun reset() {
    failures = 0
    nextAttemptAt = 0L
    activityTried = false
    mode = Mode.OVERLAY
  }

  private fun backOff(now: Long) {
    nextAttemptAt = now + DELAYS_MS[failures.coerceAtMost(DELAYS_MS.lastIndex)]
    failures += 1
  }
}
