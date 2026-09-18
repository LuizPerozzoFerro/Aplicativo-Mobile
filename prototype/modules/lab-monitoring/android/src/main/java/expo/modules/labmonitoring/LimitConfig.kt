package expo.modules.labmonitoring

import android.content.Context

/**
 * Configuracao do limite de uso (experimento A2), guardada em SharedPreferences.
 *
 * Fica em disco, e nao em memoria, por dois motivos: o servico pode ser recriado
 * pelo sistema depois de morto, e o A9 vai exigir que o monitoramento volte
 * sozinho depois de reiniciar o aparelho.
 */
object LimitConfig {
  private const val PREFS = "lab-limit"
  private const val KEY_ACTIVE = "active"
  private const val KEY_MINUTES = "minutes"
  private const val KEY_PACKAGES = "packages"
  private const val KEY_FIRED_AT = "firedAt"
  private const val KEY_MESSAGE = "message"
  private const val KEY_MODE = "interruptionMode"
  private const val KEY_ESCALATED_AT = "escalatedAt"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun save(
    context: Context,
    minutes: Int,
    packages: List<String>,
    message: String,
    interruptionMode: String
  ) {
    prefs(context).edit()
      .putBoolean(KEY_ACTIVE, true)
      .putInt(KEY_MINUTES, minutes)
      .putStringSet(KEY_PACKAGES, packages.toSet())
      .putString(KEY_MESSAGE, message)
      .putString(KEY_MODE, interruptionMode)
      .remove(KEY_FIRED_AT)
      .remove(KEY_ESCALATED_AT)
      .apply()
  }

  fun clear(context: Context) {
    prefs(context).edit().clear().apply()
  }

  fun isActive(context: Context) = prefs(context).getBoolean(KEY_ACTIVE, false)

  fun minutes(context: Context) = prefs(context).getInt(KEY_MINUTES, 0)

  fun packages(context: Context): List<String> =
    prefs(context).getStringSet(KEY_PACKAGES, emptySet())?.toList() ?: emptyList()

  /** Texto neutro do alerta. Configuravel para atender o experimento C2. */
  fun message(context: Context): String =
    prefs(context).getString(KEY_MESSAGE, null)?.takeIf { it.isNotBlank() }
      ?: Notifier.DEFAULT_MESSAGE

  /** Epoch em ms de quando o limite foi atingido, ou 0 se ainda nao foi. */
  fun firedAt(context: Context) = prefs(context).getLong(KEY_FIRED_AT, 0L)

  fun markFired(context: Context, at: Long) {
    prefs(context).edit().putLong(KEY_FIRED_AT, at).apply()
  }

  /** 'overlay' (sobreposicao) ou 'activity' (tela propria). Ver achado A4. */
  fun interruptionMode(context: Context): String =
    prefs(context).getString(KEY_MODE, null) ?: "overlay"

  /** Epoch em ms do alerta de nivel 2, ou 0 se ainda nao houve. */
  fun escalatedAt(context: Context) = prefs(context).getLong(KEY_ESCALATED_AT, 0L)

  fun markEscalated(context: Context, at: Long) {
    prefs(context).edit().putLong(KEY_ESCALATED_AT, at).apply()
  }
}
