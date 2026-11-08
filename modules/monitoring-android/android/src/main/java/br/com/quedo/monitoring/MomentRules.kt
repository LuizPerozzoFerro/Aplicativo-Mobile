package br.com.quedo.monitoring

import org.json.JSONObject

/**
 * Regras do momento (spec 03, tabela da seção 5.2). Vivem no Kotlin porque
 * precisam rodar sem o JavaScript (exceção registrada na spec 03, 4.1). Para
 * não divergirem de `src/domain/momentRules.ts`, as duas rodam os mesmos
 * vetores (`src/domain/vectors/moment-rules.json`). Mudou aqui, muda lá.
 *
 * Sem nada do Android além do org.json, para os testes JUnit. O estado é
 * mutável e cabe num JSON: o processo pode morrer a qualquer momento (I-31).
 */
object MomentRules {
  const val PAUSE_MS = 5 * 60 * 1000L

  /** Carência depois de sair da tela, para não reabrir sobre a tela inicial (protótipo, O3). */
  const val EXIT_GRACE_MS = 3_000L
  const val CONTINUES_TO_STOP = 3
  const val INTERRUPTIONS_TO_IGNORE = 3

  data class ModerationRule(
    val compulsionId: Int,
    val targets: List<String>,
    val limitMs: Long,
    /** Dia e limite que vale só nele: o de antes de um aumento (src/domain/dailyLimit.ts). */
    val todayLimitDay: String? = null,
    val todayLimitMs: Long? = null,
  ) {
    /** O limite no dia: um aumento só vale a partir do dia seguinte. */
    fun limitOn(dayKey: String): Long =
      if (todayLimitDay == dayKey && todayLimitMs != null) todayLimitMs else limitMs
  }

  data class RiskRule(
    val compulsionId: Int,
    val target: String,
    val limitMs: Long,
    /** O usuário declarou consumir o conteúdo neste app: só então há tela. */
    val interruption: Boolean,
  )

  data class Config(val moderation: List<ModerationRule>, val risk: List<RiskRule>)

  data class Tick(
    val now: Long,
    val dayKey: String,
    /** Uso de hoje, em milissegundos, por app. */
    val usage: Map<String, Long>,
    val foreground: String?,
    /** A tela não pode ser pedida agora: já aberta, em recuo ou numa chamada. */
    val blocked: Boolean,
  )

  sealed class Action {
    data class LimitReached(val compulsionId: Int, val target: String?) : Action()

    data class ShowInterruption(
      val compulsionId: Int,
      val target: String,
      val canIgnore: Boolean,
      val warnsEndOfDay: Boolean,
    ) : Action()

    data class DayFailed(val compulsionId: Int, val reason: String) : Action()
  }

  class CompulsionMoment(
    var interruptions: Int = 0,
    var continues: Int = 0,
    /** Fim da pausa; 0 sem pausa. */
    var pausedUntil: Long = 0L,
    /** Dia reprovado (moderação) ou telas encerradas (abstinência), até a meia-noite. */
    var stopped: Boolean = false,
    /** Quando atingiu o limite somado (moderação); nulo antes disso. */
    var reachedAt: Long? = null,
  )

  class State(
    var dayKey: String? = null,
    val compulsions: MutableMap<Int, CompulsionMoment> = HashMap(),
    /** Quando cada app de risco atingiu o limite no dia. */
    val riskReachedAt: MutableMap<String, Long> = HashMap(),
    var lastExitAt: Long = 0L,
  ) {
    fun moment(compulsionId: Int): CompulsionMoment =
      compulsions.getOrPut(compulsionId) { CompulsionMoment() }

    fun peek(compulsionId: Int): CompulsionMoment = compulsions[compulsionId] ?: CompulsionMoment()

    /** A borda do dia zera tudo: contagens, pausa, avisos e carência (spec 03, 5.2). */
    internal fun enterDay(day: String) {
      if (dayKey == day) return
      dayKey = day
      compulsions.clear()
      riskReachedAt.clear()
      lastExitAt = 0L
    }

    fun toJson(): JSONObject {
      val moments = JSONObject()
      for ((id, moment) in compulsions) {
        moments.put(
          id.toString(),
          JSONObject()
            .put("interruptions", moment.interruptions)
            .put("continues", moment.continues)
            .put("pausedUntil", moment.pausedUntil)
            .put("stopped", moment.stopped)
            .put("reachedAt", moment.reachedAt ?: JSONObject.NULL),
        )
      }
      val risk = JSONObject()
      for ((target, at) in riskReachedAt) risk.put(target, at)
      return JSONObject()
        .put("dayKey", dayKey ?: JSONObject.NULL)
        .put("compulsions", moments)
        .put("riskReachedAt", risk)
        .put("lastExitAt", lastExitAt)
    }

    companion object {
      fun fromJson(json: JSONObject): State {
        val state = State(
          dayKey = if (json.isNull("dayKey")) null else json.getString("dayKey"),
          lastExitAt = json.optLong("lastExitAt", 0L),
        )
        val moments = json.getJSONObject("compulsions")
        for (id in moments.keys()) {
          val moment = moments.getJSONObject(id)
          state.compulsions[id.toInt()] = CompulsionMoment(
            interruptions = moment.getInt("interruptions"),
            continues = moment.getInt("continues"),
            pausedUntil = moment.getLong("pausedUntil"),
            stopped = moment.getBoolean("stopped"),
            reachedAt = if (moment.isNull("reachedAt")) null else moment.getLong("reachedAt"),
          )
        }
        val risk = json.getJSONObject("riskReachedAt")
        for (target in risk.keys()) state.riskReachedAt[target] = risk.getLong(target)
        return state
      }
    }
  }

  private fun used(usage: Map<String, Long>, targets: List<String>): Long =
    targets.sumOf { usage[it] ?: 0L }

  private class Candidate(val compulsionId: Int, val reachedAt: Long, val moderation: Boolean)

  /** Uma verificação do serviço. Muda o estado e devolve o que fazer agora. */
  fun tick(config: Config, state: State, tick: Tick): List<Action> {
    state.enterDay(tick.dayKey)
    val actions = ArrayList<Action>()

    for (rule in config.moderation) {
      if (used(tick.usage, rule.targets) >= rule.limitOn(tick.dayKey) && state.peek(rule.compulsionId).reachedAt == null) {
        state.moment(rule.compulsionId).reachedAt = tick.now
        actions.add(Action.LimitReached(rule.compulsionId, null))
      }
    }
    for (rule in config.risk) {
      if (used(tick.usage, listOf(rule.target)) >= rule.limitMs && rule.target !in state.riskReachedAt) {
        state.riskReachedAt[rule.target] = tick.now
        actions.add(Action.LimitReached(rule.compulsionId, rule.target))
      }
    }

    chooseInterruption(config, state, tick)?.let { actions.add(it) }
    return actions
  }

  private fun chooseInterruption(config: Config, state: State, tick: Tick): Action? {
    val foreground = tick.foreground ?: return null

    val candidates = ArrayList<Candidate>()
    for (rule in config.moderation) {
      val moment = state.peek(rule.compulsionId)
      val reachedAt = moment.reachedAt
      if (
        foreground in rule.targets &&
        reachedAt != null &&
        !moment.stopped &&
        used(tick.usage, rule.targets) >= rule.limitOn(tick.dayKey)
      ) {
        candidates.add(Candidate(rule.compulsionId, reachedAt, moderation = true))
      }
    }
    for (rule in config.risk) {
      val reachedAt = state.riskReachedAt[rule.target]
      if (
        rule.target == foreground &&
        rule.interruption &&
        reachedAt != null &&
        !state.peek(rule.compulsionId).stopped &&
        used(tick.usage, listOf(rule.target)) >= rule.limitMs
      ) {
        candidates.add(Candidate(rule.compulsionId, reachedAt, moderation = false))
      }
    }

    // Uma tela só: a da compulsão que atingiu primeiro. Enquanto ela estiver
    // ativa, mesmo em pausa, a outra não entra no lugar.
    val first = candidates.minWithOrNull(compareBy({ it.reachedAt }, { it.compulsionId })) ?: return null

    // Na verificação em que atingiu, só o aviso; a tela vem na seguinte.
    if (first.reachedAt == tick.now) return null
    val moment = state.peek(first.compulsionId)
    if (moment.pausedUntil > tick.now) return null
    if (tick.blocked) return null
    if (state.lastExitAt > 0L && tick.now - state.lastExitAt < EXIT_GRACE_MS) return null

    return Action.ShowInterruption(
      compulsionId = first.compulsionId,
      target = foreground,
      canIgnore = first.moderation && moment.interruptions + 1 >= INTERRUPTIONS_TO_IGNORE,
      warnsEndOfDay = first.moderation && moment.continues == CONTINUES_TO_STOP - 1,
    )
  }

  /** A tela de fato apareceu (I-28): só aí ela conta. */
  fun shown(state: State, compulsionId: Int, dayKey: String) {
    state.enterDay(dayKey)
    state.moment(compulsionId).interruptions += 1
  }

  /** O usuário respondeu na tela: `emergency`, `home`, `continue` ou `ignore_today`. */
  fun respond(
    config: Config,
    state: State,
    compulsionId: Int,
    response: String,
    now: Long,
    dayKey: String,
  ): List<Action> {
    val moderation = config.moderation.any { it.compulsionId == compulsionId }
    val risk = config.risk.any { it.compulsionId == compulsionId }
    if (!moderation && !risk) return emptyList()

    state.enterDay(dayKey)
    val moment = state.moment(compulsionId)

    if (response == "ignore_today") {
      // O botão só existe na moderação, a partir da 3ª tela.
      if (!moderation || moment.interruptions < INTERRUPTIONS_TO_IGNORE || moment.stopped) {
        return emptyList()
      }
      state.lastExitAt = now
      moment.stopped = true
      return listOf(Action.DayFailed(compulsionId, "ignored_limit"))
    }

    state.lastExitAt = now
    if (response != "continue") return emptyList()

    moment.continues += 1
    moment.pausedUntil = now + PAUSE_MS
    val stops = moment.continues >= CONTINUES_TO_STOP && !moment.stopped
    if (stops) moment.stopped = true
    return if (stops && moderation) listOf(Action.DayFailed(compulsionId, "third_continue")) else emptyList()
  }

  /**
   * As regras a partir da configuração do JS (`MonitoringConfig`). Com
   * `testLimitMinutes`, todos os limites ficam com esse valor (só nas
   * ferramentas de teste, spec 03, 5.10).
   */
  fun configFrom(json: JSONObject, testLimitMinutes: Int? = null): Config {
    fun limitMs(minutes: Int) = (testLimitMinutes ?: minutes) * 60_000L

    val moderationJson = json.getJSONArray("moderationRules")
    val moderation = (0 until moderationJson.length()).map { index ->
      val rule = moderationJson.getJSONObject(index)
      val targets = rule.getJSONArray("targetIds")
      val today = rule.optJSONObject("limitToday")
      ModerationRule(
        compulsionId = rule.getInt("compulsionId"),
        targets = (0 until targets.length()).map { targets.getString(it) },
        limitMs = limitMs(rule.getInt("dailyLimitMinutes")),
        todayLimitDay = today?.getString("dayKey"),
        todayLimitMs = today?.let { limitMs(it.getInt("minutes")) },
      )
    }
    val riskJson = json.getJSONArray("riskAppRules")
    val risk = (0 until riskJson.length()).map { index ->
      val rule = riskJson.getJSONObject(index)
      RiskRule(
        compulsionId = rule.getInt("compulsionId"),
        target = rule.getString("targetId"),
        limitMs = limitMs(rule.getInt("dailyLimitMinutes")),
        interruption = rule.getBoolean("interruption"),
      )
    }
    return Config(moderation, risk)
  }
}
