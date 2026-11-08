package br.com.quedo.monitoring

/**
 * Tipos dos eventos de uso e a leitura de uma vez só (o `getUsageToday`). A
 * conta é a do `UsageAccumulator`, que o serviço usa aos poucos. Sem nada do
 * Android, para os testes JUnit.
 *
 * Por que eventos e não `queryAndAggregateUsageStats`: no S22, os totais
 * agregados chegam com minutos de atraso (A1).
 */
object UsageTimeline {

  enum class Kind { RESUMED, PAUSED, STOPPED, SCREEN_OFF }

  data class Event(
    val kind: Kind,
    val timestamp: Long,
    val packageName: String? = null,
    val className: String? = null,
  )

  data class Result(
    /** Milissegundos em primeiro plano entre `dayStart` e `now`, por pacote. */
    val totals: Map<String, Long>,
    /** Pacote que está na tela agora, ou nulo. Lançadores também ficam fora. */
    val foreground: String?,
  )

  /**
   * @param events em ordem cronológica, como o `queryEvents` devolve.
   * @param excluded pacotes que nunca contam (os lançadores).
   */
  fun compute(events: Iterable<Event>, dayStart: Long, now: Long, excluded: Set<String>): Result {
    val usage = UsageAccumulator(cursor = now, dayStart = dayStart)
    usage.advance(events, now, dayStart, excluded)
    return Result(usage.totals(), usage.foreground())
  }
}
