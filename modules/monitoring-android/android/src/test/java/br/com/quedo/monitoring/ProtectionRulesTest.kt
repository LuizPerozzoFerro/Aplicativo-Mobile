package br.com.quedo.monitoring

import br.com.quedo.monitoring.ProtectionRules.Input
import br.com.quedo.monitoring.ProtectionRules.Snapshot
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProtectionRulesTest {
  private val now = 100_000_000L
  private val all = Snapshot(usageAccess = true, notifications = true, overlay = true)

  private fun input(
    previous: Snapshot? = all,
    current: Snapshot = all,
    active: Boolean = true,
    needsOverlay: Boolean = true,
    running: Boolean = true,
    lastCheckAt: Long = now,
    startRequestedAt: Long = 0L,
  ) = Input(previous, current, active, needsOverlay, running, lastCheckAt, startRequestedAt, now)

  private fun decide(input: Input) = ProtectionRules.decide(input)

  @Test
  fun nothingChangedNothingHappens() {
    val decision = decide(input())
    assertEquals(emptyList<String>(), decision.lost)
    assertEquals(emptyList<String>(), decision.pausedReasons)
  }

  @Test
  fun firstCheckOnlyLearnsTheState() {
    val decision = decide(input(previous = null, current = all.copy(usageAccess = false)))
    assertEquals(emptyList<String>(), decision.lost)
    assertEquals(emptyList<String>(), decision.pausedReasons)
  }

  @Test
  fun losingUsageAccessRecordsAndWarns() {
    val decision = decide(input(current = all.copy(usageAccess = false), running = false))
    assertEquals(listOf("usageAccess"), decision.lost)
    assertEquals(listOf("usageAccess"), decision.pausedReasons)
  }

  @Test
  fun neverGrantedIsNotLost() {
    val denied = all.copy(overlay = false)
    val decision = decide(input(previous = denied, current = denied))
    assertEquals(emptyList<String>(), decision.lost)
    assertEquals(emptyList<String>(), decision.pausedReasons)
  }

  @Test
  fun losingOverlayWarnsOnlyIfSomeRuleUsesTheScreen() {
    val current = all.copy(overlay = false)
    assertEquals(listOf("overlay"), decide(input(current = current)).pausedReasons)
    val notNeeded = decide(input(current = current, needsOverlay = false))
    assertEquals(listOf("overlay"), notNeeded.lost)
    assertEquals(emptyList<String>(), notNeeded.pausedReasons)
  }

  @Test
  fun losingNotificationsRecordsButCannotNotify() {
    val decision = decide(input(current = all.copy(notifications = false)))
    assertEquals(listOf("notifications"), decision.lost)
    assertEquals(emptyList<String>(), decision.pausedReasons)
  }

  @Test
  fun monitoringOffRecordsButDoesNotWarn() {
    val decision = decide(input(current = all.copy(usageAccess = false), active = false, running = false))
    assertEquals(listOf("usageAccess"), decision.lost)
    assertEquals(emptyList<String>(), decision.pausedReasons)
  }

  @Test
  fun serviceSilentForTooLongIsStopped() {
    val decision = decide(input(running = false, lastCheckAt = now - ProtectionRules.STALL_MS))
    assertEquals(listOf("service_stopped"), decision.pausedReasons)
  }

  @Test
  fun recentCheckIsNotStopped() {
    val decision = decide(input(running = false, lastCheckAt = now - ProtectionRules.STALL_MS + 1))
    assertEquals(emptyList<String>(), decision.pausedReasons)
  }

  @Test
  fun recentStartRequestIsNotStopped() {
    val decision = decide(
      input(running = false, lastCheckAt = 0L, startRequestedAt = now - ProtectionRules.STALL_MS + 1),
    )
    assertEquals(emptyList<String>(), decision.pausedReasons)
  }

  @Test
  fun withoutUsageAccessTheReasonIsThePermission() {
    val denied = all.copy(usageAccess = false)
    val decision = decide(input(previous = denied, current = denied, running = false, lastCheckAt = 0L))
    assertEquals(emptyList<String>(), decision.pausedReasons)
  }

  @Test
  fun snapshotSurvivesDisk() {
    val snapshot = Snapshot(usageAccess = true, notifications = false, overlay = true)
    assertEquals(snapshot, Snapshot.fromJson(JSONObject(snapshot.toJson().toString())))
  }

  @Test
  fun overlayIsNeededByModerationOrDeclaredRiskApp() {
    assertFalse(ProtectionRules.needsOverlay(null))
    assertFalse(ProtectionRules.needsOverlay(JSONObject("""{"moderationRules":[],"riskAppRules":[]}""")))
    assertFalse(
      ProtectionRules.needsOverlay(
        JSONObject("""{"moderationRules":[],"riskAppRules":[{"interruption":false}]}"""),
      ),
    )
    assertTrue(
      ProtectionRules.needsOverlay(
        JSONObject("""{"moderationRules":[],"riskAppRules":[{"interruption":true}]}"""),
      ),
    )
    assertTrue(ProtectionRules.needsOverlay(JSONObject("""{"moderationRules":[{}],"riskAppRules":[]}""")))
  }
}
