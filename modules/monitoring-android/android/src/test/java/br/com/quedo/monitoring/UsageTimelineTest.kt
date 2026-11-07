package br.com.quedo.monitoring

import br.com.quedo.monitoring.UsageTimeline.Event
import br.com.quedo.monitoring.UsageTimeline.Kind
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class UsageTimelineTest {
  private val minute = 60_000L
  private val dayStart = 1_000 * minute
  private val now = dayStart + 600 * minute
  private val app = "com.example.alpha"
  private val other = "com.example.beta"
  private val launcher = "com.example.launcher"

  private fun at(minutes: Long) = dayStart + minutes * minute

  private fun compute(vararg events: Event, excluded: Set<String> = setOf(launcher)) =
    UsageTimeline.compute(events.toList(), dayStart, now, excluded)

  @Test
  fun sumsIntervalsBetweenResumedAndPaused() {
    val result = compute(
      Event(Kind.RESUMED, at(10), app, "Main"),
      Event(Kind.PAUSED, at(15), app, "Main"),
      Event(Kind.STOPPED, at(15), app, "Main"),
      Event(Kind.RESUMED, at(20), app, "Main"),
      Event(Kind.PAUSED, at(22), app, "Main"),
    )
    assertEquals(7 * minute, result.totals[app])
    assertNull(result.foreground)
  }

  @Test
  fun lateStoppedOfPreviousInstanceDoesNotCloseTheNewOne() {
    // A1: o STOPPED da instância anterior chega depois do novo RESUMED.
    val result = compute(
      Event(Kind.RESUMED, at(0), app, "Main"),
      Event(Kind.PAUSED, at(5), app, "Main"),
      Event(Kind.RESUMED, at(5), app, "Main"),
      Event(Kind.STOPPED, at(6), app, "Main"),
      Event(Kind.PAUSED, at(10), app, "Main"),
    )
    assertEquals(10 * minute, result.totals[app])
  }

  @Test
  fun stoppedWithoutPausedClosesTheInterval() {
    // App morto (reinstalação): só o STOPPED chega.
    val result = compute(
      Event(Kind.RESUMED, at(0), app, "Main"),
      Event(Kind.STOPPED, at(4), app, "Main"),
    )
    assertEquals(4 * minute, result.totals[app])
  }

  @Test
  fun screenOffClosesEverything() {
    val result = compute(
      Event(Kind.RESUMED, at(0), app, "Main"),
      Event(Kind.SCREEN_OFF, at(3)),
    )
    assertEquals(3 * minute, result.totals[app])
    assertNull(result.foreground)
  }

  @Test
  fun openAppCountsUntilNowAndIsTheForeground() {
    val result = compute(
      Event(Kind.RESUMED, at(590), app, "Main"),
    )
    assertEquals(10 * minute, result.totals[app])
    assertEquals(app, result.foreground)
  }

  @Test
  fun intervalStartedBeforeMidnightCountsOnlyToday() {
    // Aberto 30 min antes da meia-noite e fechado 20 min depois.
    val result = compute(
      Event(Kind.RESUMED, dayStart - 30 * minute, app, "Main"),
      Event(Kind.PAUSED, at(20), app, "Main"),
    )
    assertEquals(20 * minute, result.totals[app])
  }

  @Test
  fun intervalEntirelyBeforeMidnightDoesNotCount() {
    val result = compute(
      Event(Kind.RESUMED, dayStart - 30 * minute, app, "Main"),
      Event(Kind.PAUSED, dayStart - 10 * minute, app, "Main"),
    )
    assertNull(result.totals[app])
  }

  @Test
  fun launchersNeverCount() {
    val result = compute(
      Event(Kind.RESUMED, at(0), launcher, "Home"),
      Event(Kind.PAUSED, at(5), launcher, "Home"),
      Event(Kind.RESUMED, at(5), app, "Main"),
      Event(Kind.PAUSED, at(6), app, "Main"),
      Event(Kind.RESUMED, at(6), launcher, "Home"),
    )
    assertNull(result.totals[launcher])
    assertEquals(1 * minute, result.totals[app])
    assertNull(result.foreground)
  }

  @Test
  fun mostRecentOpenIntervalIsTheForeground() {
    val result = compute(
      Event(Kind.RESUMED, at(100), app, "Main"),
      Event(Kind.RESUMED, at(200), other, "Main"),
    )
    assertEquals(other, result.foreground)
  }

  @Test
  fun eventsWithoutPackageAreIgnored() {
    val result = compute(
      Event(Kind.RESUMED, at(0), null, null),
      Event(Kind.RESUMED, at(1), app, "Main"),
      Event(Kind.PAUSED, at(2), app, "Main"),
    )
    assertEquals(mapOf(app to minute), result.totals)
  }
}
