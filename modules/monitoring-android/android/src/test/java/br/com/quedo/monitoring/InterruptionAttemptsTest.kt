package br.com.quedo.monitoring

import br.com.quedo.monitoring.InterruptionAttempts.Mode
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class InterruptionAttemptsTest {
  private val minute = 60_000L

  @Test
  fun startsWithTheOverlayAndNoWait() {
    val attempts = InterruptionAttempts()
    assertEquals(Mode.OVERLAY, attempts.mode)
    assertTrue(attempts.canAttempt(0L))
  }

  @Test
  fun hiddenOverlayTriesTheActivityOnceBeforeBackingOff() {
    val attempts = InterruptionAttempts()
    attempts.overlayHidden(0L)
    assertEquals(Mode.ACTIVITY, attempts.mode)
    assertTrue("sem espera antes da tela própria", attempts.canAttempt(0L))

    attempts.activityFailed(10L)
    assertEquals(Mode.OVERLAY, attempts.mode)
    assertFalse(attempts.canAttempt(10L))
    assertTrue(attempts.canAttempt(10L + minute))
  }

  @Test
  fun backoffGrowsAndStopsAtFifteenMinutes() {
    val attempts = InterruptionAttempts()
    attempts.overlayHidden(0L)
    attempts.activityFailed(0L)
    var now = minute
    for (expected in listOf(2L, 5L, 15L, 15L)) {
      assertTrue(attempts.canAttempt(now))
      attempts.overlayHidden(now)
      assertEquals("sem nova tentativa da tela própria", Mode.OVERLAY, attempts.mode)
      assertFalse(attempts.canAttempt(now + expected * minute - 1))
      assertTrue(attempts.canAttempt(now + expected * minute))
      now += expected * minute
    }
  }

  @Test
  fun resetStartsOverIncludingTheActivityTry() {
    val attempts = InterruptionAttempts()
    attempts.overlayHidden(0L)
    attempts.activityFailed(0L)
    attempts.reset()
    assertTrue(attempts.canAttempt(0L))
    attempts.overlayHidden(0L)
    assertEquals(Mode.ACTIVITY, attempts.mode)
  }
}
