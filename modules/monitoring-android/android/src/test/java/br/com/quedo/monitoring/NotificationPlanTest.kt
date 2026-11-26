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
    val milestones = json.optJSONArray("milestones")
    return NotificationPlan.Config(
      checkIn,
      (0 until weekdays.length()).map { weekdays.getInt(it) }.toSet(),
      (0 until starts.length()).map { starts.getInt(it) },
      (0 until restart.length()).map { restart.getString(it) }.toSet(),
      (0 until (milestones?.length() ?: 0)).map {
        val c = milestones!!.getJSONObject(it)
        val days = c.getJSONArray("days")
        MilestoneRules.Compulsion(
          c.getInt("id"),
          c.getString("base"),
          c.getBoolean("baseIsBreak"),
          (0 until days.length()).map { i -> days.getInt(i) }.toSet(),
          if (c.isNull("quietUntil")) null else c.getString("quietUntil"),
          if (c.isNull("celebratedOn")) null else c.getString("celebratedOn"),
        )
      },
    )
  }

  private fun label(item: NotificationPlan.Item) = when (item) {
    NotificationPlan.Item.CheckInDue -> "check_in"
    NotificationPlan.Item.Restart -> "restart"
    is NotificationPlan.Item.Preventive -> "preventive:${item.minutes}"
    NotificationPlan.Item.Milestone -> "milestone"
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
        step.optJSONObject("seenBreak")?.let {
          state.seenBreaks.add(NotificationPlan.SeenBreak(it.getInt("compulsionId"), it.getString("dayKey"), "evento-$i"))
        }

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

  /**
   * Decisão de 14/11/2026: o recomeço que esperou o desbloqueio o dia inteiro
   * expira à meia-noite e não é reenviado, nem com a configuração antiga do JS
   * (o app pode não ter sido aberto para recalcular os dias).
   */
  @Test
  fun restartWaitingAllDayExpiresAtMidnight() {
    val zone = ZoneId.of("America/Sao_Paulo")
    val config = NotificationPlan.Config(null, (0..6).toSet(), emptyList(), setOf("2026-11-13"))
    val state = NotificationPlan.State()
    NotificationPlan.enterDay(state, millis("2026-11-13T00:01", zone), zone)
    state.nativeRestartDays.add("2026-11-13")

    // Celular bloqueado às 9h: o recomeço é devido, mas espera o desbloqueio sem marcar envio.
    val morning = millis("2026-11-13T09:30", zone)
    assertEquals(listOf("restart"), NotificationPlan.due(config, state, morning, zone).map(::label))
    state.restartWaiting = true
    val lateNight = millis("2026-11-13T23:59", zone)
    assertEquals(listOf("restart"), NotificationPlan.due(config, state, lateNight, zone).map(::label))

    assertTrue(NotificationPlan.enterDay(state, millis("2026-11-14T00:01", zone), zone))
    assertFalse(state.restartWaiting)
    assertTrue(state.nativeRestartDays.isEmpty())
    val nextMorning = millis("2026-11-14T09:30", zone)
    assertTrue(NotificationPlan.due(config, state, nextMorning, zone).isEmpty())
    assertEquals(
      "2026-11-15T00:00",
      local(NotificationPlan.nextWake(config, state, nextMorning, zone), zone),
    )
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

  /** Marco: espera o desbloqueio como o recomeço e expira à meia-noite (spec 04, 5.5). */
  @Test
  fun milestoneWaitingExpiresAtMidnight() {
    val zone = ZoneId.of("America/Sao_Paulo")
    val config = NotificationPlan.Config(
      null,
      (0..6).toSet(),
      emptyList(),
      emptySet(),
      listOf(MilestoneRules.Compulsion(1, "2026-11-18", false, setOf(7), null, null)),
    )
    val state = NotificationPlan.State()
    NotificationPlan.enterDay(state, millis("2026-11-25T00:01", zone), zone)
    assertEquals(listOf("milestone"), NotificationPlan.due(config, state, millis("2026-11-25T09:30", zone), zone).map(::label))
    state.milestoneWaiting = true
    val roundTrip = NotificationPlan.State.fromJson(JSONObject(state.toJson().toString()))
    assertTrue(roundTrip.milestoneWaiting)

    assertTrue(NotificationPlan.enterDay(roundTrip, millis("2026-11-26T00:01", zone), zone))
    assertFalse(roundTrip.milestoneWaiting)
    assertTrue(NotificationPlan.due(config, roundTrip, millis("2026-11-26T09:30", zone), zone).isEmpty())
  }

  /** Um estado gravado antes da Fase 5 (sem os campos do marco) continua valendo. */
  @Test
  fun stateFromBeforePhase5StillLoads() {
    val old = JSONObject(
      """{"dayKey":"2026-11-20","checkInSent":true,"checkInAnswered":false,"restartSent":false,"restartWaiting":false,"proactiveSent":1,"preventiveSent":[],"nativeRestartDays":[],"protectionReasons":[]}""",
    )
    val state = NotificationPlan.State.fromJson(old)
    assertFalse(state.milestoneSent)
    assertTrue(state.seenBreaks.isEmpty())
    state.seenBreaks.add(NotificationPlan.SeenBreak(2, "2026-11-20", "abc"))
    assertEquals(
      listOf(NotificationPlan.SeenBreak(2, "2026-11-20", "abc")),
      NotificationPlan.State.fromJson(JSONObject(state.toJson().toString())).seenBreaks,
    )
  }

  /** A configuração do JS só liga o marco com os textos dele (configuração da Fase 5). */
  @Test
  fun milestonesComeFromTheConfigOnlyWithTheirTexts() {
    fun json(withTexts: Boolean): JSONObject {
      val notifications = if (withTexts) """{ "milestone": { "title": "t", "text": "x" } }""" else "{}"
      return JSONObject(
      """
      {
        "compulsions": [
          { "id": 1, "type": "short_videos", "streakBaseDayKey": "2026-11-18", "checkInAnsweredDayKey": null,
            "streakBaseIsBreak": true, "milestoneDays": [1, 7], "milestoneQuietUntilDayKey": null,
            "milestoneCelebratedOnDayKey": "2026-11-20" },
          { "id": 2, "type": "pornography", "streakBaseDayKey": "2026-11-10", "checkInAnsweredDayKey": null }
        ],
        "checkInCompulsionId": null, "checkInMinutes": null, "restartDayKeys": [],
        "preventive": { "weekdays": [0], "startMinutes": [], "emotions": [] },
        "texts": { "notifications": $notifications }
      }
      """.trimIndent(),
      )
    }
    assertEquals(
      listOf(MilestoneRules.Compulsion(1, "2026-11-18", true, setOf(1, 7), null, "2026-11-20")),
      NotificationPlan.configFrom(json(true)).milestones,
    )
    assertTrue(NotificationPlan.configFrom(json(false)).milestones.isEmpty())
  }
}
