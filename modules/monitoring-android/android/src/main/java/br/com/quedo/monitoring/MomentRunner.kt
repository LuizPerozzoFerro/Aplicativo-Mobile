package br.com.quedo.monitoring

import android.content.Context
import android.content.pm.ApplicationInfo
import org.json.JSONObject

/**
 * Liga as regras do momento ao aparelho: a cada verificação do serviço, lê os
 * eventos novos de uso, roda as regras e aplica o resultado. O estado fica em
 * disco (spec 03, 4.4). As ações viram eventos para o JS; a tela de interrupção
 * entra no passo 4 e a notificação de limite no passo 5.
 *
 * Nada aqui escreve no `logcat` (spec 03, 5.11).
 */
object MomentRunner {
  private const val PREFS = "quedo-monitoring-moment"
  private const val KEY_RULES = "rules"
  private const val KEY_USAGE = "usage"
  private const val KEY_LAST_SHOW = "lastShow"
  private const val KEY_TEST_LIMIT = "testLimitMinutes"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun loadRules(context: Context): MomentRules.State =
    prefs(context).getString(KEY_RULES, null)
      ?.let { runCatching { MomentRules.State.fromJson(JSONObject(it)) }.getOrNull() }
      ?: MomentRules.State()

  private fun loadUsage(context: Context, now: Long, dayStart: Long): UsageAccumulator =
    prefs(context).getString(KEY_USAGE, null)
      ?.let { runCatching { UsageAccumulator.fromJson(JSONObject(it)) }.getOrNull() }
      // A primeira leitura vai 24 horas antes da meia-noite: pega o app já aberto.
      ?: UsageAccumulator(
        cursor = dayStart - UsageReader.LOOKBACK_MS + UsageAccumulator.OVERLAP_MS,
        dayStart = dayStart,
      )

  private fun isDebuggable(context: Context): Boolean =
    context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0

  private fun testLimit(context: Context): Int? {
    if (!isDebuggable(context)) return null
    return prefs(context).getInt(KEY_TEST_LIMIT, 0).takeIf { it > 0 }
  }

  /** Ferramenta de teste (spec 03, 5.10): todos os limites com `minutes`. Só em build depurável. */
  @Synchronized
  fun setTestLimit(context: Context, minutes: Int?) {
    if (!isDebuggable(context)) return
    prefs(context).edit().apply {
      if (minutes != null && minutes > 0) putInt(KEY_TEST_LIMIT, minutes) else remove(KEY_TEST_LIMIT)
    }.commit()
  }

  /** Uma verificação. Chamada na thread do serviço. */
  @Synchronized
  fun check(context: Context, now: Long = System.currentTimeMillis()) {
    val configJson = ConfigStore.get(context) ?: return
    if (!Permissions.hasUsageAccess(context)) return

    val config = MomentRules.configFrom(configJson, testLimit(context))
    val dayStart = DayBoundary.startOfDay(now)
    val dayKey = DayBoundary.dayKey(now)

    val usage = loadUsage(context, now, dayStart)
    usage.advance(
      UsageReader.readEvents(context, usage.readFrom(), now),
      now,
      dayStart,
      UsageReader.launcherPackages(context),
    )

    val rules = loadRules(context)
    val actions = MomentRules.tick(
      config,
      rules,
      MomentRules.Tick(now, dayKey, usage.totals(), usage.foreground(), blocked = false),
    )

    val editor = prefs(context).edit()
      .putString(KEY_RULES, rules.toJson().toString())
      .putString(KEY_USAGE, usage.toJson().toString())
    for (action in actions) {
      when (action) {
        is MomentRules.Action.LimitReached -> EventStore.append(
          context,
          "limit_reached",
          mapOf("compulsionId" to action.compulsionId, "targetId" to action.target),
        )

        is MomentRules.Action.ShowInterruption -> editor.putString(
          KEY_LAST_SHOW,
          JSONObject()
            .put("at", now)
            .put("compulsionId", action.compulsionId)
            .put("target", action.target)
            .put("canIgnore", action.canIgnore)
            .put("warnsEndOfDay", action.warnsEndOfDay)
            .toString(),
        )

        is MomentRules.Action.DayFailed -> EventStore.append(
          context,
          "day_failed",
          mapOf("compulsionId" to action.compulsionId, "reason" to action.reason),
        )
      }
    }
    editor.apply()
  }

  /** O estado de hoje, em JSON, para a tela de desenvolvimento. */
  @Synchronized
  fun statusJson(context: Context): String {
    val now = System.currentTimeMillis()
    val p = prefs(context)
    val usage = p.getString(KEY_USAGE, null)
      ?.let { runCatching { UsageAccumulator.fromJson(JSONObject(it)) }.getOrNull() }
    val usageJson = JSONObject()
    usage?.totals()?.forEach { (target, milliseconds) -> usageJson.put(target, milliseconds) }
    return JSONObject()
      .put("now", now)
      .put("rules", loadRules(context).toJson())
      .put("usage", usageJson)
      .put("foreground", usage?.foreground() ?: JSONObject.NULL)
      .put("lastShow", p.getString(KEY_LAST_SHOW, null)?.let { JSONObject(it) } ?: JSONObject.NULL)
      .put("testLimitMinutes", testLimit(context) ?: JSONObject.NULL)
      .toString()
  }

  @Synchronized
  fun clear(context: Context) {
    prefs(context).edit().clear().commit()
  }
}
