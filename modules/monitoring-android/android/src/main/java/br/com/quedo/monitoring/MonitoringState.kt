package br.com.quedo.monitoring

import android.content.Context

/**
 * Estado do monitoramento em disco (spec 03, seção 4.4; I-31): o processo pode
 * morrer a qualquer momento, e o serviço é recriado pelo sistema ou pelo boot
 * sem o JavaScript. Nada aqui identifica apps, compulsões ou respostas.
 *
 * O app inteiro fica fora do backup (`allowBackup: false` no app.config.ts),
 * inclusive estas preferências.
 */
object MonitoringState {
  private const val PREFS = "quedo-monitoring"
  private const val KEY_ACTIVE = "active"
  private const val KEY_SERVICE_STARTS = "serviceStarts"
  private const val KEY_SERVICE_STARTED_AT = "serviceStartedAt"
  private const val KEY_START_REQUESTED_AT = "startRequestedAt"
  private const val KEY_CHECKS = "checks"
  private const val KEY_LAST_CHECK_AT = "lastCheckAt"
  private const val KEY_LAST_BOOT_AT = "lastBootAt"
  private const val KEY_LAST_BOOT_RESULT = "lastBootResult"

  /** Resultado da última tentativa de religar o serviço pelo boot ou pela atualização. */
  enum class BootResult { STARTED, INACTIVE, NO_USAGE_ACCESS, FAILED }

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Se o monitoramento deve estar ligado. Quando sim, o serviço volta sozinho. */
  fun isActive(context: Context) = prefs(context).getBoolean(KEY_ACTIVE, false)

  fun setActive(context: Context, active: Boolean) {
    // commit, e não apply: o boot e o serviço recriado leem isto num processo
    // que pode ter acabado de nascer.
    prefs(context).edit().putBoolean(KEY_ACTIVE, active).commit()
  }

  /** Pedido para ligar o serviço: dá tempo a ele antes de acusar que parou. */
  fun recordStartRequested(context: Context, at: Long) {
    prefs(context).edit().putLong(KEY_START_REQUESTED_AT, at).commit()
  }

  fun startRequestedAt(context: Context): Long = prefs(context).getLong(KEY_START_REQUESTED_AT, 0L)

  fun lastCheckAt(context: Context): Long = prefs(context).getLong(KEY_LAST_CHECK_AT, 0L)

  /** Cada criação do serviço: pelo app, pelo boot ou pelo sistema depois de matá-lo. */
  fun recordServiceStart(context: Context, at: Long) {
    val p = prefs(context)
    p.edit()
      .putInt(KEY_SERVICE_STARTS, p.getInt(KEY_SERVICE_STARTS, 0) + 1)
      .putLong(KEY_SERVICE_STARTED_AT, at)
      .apply()
  }

  /** Contador de verificações do serviço (doc 02, seção 4.1). */
  fun recordCheck(context: Context, at: Long) {
    val p = prefs(context)
    p.edit()
      .putLong(KEY_CHECKS, p.getLong(KEY_CHECKS, 0L) + 1)
      .putLong(KEY_LAST_CHECK_AT, at)
      .apply()
  }

  fun recordBoot(context: Context, at: Long, result: BootResult) {
    prefs(context).edit()
      .putLong(KEY_LAST_BOOT_AT, at)
      .putString(KEY_LAST_BOOT_RESULT, result.name.lowercase())
      .apply()
  }

  /** "Apagar meus dados": volta ao estado de instalação. */
  fun clear(context: Context) {
    prefs(context).edit().clear().commit()
  }

  fun snapshot(context: Context): Map<String, Any?> {
    val p = prefs(context)
    return mapOf(
      "active" to p.getBoolean(KEY_ACTIVE, false),
      "running" to MonitoringService.isRunning,
      "serviceStarts" to p.getInt(KEY_SERVICE_STARTS, 0),
      "serviceStartedAt" to p.getLong(KEY_SERVICE_STARTED_AT, 0L).takeIf { it > 0L },
      "startRequestedAt" to p.getLong(KEY_START_REQUESTED_AT, 0L).takeIf { it > 0L },
      "checks" to p.getLong(KEY_CHECKS, 0L),
      "lastCheckAt" to p.getLong(KEY_LAST_CHECK_AT, 0L).takeIf { it > 0L },
      "lastBootAt" to p.getLong(KEY_LAST_BOOT_AT, 0L).takeIf { it > 0L },
      "lastBootResult" to p.getString(KEY_LAST_BOOT_RESULT, null),
    )
  }
}
