package br.com.quedo.monitoring

import java.time.LocalDateTime
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Test

class DayBoundaryTest {
  private val saoPaulo = ZoneId.of("America/Sao_Paulo")

  private fun at(text: String): Long =
    LocalDateTime.parse(text).atZone(saoPaulo).toInstant().toEpochMilli()

  @Test
  fun startOfDayIsLocalMidnight() {
    assertEquals(at("2026-11-07T00:00"), DayBoundary.startOfDay(at("2026-11-07T15:42"), saoPaulo))
    assertEquals(at("2026-11-07T00:00"), DayBoundary.startOfDay(at("2026-11-07T00:00"), saoPaulo))
    assertEquals(at("2026-11-08T00:00"), DayBoundary.startOfNextDay(at("2026-11-07T23:59:59"), saoPaulo))
  }

  @Test
  fun dayStartsAtOneWhenMidnightDoesNotExist() {
    // 04/11/2018: o horário de verão começou à meia-noite, e o relógio pulou
    // de 23:59:59 para 01:00. O dia começou à 01:00 (-02:00).
    val expected = java.time.OffsetDateTime.parse("2018-11-04T01:00-02:00").toInstant().toEpochMilli()
    val noon = java.time.OffsetDateTime.parse("2018-11-04T12:00-02:00").toInstant().toEpochMilli()
    assertEquals(expected, DayBoundary.startOfDay(noon, saoPaulo))

    val evening = java.time.OffsetDateTime.parse("2018-11-03T22:00-03:00").toInstant().toEpochMilli()
    assertEquals(expected, DayBoundary.startOfNextDay(evening, saoPaulo))
    // Esse dia teve 23 horas.
    val nextDay = DayBoundary.startOfNextDay(noon, saoPaulo)
    assertEquals(23 * 3_600_000L, nextDay - expected)
  }

  @Test
  fun dayWithTwentyFiveHoursWhenSummerTimeEnds() {
    // 17/02/2019: à meia-noite o relógio voltou para 23:00 do dia 16.
    val noon = java.time.OffsetDateTime.parse("2019-02-16T12:00-02:00").toInstant().toEpochMilli()
    val start = DayBoundary.startOfDay(noon, saoPaulo)
    val end = DayBoundary.startOfNextDay(noon, saoPaulo)
    assertEquals(25 * 3_600_000L, end - start)
  }
}
