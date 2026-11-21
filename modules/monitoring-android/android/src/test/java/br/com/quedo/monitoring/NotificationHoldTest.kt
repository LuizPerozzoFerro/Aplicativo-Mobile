package br.com.quedo.monitoring

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationHoldTest {
  @Test
  fun `bloqueado publica a neutra`() {
    assertTrue(NotificationHold.shouldHold(locked = true, revealing = false))
  }

  @Test
  fun `desbloqueado publica a completa`() {
    assertFalse(NotificationHold.shouldHold(locked = false, revealing = false))
  }

  @Test
  fun `a troca pela completa nunca volta a ser neutra`() {
    assertFalse(NotificationHold.shouldHold(locked = true, revealing = true))
  }

  @Test
  fun `bloqueado nada é trocado`() {
    val decision = NotificationHold.decide(setOf(1010, 1011), locked = true, active = setOf(1010, 1011))
    assertEquals(emptyList<Int>(), decision.reveal)
    assertEquals(emptyList<Int>(), decision.forget)
  }

  @Test
  fun `desbloqueado troca as que ainda estão na barra`() {
    val decision = NotificationHold.decide(setOf(1011, 1010), locked = false, active = setOf(1001, 1010, 1011))
    assertEquals(listOf(1010, 1011), decision.reveal)
    assertEquals(emptyList<Int>(), decision.forget)
  }

  @Test
  fun `a que saiu da barra é esquecida e não volta`() {
    val locked = NotificationHold.decide(setOf(1010, 1011), locked = true, active = setOf(1011))
    assertEquals(listOf(1010), locked.forget)
    val unlocked = NotificationHold.decide(setOf(1010, 1011), locked = false, active = setOf(1011))
    assertEquals(listOf(1011), unlocked.reveal)
    assertEquals(listOf(1010), unlocked.forget)
  }

  @Test
  fun `o modo de refazer sobrevive ao disco`() {
    val specs = listOf(
      NotificationHold.Spec("preventive", 1_000L, body = "Texto", compulsionId = null),
      NotificationHold.Spec("checkIn", 2_000L, compulsionId = 3),
      NotificationHold.Spec("riskApp", 3_000L, target = "app.example"),
      NotificationHold.Spec("restart", 4_000L),
    )
    for (spec in specs) {
      assertEquals(spec, NotificationHold.Spec.fromJson(JSONObject(spec.toJson().toString())))
    }
  }
}
