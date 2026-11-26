package br.com.quedo.monitoring

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Uso por dia e hora a partir dos eventos do Android (spec 04, 4.4), para o
 * histórico. Sem nada do Android, para os testes JUnit.
 *
 * Mesma conta das regras do momento (`UsageAccumulator`): sem lançadores, a
 * tela apagada fecha tudo, borda do dia explícita. Sem desconto da tela de
 * interrupção: o JS desconta pelas telas que já estão no banco, igual para
 * todos os dias (`src/domain/usageHistory.ts`).
 */
object UsageDays {
  data class Day(
    val dayKey: String,
    /**
     * O dia tem dados, mesmo com uso zero: houve eventos nele e antes dele (o dia
     * inteiro está no que o Android guarda).
     */
    val covered: Boolean,
    /** Segundos por hora local (0 a 23), só dos apps pedidos e só com uso. */
    val apps: Map<String, IntArray>,
  )

  /**
   * @param events em ordem cronológica, de pelo menos 24 horas antes do primeiro
   *   dia (um app aberto antes da meia-noite) até `now`.
   * @param days dias a calcular, do mais antigo ao mais novo.
   * @param now o instante da leitura: o dia de hoje para nele.
   */
  fun compute(
    events: List<UsageTimeline.Event>,
    days: List<LocalDate>,
    now: Long,
    excluded: Set<String>,
    targets: Set<String>,
    zone: ZoneId,
  ): List<Day> {
    val earliest = events.minOfOrNull { it.timestamp }
    return days.map { date ->
      val start = date.atStartOfDay(zone).toInstant().toEpochMilli()
      val end = minOf(date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli(), now)
      // Com eventos antes do começo do dia, o dia inteiro está no que o Android guarda.
      // O mais antigo guardado pode começar no meio do dia: esse não conta como dia com dados.
      val covered = earliest != null && earliest < start && events.any { it.timestamp in start until end }
      val usage = UsageAccumulator(cursor = end, dayStart = start, hourZone = zone)
      usage.advance(events.filter { it.timestamp < end }, end, start, excluded)
      val apps = usage.hourly()
        .filterKeys { it in targets }
        .mapValues { (_, hours) -> IntArray(24) { (hours[it] / 1000L).toInt() } }
        .filterValues { hours -> hours.any { it > 0 } }
      Day(date.toString(), covered, apps)
    }
  }

  fun dayOf(instant: Long, zone: ZoneId): LocalDate = Instant.ofEpochMilli(instant).atZone(zone).toLocalDate()
}
