package br.com.quedo.monitoring

import java.time.LocalDate
import java.time.temporal.ChronoUnit

/**
 * "Hoje é dia de marco?" (spec 04, 4.3 e 5.5), com o app fechado. As mesmas
 * regras de `src/domain/milestoneNotification.ts`, contra os mesmos vetores
 * (`src/domain/vectors/milestone-day.json`) no JUnit e no Jest. Sem nada do
 * Android.
 */
object MilestoneRules {
  data class Compulsion(
    val id: Int,
    /** Base da streak segundo o JS (AAAA-MM-DD). */
    val streakBaseDayKey: String,
    /** A base do JS é um dia de quebra (recomeço). */
    val streakBaseIsBreak: Boolean,
    val milestoneDays: Set<Int>,
    /** Até este dia (inclusive), quieto: início com "há N dias". */
    val quietUntilDayKey: String?,
    /** Último dia com um alcance já celebrado no app. */
    val celebratedOnDayKey: String?,
  )

  /** Quebra vista pelo nativo (dia reprovado, recaída na notificação) e ainda não importada. */
  data class NativeBreak(val compulsionId: Int, val dayKey: String)

  data class Result(val restartDay: Boolean, val compulsionIds: List<Int>, val due: Boolean)

  private fun parse(dayKey: String): LocalDate? = runCatching { LocalDate.parse(dayKey) }.getOrNull()

  /** A base que vale: a mais recente entre a do JS e a última quebra que o nativo viu. */
  fun effectiveBase(compulsion: Compulsion, nativeBreaks: Collection<NativeBreak>): Pair<String, Boolean> {
    val seen = nativeBreaks
      .filter { it.compulsionId == compulsion.id && parse(it.dayKey) != null }
      .maxOfOrNull { it.dayKey }
    // Chaves AAAA-MM-DD comparam como datas.
    return if (seen != null && seen >= compulsion.streakBaseDayKey) {
      seen to true
    } else {
      compulsion.streakBaseDayKey to compulsion.streakBaseIsBreak
    }
  }

  fun today(today: String, compulsions: List<Compulsion>, nativeBreaks: Collection<NativeBreak>): Result {
    val day = parse(today) ?: return Result(false, emptyList(), false)
    val yesterday = day.minusDays(1).toString()
    var restartDay = false
    val ids = ArrayList<Int>()
    for (compulsion in compulsions) {
      val (baseKey, isBreak) = effectiveBase(compulsion, nativeBreaks)
      val base = parse(baseKey) ?: continue
      // O dia seguinte a uma quebra é o dia do recomeço, para o aparelho inteiro.
      if (isBreak && baseKey == yesterday) restartDay = true

      val streak = ChronoUnit.DAYS.between(base, day)
      if (streak < 1 || streak.toInt() !in compulsion.milestoneDays) continue
      if (compulsion.quietUntilDayKey != null && today <= compulsion.quietUntilDayKey) continue
      if (compulsion.celebratedOnDayKey == today) continue
      ids.add(compulsion.id)
    }
    return Result(restartDay, ids, !restartDay && ids.isNotEmpty())
  }
}
