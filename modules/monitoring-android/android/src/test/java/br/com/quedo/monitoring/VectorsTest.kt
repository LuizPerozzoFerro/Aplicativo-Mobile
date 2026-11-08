package br.com.quedo.monitoring

import java.io.File
import java.time.Instant
import java.time.ZoneId
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Os mesmos vetores do Jest (`src/domain/vectors.test.ts`), contra o Kotlin
 * que roda no aparelho (spec 03, 4.1).
 */
class VectorsTest {
  private val dir = File(requireNotNull(System.getProperty("quedo.vectors")))

  private fun load(name: String) = JSONObject(File(dir, name).readText(Charsets.UTF_8))

  private fun toMillis(iso: String) = Instant.parse(iso).toEpochMilli()

  @Test
  fun dayBoundary() {
    val vectors = load("day-boundary.json")
    val zone = ZoneId.of(vectors.getString("zone"))
    val cases = vectors.getJSONArray("cases")
    assertTrue(cases.length() > 0)
    for (index in 0 until cases.length()) {
      val item = cases.getJSONObject(index)
      val name = item.getString("name")
      val instant = toMillis(item.getString("instant"))
      assertEquals(name, item.getString("dayKey"), DayBoundary.dayKey(instant, zone))
      assertEquals(name, toMillis(item.getString("startOfDay")), DayBoundary.startOfDay(instant, zone))
      assertEquals(name, toMillis(item.getString("startOfNextDay")), DayBoundary.startOfNextDay(instant, zone))
    }
  }

  private val minute = 60_000L
  private val epoch = 1_794_000_000_000L

  private fun config(json: JSONObject): MomentRules.Config {
    val moderation = json.getJSONArray("moderation")
    val risk = json.getJSONArray("risk")
    return MomentRules.Config(
      moderation = (0 until moderation.length()).map {
        val rule = moderation.getJSONObject(it)
        val targets = rule.getJSONArray("targets")
        val today = rule.optJSONObject("todayLimit")
        MomentRules.ModerationRule(
          rule.getInt("compulsionId"),
          (0 until targets.length()).map { i -> targets.getString(i) },
          rule.getLong("limitMinutes") * minute,
          today?.getString("day"),
          today?.let { it.getLong("minutes") * minute },
        )
      },
      risk = (0 until risk.length()).map {
        val rule = risk.getJSONObject(it)
        MomentRules.RiskRule(
          rule.getInt("compulsionId"),
          rule.getString("target"),
          rule.getLong("limitMinutes") * minute,
          rule.getBoolean("interruption"),
        )
      },
    )
  }

  private fun toJson(action: MomentRules.Action): JSONObject = when (action) {
    is MomentRules.Action.LimitReached -> JSONObject()
      .put("type", "limit_reached")
      .put("compulsionId", action.compulsionId)
      .put("target", action.target ?: JSONObject.NULL)

    is MomentRules.Action.ShowInterruption -> JSONObject()
      .put("type", "show_interruption")
      .put("compulsionId", action.compulsionId)
      .put("target", action.target)
      .put("canIgnore", action.canIgnore)
      .put("warnsEndOfDay", action.warnsEndOfDay)

    is MomentRules.Action.DayFailed -> JSONObject()
      .put("type", "day_failed")
      .put("compulsionId", action.compulsionId)
      .put("reason", action.reason)
  }

  private fun assertActions(where: String, expected: JSONArray?, actual: List<MomentRules.Action>) {
    val want = expected ?: JSONArray()
    assertEquals(where, want.length(), actual.size)
    for (index in actual.indices) {
      assertEquals(where, canonical(want.getJSONObject(index)), canonical(toJson(actual[index])))
    }
  }

  private fun canonical(json: JSONObject): String =
    json.keys().asSequence().sorted().joinToString { "$it=${json.get(it)}" }

  @Test
  fun momentRules() {
    val scenarios = load("moment-rules.json").getJSONArray("scenarios")
    assertTrue(scenarios.length() > 20)
    for (s in 0 until scenarios.length()) {
      val scenario = scenarios.getJSONObject(s)
      val name = scenario.getString("name")
      var rules = config(scenario.getJSONObject("config"))
      var state = MomentRules.State()
      val steps = scenario.getJSONArray("steps")

      for (i in 0 until steps.length()) {
        val step = steps.getJSONObject(i)
        val where = "$name, passo $i"
        var actions: List<MomentRules.Action> = emptyList()

        when {
          step.has("config") -> rules = config(step.getJSONObject("config"))

          step.has("tick") -> {
            val tick = step.getJSONObject("tick")
            val usageJson = tick.getJSONObject("usage")
            actions = MomentRules.tick(
              rules,
              state,
              MomentRules.Tick(
                now = epoch + tick.getLong("t") * 1000,
                dayKey = tick.getString("day"),
                usage = usageJson.keys().asSequence().associateWith { usageJson.getLong(it) * minute },
                foreground = if (tick.isNull("foreground")) null else tick.getString("foreground"),
                blocked = tick.getBoolean("blocked"),
              ),
            )
          }

          step.has("shown") -> {
            val shown = step.getJSONObject("shown")
            MomentRules.shown(state, shown.getInt("compulsionId"), shown.getString("day"))
          }

          step.has("respond") -> {
            val respond = step.getJSONObject("respond")
            actions = MomentRules.respond(
              rules,
              state,
              respond.getInt("compulsionId"),
              respond.getString("response"),
              epoch + respond.getLong("t") * 1000,
              respond.getString("day"),
            )
          }
        }

        assertActions(where, step.optJSONArray("expect"), actions)

        // O processo pode morrer entre dois passos (I-31): o estado precisa
        // sobreviver à ida e volta pelo JSON.
        state = MomentRules.State.fromJson(JSONObject(state.toJson().toString()))

        val expectedState = step.optJSONObject("state") ?: continue
        for (id in expectedState.keys()) {
          val counts = expectedState.getJSONObject(id)
          val moment = state.peek(id.toInt())
          assertEquals(where, counts.getInt("interruptions"), moment.interruptions)
          assertEquals(where, counts.getInt("continues"), moment.continues)
          assertEquals(where, counts.getBoolean("stopped"), moment.stopped)
        }
      }
    }
  }

  @Test
  fun configComesFromWhatTheJsSends() {
    val json = JSONObject(
      """
      {
        "moderationRules": [{ "compulsionId": 3, "targetIds": ["a", "b"], "dailyLimitMinutes": 45, "limitToday": { "dayKey": "2026-11-08", "minutes": 30 } }],
        "riskAppRules": [{ "compulsionId": 2, "targetId": "c", "dailyLimitMinutes": 10, "interruption": false }]
      }
      """.trimIndent(),
    )
    assertEquals(
      MomentRules.Config(
        listOf(MomentRules.ModerationRule(3, listOf("a", "b"), 45 * minute, "2026-11-08", 30 * minute)),
        listOf(MomentRules.RiskRule(2, "c", 10 * minute, false)),
      ),
      MomentRules.configFrom(json),
    )
    // Ferramenta de teste: todos os limites com o mesmo valor.
    val test = MomentRules.configFrom(json, testLimitMinutes = 1)
    assertEquals(minute, test.moderation[0].limitMs)
    assertEquals(minute, test.moderation[0].limitOn("2026-11-08"))
    assertEquals(minute, test.risk[0].limitMs)
  }
}
