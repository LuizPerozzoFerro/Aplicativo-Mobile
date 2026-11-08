package br.com.quedo.monitoring

import br.com.quedo.monitoring.UsageTimeline.Event
import br.com.quedo.monitoring.UsageTimeline.Kind
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class UsageAccumulatorTest {
  private val minute = 60_000L
  private val dayStart = 1_000 * minute
  private val app = "com.example.alpha"
  private val launcher = "com.example.launcher"
  private val excluded = setOf(launcher)

  private fun at(minutes: Long) = dayStart + minutes * minute

  private fun fresh(cursor: Long = at(0)) = UsageAccumulator(cursor, dayStart)

  private fun UsageAccumulator.step(now: Long, vararg events: Event, day: Long = dayStart) =
    advance(events.toList(), now, day, excluded)

  /** Como se o processo morresse entre duas verificações (I-31). */
  private fun UsageAccumulator.reloaded() = UsageAccumulator.fromJson(JSONObject(toJson().toString()))

  @Test
  fun accumulatesAcrossTicksWithoutRereadingOldEvents() {
    val usage = fresh()
    usage.step(at(10), Event(Kind.RESUMED, at(0), app, "Main"))
    assertEquals(10 * minute, usage.totals()[app])
    assertEquals(app, usage.foreground())

    // Nenhum evento novo: o app segue aberto e segue contando.
    usage.step(at(15))
    assertEquals(15 * minute, usage.totals()[app])

    usage.step(at(20), Event(Kind.PAUSED, at(18), app, "Main"))
    assertEquals(18 * minute, usage.totals()[app])
    assertNull(usage.foreground())

    usage.step(at(40))
    assertEquals(18 * minute, usage.totals()[app])
  }

  @Test
  fun repeatedEventsInTheOverlapCountOnce() {
    val usage = fresh()
    val resumed = Event(Kind.RESUMED, at(12) - 8_000, app, "Main")
    val paused = Event(Kind.PAUSED, at(12) - 2_000, app, "Main")
    usage.step(at(12), resumed, paused)
    assertEquals(6_000L, usage.totals()[app])

    // A leitura seguinte repete o trecho de sobreposição (OVERLAP_MS).
    usage.step(at(12) + 5_000, resumed, paused)
    assertEquals(6_000L, usage.totals()[app])
    assertNull(usage.foreground())
  }

  @Test
  fun aLatePausedInsideTheOverlapStillClosesTheInterval() {
    val usage = fresh()
    usage.step(at(10), Event(Kind.RESUMED, at(9), app, "Main"))
    // O PAUSED aconteceu antes da leitura anterior, mas só apareceu agora.
    usage.step(at(10) + 20_000, Event(Kind.PAUSED, at(10) - 500, app, "Main"))
    assertNull(usage.foreground())
    usage.step(at(30))
    assertEquals(1 * minute, usage.totals()[app])
  }

  @Test
  fun readsFromBeforeTheCursor() {
    val usage = fresh()
    usage.step(at(10))
    assertEquals(at(10) - UsageAccumulator.OVERLAP_MS, usage.readFrom())
  }

  @Test
  fun survivesProcessDeathBetweenTicks() {
    var usage = fresh()
    usage.step(at(10), Event(Kind.RESUMED, at(0), app, "Main"))
    usage = usage.reloaded()
    assertEquals(app, usage.foreground())
    usage.step(at(20), Event(Kind.PAUSED, at(15), app, "Main"))
    usage = usage.reloaded()
    // O STOPPED par do PAUSED chega depois: continua reconhecido como par.
    usage.step(at(21), Event(Kind.RESUMED, at(20), app, "Main"), Event(Kind.STOPPED, at(20) + 100, app, "Main"))
    assertEquals(16 * minute, usage.totals()[app])
    assertEquals(app, usage.foreground())
  }

  @Test
  fun totalsResetAtTheDayBoundaryAndAnOpenAppCountsOnlyTheNewDay() {
    val usage = fresh()
    usage.step(at(1430), Event(Kind.RESUMED, at(1420), app, "Main"))
    assertEquals(10 * minute, usage.totals()[app])

    val nextDay = at(1440)
    usage.advance(emptyList(), nextDay + 5 * minute, nextDay, excluded)
    assertEquals(5 * minute, usage.totals()[app])
  }

  @Test
  fun timeInFrontOfTheInterruptionScreenDoesNotCount() {
    val usage = fresh()
    usage.step(at(10), Event(Kind.RESUMED, at(0), app, "Main"))
    usage.suspend(at(10))
    usage.step(at(15))
    assertEquals(10 * minute, usage.totals()[app])

    usage.resume(at(15))
    usage.step(at(20))
    assertEquals(15 * minute, usage.totals()[app])
  }

  @Test
  fun aSuspensionBetweenTwoTicksIsDiscounted() {
    val usage = fresh()
    usage.step(at(10), Event(Kind.RESUMED, at(0), app, "Main"))
    usage.suspend(at(12))
    usage.resume(at(13))
    usage.step(at(20))
    assertEquals(19 * minute, usage.totals()[app])
  }

  @Test
  fun anOpenSuspensionSurvivesProcessDeath() {
    var usage = fresh()
    usage.step(at(10), Event(Kind.RESUMED, at(0), app, "Main"))
    usage.suspend(at(10))
    usage = usage.reloaded()
    usage.step(at(30))
    assertEquals(10 * minute, usage.totals()[app])
  }

  @Test
  fun launchersNeverCountAndAreNeverTheForeground() {
    val usage = fresh()
    usage.step(at(10), Event(Kind.RESUMED, at(0), launcher, "Home"))
    assertNull(usage.totals()[launcher])
    assertNull(usage.foreground())
  }

  @Test
  fun screenOffClosesEverything() {
    val usage = fresh()
    usage.step(at(10), Event(Kind.RESUMED, at(0), app, "Main"), Event(Kind.SCREEN_OFF, at(3)))
    assertEquals(3 * minute, usage.totals()[app])
    assertNull(usage.foreground())
  }
}
