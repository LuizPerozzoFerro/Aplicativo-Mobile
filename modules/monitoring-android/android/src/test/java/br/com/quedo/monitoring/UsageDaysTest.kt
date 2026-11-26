package br.com.quedo.monitoring

import br.com.quedo.monitoring.UsageTimeline.Event
import br.com.quedo.monitoring.UsageTimeline.Kind
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Histórico por dia e hora (spec 04, 4.4): sessão que atravessa a hora e a meia-noite. */
class UsageDaysTest {
  private val zone = ZoneId.of("America/Sao_Paulo")
  private val clips = "com.example.clips"
  private val other = "com.example.other"
  private val launcher = "com.example.launcher"

  private fun at(text: String) = LocalDateTime.parse(text).atZone(zone).toInstant().toEpochMilli()

  private fun hours(vararg pairs: Pair<Int, Int>): IntArray {
    val result = IntArray(24)
    for ((hour, seconds) in pairs) result[hour] = seconds
    return result
  }

  // O Android guarda desde 18/11 às 8h: os dias pedidos estão inteiros no período.
  private val dataSince = at("2026-11-18T08:00")

  private fun compute(events: List<Event>, vararg days: String, now: String = "2026-11-21T12:00") =
    UsageDays.compute(
      events,
      days.map { LocalDate.parse(it) },
      at(now),
      setOf(launcher),
      setOf(clips),
      zone,
      dataSince,
    )

  @Test
  fun splitsASessionAcrossTheHour() {
    val day = compute(
      listOf(
        Event(Kind.RESUMED, at("2026-11-19T10:50"), clips, "Main"),
        Event(Kind.PAUSED, at("2026-11-19T11:20"), clips, "Main"),
      ),
      "2026-11-19",
    ).single()
    assertTrue(day.covered)
    assertArrayEquals(hours(10 to 600, 11 to 1200), day.apps.getValue(clips))
  }

  @Test
  fun aSessionAcrossMidnightCountsOnEachDay() {
    val days = compute(
      listOf(
        Event(Kind.RESUMED, at("2026-11-19T23:40"), clips, "Main"),
        Event(Kind.PAUSED, at("2026-11-20T00:15"), clips, "Main"),
      ),
      "2026-11-19",
      "2026-11-20",
    )
    assertArrayEquals(hours(23 to 1200), days[0].apps.getValue(clips))
    assertArrayEquals(hours(0 to 900), days[1].apps.getValue(clips))
  }

  @Test
  fun screenOffClosesAndOnlyTheChosenAppsAreKept() {
    val day = compute(
      listOf(
        Event(Kind.RESUMED, at("2026-11-19T09:00"), clips, "Main"),
        Event(Kind.SCREEN_OFF, at("2026-11-19T09:05")),
        Event(Kind.RESUMED, at("2026-11-19T09:10"), other, "Main"),
        Event(Kind.PAUSED, at("2026-11-19T09:40"), other, "Main"),
        Event(Kind.RESUMED, at("2026-11-19T09:40"), launcher, "Home"),
      ),
      "2026-11-19",
    ).single()
    assertEquals(setOf(clips), day.apps.keys)
    assertArrayEquals(hours(9 to 300), day.apps.getValue(clips))
  }

  @Test
  fun todayStopsAtNow() {
    val day = compute(
      listOf(Event(Kind.RESUMED, at("2026-11-21T11:30"), clips, "Main")),
      "2026-11-21",
      now = "2026-11-21T11:45",
    ).single()
    assertArrayEquals(hours(11 to 900), day.apps.getValue(clips))
  }

  @Test
  fun aDayWithEventsButNoChosenAppIsCoveredWithZeroUsage() {
    val day = compute(
      listOf(
        Event(Kind.RESUMED, at("2026-11-19T09:10"), other, "Main"),
        Event(Kind.PAUSED, at("2026-11-19T09:40"), other, "Main"),
      ),
      "2026-11-19",
    ).single()
    assertTrue(day.covered)
    assertTrue(day.apps.isEmpty())
  }

  @Test
  fun aDayWithoutAnyEventInsideTheStoredPeriodIsCoveredWithZeroUsage() {
    // Celular parado o dia inteiro: dia sem uso, não dia sem dados (visto no S22 em 24/11).
    val day = compute(emptyList(), "2026-11-19").single()
    assertTrue(day.covered)
    assertTrue(day.apps.isEmpty())
  }

  @Test
  fun theOldestPartialDayOrAnUnknownPeriodIsNotCovered() {
    // O dia em que o período guardado começa (no meio dele) não conta.
    assertFalse(compute(emptyList(), "2026-11-18").single().covered)
    assertFalse(compute(emptyList(), "2026-11-17").single().covered)
    val unknown = UsageDays.compute(
      emptyList(),
      listOf(LocalDate.parse("2026-11-19")),
      at("2026-11-21T12:00"),
      emptySet(),
      setOf(clips),
      zone,
      null,
    ).single()
    assertFalse(unknown.covered)
  }
}
