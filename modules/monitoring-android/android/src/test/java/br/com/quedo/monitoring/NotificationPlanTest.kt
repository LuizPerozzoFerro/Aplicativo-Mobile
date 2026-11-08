package br.com.quedo.monitoring

import java.io.File
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationPlanTest {
  private val dir = File(requireNotNull(System.getProperty("quedo.vectors")))

  private fun millis(text: String, zone: ZoneId) =
    LocalDateTime.parse(text).atZone(zone).toInstant().toEpochMilli()

  private fun local(epoch: Long, zone: ZoneId) =
    LocalDateTime.ofInstant(Instant.ofEpochMilli(epoch), zone).toString()

  private fun config(json: JSONObject): NotificationPlan.Config {
    val checkIn = if (json.isNull("checkIn")) {
      null
    } else {
      val item = json.getJSONObject("checkIn")
      NotificationPlan.CheckIn(
        item.getInt("compulsionId"),
        item.getInt("minutes"),
        if (item.isNull("answeredDayKey")) null else item.getString("answeredDayKey"),
      )
    }
    val weekdays = json.getJSONArray("weekdays")
    val starts = json.getJSONArray("startMinutes")
    val restart = json.getJSONArray("restartDayKeys")
    return NotificationPlan.Config(
      checkIn,
      (0 until weekdays.length()).map { weekdays.getInt(it) }.toSet(),
      (0 until starts.length()).map { starts.getInt(it) },
      (0 until restart.length()).map { restart.getString(it) }.toSet(),
    )
  }

  private fun label(item: NotificationPlan.Item) = when (item) {
    NotificationPlan.Item.CheckInDue -> "check_in"
    NotificationPlan.Item.Restart -> "restart"
    is NotificationPlan.Item.Preventive -> "preventive:${item.minutes}"
  }

  @Test
  fun scheduleVectors() {
    val vectors = JSONObject(File(dir, "notification-schedule.json").readText(Charsets.UTF_8))
    val zone = ZoneId.of(vectors.getString("zone"))
    val scenarios = vectors.getJSONArray("scenarios")
    assertTrue(scenarios.length() > 10)

    for (s in 0 until scenarios.length()) {
      val scenario = scenarios.getJSONObject(s)
      val plan = config(scenario.getJSONObject("config"))
      var state = NotificationPlan.State()
      val steps = scenario.getJSONArray("steps")

      for (i in 0 until steps.length()) {
        val step = steps.getJSONObject(i)
        val where = "${scenario.getString("name")}, passo $i"
        val now = millis(step.getString("at"), zone)
        NotificationPlan.enterDay(state, now, zone)
        step.optString("nativeRestartDay").takeIf { it.isNotEmpty() }?.let { state.nativeRestartDays.add(it) }

        val due = NotificationPlan.due(plan, state, now, zone)
        val expected = step.getJSONArray("due")
        val wanted = (0 until expected.length()).map {
          val item = expected.getJSONObject(it)
          if (item.getString("type") == "preventive") "preventive:${item.getInt("minutes")}" else item.getString("type")
        }
        assertEquals(where, wanted, due.map { label(it) })

        // Por padrão, tudo o que estava vencido sai antes do próximo cálculo.
        due.forEach { NotificationPlan.markSent(state, it) }
        assertEquals(where, step.getString("next"), local(NotificationPlan.nextWake(plan, state, now, zone), zone))

        // O processo pode morrer entre dois passos (I-31).
        state = NotificationPlan.State.fromJson(JSONObject(state.toJson().toString()))
      }
    }
  }

  @Test
  fun hadStreakOnlyFromTheDayBefore() {
    assertTrue(NotificationPlan.hadStreak("2026-11-07", "2026-11-08"))
    assertFalse(NotificationPlan.hadStreak("2026-11-08", "2026-11-08"))
    assertEquals("2026-11-09", NotificationPlan.nextDay("2026-11-08"))
  }

  @Test
  fun dayChangeKeepsOnlyFutureNativeRestartDays() {
    val zone = ZoneId.of("America/Sao_Paulo")
    val state = NotificationPlan.State()
    NotificationPlan.enterDay(state, millis("2026-11-08T10:00", zone), zone)
    state.nativeRestartDays.addAll(listOf("2026-11-08", "2026-11-09"))
    state.protectionReasons.add("usageAccess")
    NotificationPlan.markSent(state, NotificationPlan.Item.CheckInDue)

    assertTrue(NotificationPlan.enterDay(state, millis("2026-11-09T00:01", zone), zone))
    assertEquals(setOf("2026-11-09"), state.nativeRestartDays)
    assertFalse(state.checkInSent)
    assertEquals(0, state.proactiveSent)
    assertTrue(state.protectionReasons.isEmpty())
  }

  @Test
  fun configComesFromWhatTheJsSends() {
    val json = JSONObject(
      """
      {
        "compulsions": [{ "id": 2, "type": "pornography", "streakBaseDayKey": "2026-11-01", "checkInAnsweredDayKey": "2026-11-08" }],
        "checkInCompulsionId": 2,
        "checkInMinutes": 1290,
        "preventive": { "weekdays": [0, 6], "startMinutes": [720], "emotions": [] },
        "restartDayKeys": ["2026-11-09"]
      }
      """.trimIndent(),
    )
    assertEquals(
      NotificationPlan.Config(
        NotificationPlan.CheckIn(2, 1290, "2026-11-08"),
        setOf(0, 6),
        listOf(720),
        setOf("2026-11-09"),
      ),
      NotificationPlan.configFrom(json),
    )
  }
}
