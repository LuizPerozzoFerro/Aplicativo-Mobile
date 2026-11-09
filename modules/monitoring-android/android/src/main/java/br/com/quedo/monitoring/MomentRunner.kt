package br.com.quedo.monitoring

import android.content.Context
import android.content.pm.ApplicationInfo
import org.json.JSONObject

/**
 * Uso já contado quando o dia foi zerado pelas ferramentas de teste (spec 03,
 * 5.10). O uso vem do histórico do sistema e não dá para apagar: as regras
 * passam a ver só o que veio depois. Vale só no dia em que foi gravado.
 */
object UsageBaseline {
  fun toJson(dayKey: String, totals: Map<String, Long>): JSONObject {
    val values = JSONObject()
    for ((target, milliseconds) in totals) values.put(target, milliseconds)
    return JSONObject().put("dayKey", dayKey).put("totals", values)
  }

  fun forDay(json: String?, dayKey: String): Map<String, Long> {
    val parsed = json?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return emptyMap()
    if (parsed.optString("dayKey") != dayKey) return emptyMap()
    val totals = parsed.optJSONObject("totals") ?: return emptyMap()
    return totals.keys().asSequence().associateWith { totals.getLong(it) }
  }

  fun subtract(usage: Map<String, Long>, baseline: Map<String, Long>): Map<String, Long> =
    usage.mapValues { (target, milliseconds) ->
      (milliseconds - (baseline[target] ?: 0L)).coerceAtLeast(0L)
    }
}

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
  private const val KEY_USAGE_BASELINE = "debugUsageBaseline"

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

  /** O uso que as regras enxergam: fora das ferramentas de teste, o uso inteiro. */
  private fun rulesUsage(context: Context, usage: UsageAccumulator, dayKey: String): Map<String, Long> {
    if (!isDebuggable(context)) return usage.totals()
    val baseline = UsageBaseline.forDay(prefs(context).getString(KEY_USAGE_BASELINE, null), dayKey)
    return UsageBaseline.subtract(usage.totals(), baseline)
  }

  /**
   * Ferramenta de teste (spec 03, 5.10): esquece as telas, pausas e reprovações
   * de hoje, e o uso volta a contar do zero. Não mexe nas notificações. Só em
   * build depurável.
   */
  @Synchronized
  fun debugResetToday(context: Context) {
    if (!isDebuggable(context)) return
    val now = System.currentTimeMillis()
    val usage = loadUsage(context, now, DayBoundary.startOfDay(now))
    prefs(context).edit()
      .remove(KEY_RULES)
      .remove(KEY_LAST_SHOW)
      .putString(KEY_USAGE_BASELINE, UsageBaseline.toJson(DayBoundary.dayKey(now), usage.totals()).toString())
      .commit()
    InterruptionPresenter.close(context)
    InterruptionPresenter.resetAttempts()
  }

  /**
   * Ferramenta de teste (spec 03, 5.10): abre a tela de interrupção da primeira
   * regra que tem tela, sem esperar o limite. O alvo é o próprio app, para a
   * tela não fechar por "o usuário saiu do app". Conta como uma tela de verdade.
   * Devolve falso se não houver regra com tela ou faltar a sobreposição.
   */
  @Synchronized
  fun debugShowInterruption(context: Context): Boolean {
    if (!isDebuggable(context) || !Permissions.canDrawOverlays(context)) return false
    val configJson = ConfigStore.get(context) ?: return false
    val config = MomentRules.configFrom(configJson, testLimit(context))
    val moderation = config.moderation.firstOrNull()?.compulsionId
    val compulsionId = moderation
      ?: config.risk.firstOrNull { it.interruption }?.compulsionId
      ?: return false
    val moment = loadRules(context).peek(compulsionId)
    val action = MomentRules.Action.ShowInterruption(
      compulsionId = compulsionId,
      target = context.packageName,
      canIgnore = moderation != null && moment.interruptions + 1 >= MomentRules.INTERRUPTIONS_TO_IGNORE,
      warnsEndOfDay = moderation != null && moment.continues == MomentRules.CONTINUES_TO_STOP - 1,
    )
    InterruptionPresenter.show(context, action, InterruptionContent.from(configJson, action, moment.interruptions))
    return true
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

    val foreground = usage.foreground()
    InterruptionPresenter.onCheck(
      context,
      foreground,
      (config.moderation.flatMap { it.targets } + config.risk.map { it.target }).toSet(),
    )
    // Sem a sobreposição, fica só a notificação (spec 03, 5.3).
    val blocked = InterruptionPresenter.isBusy ||
      !InterruptionPresenter.canAttempt(now) ||
      InterruptionPresenter.isInCall(context) ||
      !Permissions.canDrawOverlays(context)

    val rules = loadRules(context)
    val actions = MomentRules.tick(
      config,
      rules,
      MomentRules.Tick(now, dayKey, rulesUsage(context, usage, dayKey), foreground, blocked),
    )

    val editor = prefs(context).edit()
      .putString(KEY_RULES, rules.toJson().toString())
      .putString(KEY_USAGE, usage.toJson().toString())
    for (action in actions) {
      when (action) {
        is MomentRules.Action.LimitReached -> {
          EventStore.append(
            context,
            "limit_reached",
            mapOf("compulsionId" to action.compulsionId, "targetId" to action.target),
          )
          NotificationCenter.notifyLimit(context, configJson, action.target)
        }

        is MomentRules.Action.ShowInterruption -> {
          editor.putString(
            KEY_LAST_SHOW,
            JSONObject()
              .put("at", now)
              .put("compulsionId", action.compulsionId)
              .put("target", action.target)
              .put("canIgnore", action.canIgnore)
              .put("warnsEndOfDay", action.warnsEndOfDay)
              .toString(),
          )
          InterruptionPresenter.show(
            context,
            action,
            InterruptionContent.from(configJson, action, rules.peek(action.compulsionId).interruptions),
          )
        }

        is MomentRules.Action.DayFailed -> EventStore.append(
          context,
          "day_failed",
          mapOf("compulsionId" to action.compulsionId, "reason" to action.reason),
        )
      }
    }
    editor.apply()
  }

  private fun save(context: Context, rules: MomentRules.State, usage: UsageAccumulator) {
    prefs(context).edit()
      .putString(KEY_RULES, rules.toJson().toString())
      .putString(KEY_USAGE, usage.toJson().toString())
      .apply()
  }

  /** A tela de fato apareceu (I-28). Conta, para de medir o uso e devolve o id do evento. */
  @Synchronized
  fun onShown(context: Context, compulsionId: Int, target: String): String {
    val now = System.currentTimeMillis()
    val rules = loadRules(context)
    val usage = loadUsage(context, now, DayBoundary.startOfDay(now))
    MomentRules.shown(rules, compulsionId, DayBoundary.dayKey(now))
    usage.suspend(now)
    save(context, rules, usage)
    return EventStore.append(
      context,
      "interruption_shown",
      mapOf("compulsionId" to compulsionId, "targetId" to target),
    )
  }

  /** Um botão da tela. */
  @Synchronized
  fun respond(context: Context, compulsionId: Int, interruptionId: String?, response: String) {
    val configJson = ConfigStore.get(context) ?: return
    val now = System.currentTimeMillis()
    val dayKey = DayBoundary.dayKey(now)
    val rules = loadRules(context)
    val usage = loadUsage(context, now, DayBoundary.startOfDay(now))
    val actions = MomentRules.respond(
      MomentRules.configFrom(configJson, testLimit(context)),
      rules,
      compulsionId,
      response,
      now,
      dayKey,
    )
    usage.resume(now)
    save(context, rules, usage)

    if (interruptionId != null) {
      EventStore.append(
        context,
        "interruption_response",
        mapOf(
          "interruptionId" to interruptionId,
          "compulsionId" to compulsionId,
          "response" to response,
        ),
      )
    }
    if (response == "emergency") {
      EventStore.append(context, "emergency_requested", mapOf("source" to "interruption"))
    }
    for (action in actions) {
      if (action is MomentRules.Action.DayFailed) {
        EventStore.append(
          context,
          "day_failed",
          mapOf("compulsionId" to action.compulsionId, "reason" to action.reason),
        )
        NotificationCenter.onDayFailed(context, action.compulsionId)
      }
    }
  }

  /** A tela saiu sem resposta: chamada, ou o usuário foi embora. */
  @Synchronized
  fun onDismissed(context: Context) {
    val now = System.currentTimeMillis()
    val rules = loadRules(context)
    val usage = loadUsage(context, now, DayBoundary.startOfDay(now))
    MomentRules.exited(rules, now, DayBoundary.dayKey(now))
    usage.resume(now)
    save(context, rules, usage)
  }

  /** O serviço nasceu: se o processo morreu com a tela aberta, o uso volta a contar. */
  @Synchronized
  fun onServiceStart(context: Context) {
    val now = System.currentTimeMillis()
    val usage = loadUsage(context, now, DayBoundary.startOfDay(now))
    usage.resume(now)
    prefs(context).edit().putString(KEY_USAGE, usage.toJson().toString()).apply()
  }

  /** O estado de hoje, em JSON, para a tela de desenvolvimento. */
  @Synchronized
  fun statusJson(context: Context): String {
    val now = System.currentTimeMillis()
    val p = prefs(context)
    val usage = p.getString(KEY_USAGE, null)
      ?.let { runCatching { UsageAccumulator.fromJson(JSONObject(it)) }.getOrNull() }
    val usageJson = JSONObject()
    usage?.let { rulesUsage(context, it, DayBoundary.dayKey(now)) }
      ?.forEach { (target, milliseconds) -> usageJson.put(target, milliseconds) }
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
