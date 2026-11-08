package br.com.quedo.monitoring

import android.content.Context
import org.json.JSONException
import org.json.JSONObject

/**
 * Última configuração recebida do JS (spec 03, seção 4.2), em disco: o
 * nativo a usa depois do reinício e da morte do processo, sem o JS. O
 * formato é o de `MonitoringConfig` em src/monitoring/types.ts.
 */
object ConfigStore {
  private const val PREFS = "quedo-monitoring-config"
  private const val KEY_CONFIG = "config"

  /** A versão que este nativo entende. */
  const val VERSION = 1

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Guarda a configuração, se for válida. Devolve falso (e mantém a anterior) se não for. */
  fun save(context: Context, json: String): Boolean {
    if (ConfigValidation.parse(json) == null) return false
    // commit: o serviço e o boot podem ler logo depois, em outro processo recém-criado.
    return prefs(context).edit().putString(KEY_CONFIG, json).commit()
  }

  fun json(context: Context): String? = prefs(context).getString(KEY_CONFIG, null)

  fun get(context: Context): JSONObject? = json(context)?.let { ConfigValidation.parse(it) }

  fun clear(context: Context) {
    prefs(context).edit().clear().commit()
  }

  /** Um texto da configuração (`texts.<grupo>.<chave>`), ou o mínimo neutro do `strings.xml`. */
  fun text(context: Context, group: String, key: String, fallback: Int): String =
    get(context)?.optJSONObject("texts")?.optJSONObject(group)?.optString(key)?.takeIf { it.isNotBlank() }
      ?: context.getString(fallback)
}

/** Conferência mínima do formato, sem nada do Android além do org.json (testada em JUnit). */
object ConfigValidation {
  private val REQUIRED_ARRAYS = listOf("compulsions", "moderationRules", "riskAppRules")
  private val REQUIRED_TEXTS = mapOf(
    "channels" to listOf("tracking", "alerts", "reminders"),
    "ongoing" to listOf("title", "text"),
    "interruption" to listOf(
      "brand",
      "title",
      "motivationLabel",
      "emergency",
      "home",
      "continue",
      "ignoreToday",
      "endOfDayWarning",
    ),
  )

  fun parse(json: String): JSONObject? {
    val config = try {
      JSONObject(json)
    } catch (error: JSONException) {
      return null
    }
    if (config.optInt("version", -1) != ConfigStore.VERSION) return null
    if (REQUIRED_ARRAYS.any { config.optJSONArray(it) == null }) return null
    if (config.optJSONObject("preventive") == null) return null
    val texts = config.optJSONObject("texts") ?: return null
    for ((group, keys) in REQUIRED_TEXTS) {
      val values = texts.optJSONObject(group) ?: return null
      if (keys.any { values.optString(it).isBlank() }) return null
    }
    val phrases = texts.getJSONObject("interruption").optJSONArray("phrases")
    if (phrases == null || phrases.length() == 0) return null
    if (config.optJSONArray("restartDayKeys") == null) return null
    if (config.optJSONObject("links")?.optString("permissions").isNullOrBlank()) return null
    val notifications = texts.optJSONObject("notifications") ?: return null
    val required = listOf("public", "limit", "riskApp", "restart", "protectionPaused", "checkIn", "preventive")
    if (required.any { notifications.optJSONObject(it) == null }) return null
    if (notifications.optString("emergencyAction").isBlank()) return null
    return config
  }
}
