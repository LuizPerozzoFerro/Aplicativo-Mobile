package br.com.quedo.monitoring

import org.json.JSONObject
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class ConfigValidationTest {
  // O formato de `MonitoringConfig` (src/monitoring/types.ts), como o JS envia.
  private val valid = """
    {
      "version": 1,
      "compulsions": [{ "id": 1, "type": "pornography", "streakBaseDayKey": "2026-11-01", "checkInAnsweredDayKey": null }],
      "moderationRules": [],
      "riskAppRules": [],
      "checkInMinutes": 1260,
      "preventive": { "weekdays": [0, 6], "startMinutes": [1200], "emotions": [] },
      "motivation": "Dormir melhor",
      "texts": {
        "channels": { "tracking": "Acompanhamento", "alerts": "Avisos", "reminders": "Lembretes" },
        "ongoing": { "title": "Quedo", "text": "Proteção ativa." },
        "interruption": {
          "brand": "Quedo",
          "title": "Momento de pausa",
          "phrases": ["Respire fundo."],
          "motivationLabel": "Sua motivação",
          "emergency": "Emergência",
          "home": "Ir para a tela inicial",
          "continue": "Continuar mesmo assim",
          "ignoreToday": "Ignorar o limite por hoje",
          "endOfDayWarning": "Encerra a meta de hoje."
        }
      }
    }
  """.trimIndent()

  private fun without(path: List<String>): String {
    val config = JSONObject(valid)
    var node = config
    for (key in path.dropLast(1)) node = node.getJSONObject(key)
    node.remove(path.last())
    return config.toString()
  }

  @Test
  fun acceptsTheFormatTheJsSends() {
    assertNotNull(ConfigValidation.parse(valid))
  }

  @Test
  fun refusesAnotherVersion() {
    assertNull(ConfigValidation.parse(JSONObject(valid).put("version", 2).toString()))
    assertNull(ConfigValidation.parse(without(listOf("version"))))
  }

  @Test
  fun refusesWhatIsNotJson() {
    assertNull(ConfigValidation.parse("{"))
    assertNull(ConfigValidation.parse("[]"))
  }

  @Test
  fun refusesMissingParts() {
    for (path in listOf(
      listOf("compulsions"),
      listOf("moderationRules"),
      listOf("riskAppRules"),
      listOf("preventive"),
      listOf("texts"),
      listOf("texts", "channels"),
      listOf("texts", "ongoing", "text"),
      listOf("texts", "interruption"),
      listOf("texts", "interruption", "phrases"),
      listOf("texts", "interruption", "continue"),
    )) {
      assertNull(path.joinToString("."), ConfigValidation.parse(without(path)))
    }
  }

  @Test
  fun refusesBlankTexts() {
    val config = JSONObject(valid)
    config.getJSONObject("texts").getJSONObject("ongoing").put("title", "  ")
    assertNull(ConfigValidation.parse(config.toString()))
  }
}
