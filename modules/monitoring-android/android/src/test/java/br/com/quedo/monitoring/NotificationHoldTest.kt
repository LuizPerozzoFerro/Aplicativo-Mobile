package br.com.quedo.monitoring

import br.com.quedo.monitoring.NotificationHold.Mode
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationHoldTest {
  @Test
  fun `nova com o aparelho bloqueado sai neutra`() {
    assertTrue(NotificationHold.shouldHold(locked = true, mode = Mode.NEW))
  }

  @Test
  fun `nova com o aparelho desbloqueado sai completa`() {
    assertFalse(NotificationHold.shouldHold(locked = false, mode = Mode.NEW))
  }

  @Test
  fun `a tela apagou vira neutra mesmo antes de travar`() {
    assertTrue(NotificationHold.shouldHold(locked = false, mode = Mode.HIDE))
  }

  @Test
  fun `a troca pela completa nunca volta a ser neutra`() {
    assertFalse(NotificationHold.shouldHold(locked = true, mode = Mode.REVEAL))
  }

  @Test
  fun `a versão completa nunca aparece na tela bloqueada`() {
    assertEquals(NotificationHold.LockScreen.HIDDEN, NotificationHold.lockScreen(neutral = false))
  }

  @Test
  fun `a versão neutra aparece na tela bloqueada`() {
    assertEquals(NotificationHold.LockScreen.SHOWN, NotificationHold.lockScreen(neutral = true))
  }

  @Test
  fun `bloqueado nada é trocado pela completa`() {
    val decision = NotificationHold.decide(mapOf(1010 to true, 1011 to true), locked = true, active = setOf(1010, 1011))
    assertEquals(emptyList<Int>(), decision.reveal)
    assertEquals(emptyList<Int>(), decision.forget)
  }

  @Test
  fun `desbloqueado troca só as neutras que ainda estão na barra`() {
    val posted = mapOf(1011 to true, 1010 to true, 1002 to false)
    val decision = NotificationHold.decide(posted, locked = false, active = setOf(1001, 1002, 1010, 1011))
    assertEquals(listOf(1010, 1011), decision.reveal)
    assertEquals(emptyList<Int>(), decision.forget)
  }

  @Test
  fun `a que saiu da barra é esquecida e não volta`() {
    val posted = mapOf(1010 to true, 1011 to true, 1002 to false)
    val locked = NotificationHold.decide(posted, locked = true, active = setOf(1011))
    assertEquals(listOf(1002, 1010), locked.forget)
    val unlocked = NotificationHold.decide(posted, locked = false, active = setOf(1011))
    assertEquals(listOf(1011), unlocked.reveal)
    assertEquals(listOf(1002, 1010), unlocked.forget)
  }

  @Test
  fun `a tela apagou esconde só as completas que estão na barra`() {
    val posted = mapOf(1002 to false, 1010 to true, 1012 to false)
    assertEquals(listOf(1002), NotificationHold.toHide(posted, active = setOf(1001, 1002, 1010)))
  }

  @Test
  fun `o modo de refazer sobrevive ao disco`() {
    val specs = listOf(
      NotificationHold.Spec("preventive", 1_000L, body = "Texto"),
      NotificationHold.Spec("checkIn", 2_000L, compulsionId = 3),
      NotificationHold.Spec("riskApp", 3_000L, target = "app.example"),
      NotificationHold.Spec("restart", 4_000L),
    )
    for (spec in specs) {
      assertEquals(spec, NotificationHold.Spec.fromJson(JSONObject(spec.toJson().toString())))
    }
  }
}
