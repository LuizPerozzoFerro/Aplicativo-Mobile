package br.com.quedo.monitoring

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import org.json.JSONArray
import org.json.JSONObject

/**
 * Quais lembretes saem e quando acordar de novo (spec 03, 5.4). Sem nada do
 * Android além do org.json, para os testes JUnit. O estado cabe num JSON,
 * porque o processo morre e o aparelho reinicia.
 *
 * Um alarme só: o do próximo lembrete ou, no máximo, o da próxima meia-noite.
 */
object NotificationPlan {
  const val RESTART_MINUTES = 9 * 60
  const val MAX_PROACTIVE_PER_DAY = 6
  const val MAX_PREVENTIVE_PER_DAY = 4

  /**
   * Quanto tempo uma preventiva atrasada ainda faz sentido. O sistema pode
   * atrasar um alarme inexato em até uma hora, e mais em economia profunda.
   * Passado isso (ou depois de religar o aparelho), ela é pulada.
   */
  const val PREVENTIVE_MISS_WINDOW_MS = 90 * 60_000L

  data class CheckIn(val compulsionId: Int, val minutes: Int, val answeredDayKey: String?)

  data class Config(
    val checkIn: CheckIn?,
    /** 0 = domingo, como no JS. */
    val weekdays: Set<Int>,
    val startMinutes: List<Int>,
    val restartDayKeys: Set<String>,
  )

  sealed class Item {
    data object CheckInDue : Item()

    data object Restart : Item()

    data class Preventive(val minutes: Int) : Item()
  }

  class State(
    var dayKey: String? = null,
    var checkInSent: Boolean = false,
    /** Respondido pela notificação: o JS só fica sabendo ao abrir o app. */
    var checkInAnswered: Boolean = false,
    var restartSent: Boolean = false,
    /** Recomeço vencido, esperando o desbloqueio. */
    var restartWaiting: Boolean = false,
    var proactiveSent: Int = 0,
    val preventiveSent: MutableSet<Int> = HashSet(),
    /** Quebras vistas pelo nativo antes de o JS importar (dia do recomeço). */
    val nativeRestartDays: MutableSet<String> = HashSet(),
    /** Motivos de "proteção pausada" já avisados hoje. */
    val protectionReasons: MutableSet<String> = HashSet(),
  ) {
    fun toJson(): JSONObject = JSONObject()
      .put("dayKey", dayKey ?: JSONObject.NULL)
      .put("checkInSent", checkInSent)
      .put("checkInAnswered", checkInAnswered)
      .put("restartSent", restartSent)
      .put("restartWaiting", restartWaiting)
      .put("proactiveSent", proactiveSent)
      .put("preventiveSent", JSONArray(preventiveSent.toList()))
      .put("nativeRestartDays", JSONArray(nativeRestartDays.toList()))
      .put("protectionReasons", JSONArray(protectionReasons.toList()))

    companion object {
      fun fromJson(json: JSONObject): State {
        val state = State(
          dayKey = if (json.isNull("dayKey")) null else json.getString("dayKey"),
          checkInSent = json.getBoolean("checkInSent"),
          checkInAnswered = json.getBoolean("checkInAnswered"),
          restartSent = json.getBoolean("restartSent"),
          restartWaiting = json.getBoolean("restartWaiting"),
          proactiveSent = json.getInt("proactiveSent"),
        )
        val preventive = json.getJSONArray("preventiveSent")
        for (i in 0 until preventive.length()) state.preventiveSent.add(preventive.getInt(i))
        val days = json.getJSONArray("nativeRestartDays")
        for (i in 0 until days.length()) state.nativeRestartDays.add(days.getString(i))
        val reasons = json.getJSONArray("protectionReasons")
        for (i in 0 until reasons.length()) state.protectionReasons.add(reasons.getString(i))
        return state
      }
    }
  }

  private fun date(now: Long, zone: ZoneId): LocalDate =
    Instant.ofEpochMilli(now).atZone(zone).toLocalDate()

  /** Instante de um horário do dia. Numa hora que não existe (horário de verão), o seguinte válido. */
  private fun at(date: LocalDate, minutes: Int, zone: ZoneId): Long =
    date.atStartOfDay().plusMinutes(minutes.toLong()).atZone(zone).toInstant().toEpochMilli()

  /** Muda de dia: zera o que é do dia. Devolve verdadeiro se mudou. */
  fun enterDay(state: State, now: Long, zone: ZoneId): Boolean {
    val today = date(now, zone).toString()
    if (state.dayKey == today) return false
    val hadDay = state.dayKey != null
    state.dayKey = today
    state.checkInSent = false
    state.checkInAnswered = false
    state.restartSent = false
    state.restartWaiting = false
    state.proactiveSent = 0
    state.preventiveSent.clear()
    state.protectionReasons.clear()
    state.nativeRestartDays.removeAll { it < today }
    return hadDay
  }

  private fun checkInPending(config: Config, state: State, today: String): Boolean {
    val checkIn = config.checkIn ?: return false
    return !state.checkInSent && !state.checkInAnswered && checkIn.answeredDayKey != today
  }

  private fun restartPending(config: Config, state: State, today: String): Boolean =
    !state.restartSent && (today in config.restartDayKeys || today in state.nativeRestartDays)

  private fun preventiveToday(config: Config, today: LocalDate): List<Int> {
    // DayOfWeek: segunda = 1 ... domingo = 7.
    if (today.dayOfWeek.value % 7 !in config.weekdays) return emptyList()
    return config.startMinutes
  }

  /** O que deve sair agora. Chamar depois de `enterDay`. */
  fun due(config: Config, state: State, now: Long, zone: ZoneId): List<Item> {
    val today = date(now, zone)
    val key = today.toString()
    val items = ArrayList<Item>()
    var total = state.proactiveSent

    val checkIn = config.checkIn
    if (checkIn != null && checkInPending(config, state, key) && now >= at(today, checkIn.minutes, zone)) {
      if (total < MAX_PROACTIVE_PER_DAY) {
        items.add(Item.CheckInDue)
        total += 1
      }
    }
    if (restartPending(config, state, key) && now >= at(today, RESTART_MINUTES, zone)) {
      if (total < MAX_PROACTIVE_PER_DAY) {
        items.add(Item.Restart)
        total += 1
      }
    }
    var preventive = state.preventiveSent.size
    for (minutes in preventiveToday(config, today)) {
      if (minutes in state.preventiveSent) continue
      val start = at(today, minutes, zone)
      if (now < start || now - start > PREVENTIVE_MISS_WINDOW_MS) continue
      if (preventive >= MAX_PREVENTIVE_PER_DAY || total >= MAX_PROACTIVE_PER_DAY) break
      items.add(Item.Preventive(minutes))
      preventive += 1
      total += 1
    }
    return items
  }

  fun markSent(state: State, item: Item) {
    when (item) {
      Item.CheckInDue -> state.checkInSent = true
      Item.Restart -> {
        state.restartSent = true
        state.restartWaiting = false
      }
      is Item.Preventive -> state.preventiveSent.add(item.minutes)
    }
    state.proactiveSent += 1
  }

  /** Quando acordar de novo: o próximo lembrete de hoje ou, no máximo, a próxima meia-noite. */
  fun nextWake(config: Config, state: State, now: Long, zone: ZoneId): Long {
    val today = date(now, zone)
    val key = today.toString()
    val candidates = ArrayList<Long>()
    candidates.add(today.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli())

    config.checkIn?.let {
      if (checkInPending(config, state, key)) candidates.add(at(today, it.minutes, zone))
    }
    if (restartPending(config, state, key)) candidates.add(at(today, RESTART_MINUTES, zone))
    for (minutes in preventiveToday(config, today)) {
      if (minutes !in state.preventiveSent) candidates.add(at(today, minutes, zone))
    }
    return candidates.filter { it > now }.min()
  }

  /** O plano a partir da configuração do JS (`MonitoringConfig`). */
  fun configFrom(json: JSONObject): Config {
    val compulsions = json.getJSONArray("compulsions")
    val checkInId = if (json.isNull("checkInCompulsionId")) null else json.getInt("checkInCompulsionId")
    val checkIn = if (checkInId != null && !json.isNull("checkInMinutes")) {
      val answered = (0 until compulsions.length())
        .map { compulsions.getJSONObject(it) }
        .firstOrNull { it.getInt("id") == checkInId }
        ?.let { if (it.isNull("checkInAnsweredDayKey")) null else it.getString("checkInAnsweredDayKey") }
      CheckIn(checkInId, json.getInt("checkInMinutes"), answered)
    } else {
      null
    }
    val preventive = json.getJSONObject("preventive")
    val weekdays = preventive.getJSONArray("weekdays")
    val starts = preventive.getJSONArray("startMinutes")
    val restart = json.getJSONArray("restartDayKeys")
    return Config(
      checkIn = checkIn,
      weekdays = (0 until weekdays.length()).map { weekdays.getInt(it) }.toSet(),
      startMinutes = (0 until starts.length()).map { starts.getInt(it) },
      restartDayKeys = (0 until restart.length()).map { restart.getString(it) }.toSet(),
    )
  }

  /** O recomeço vale se havia streak a perder: 1 dia ou mais até hoje (spec 03, 5.4). */
  fun hadStreak(streakBaseDayKey: String, today: String): Boolean =
    LocalDate.parse(streakBaseDayKey).isBefore(LocalDate.parse(today))

  fun nextDay(today: String): String = LocalDate.parse(today).plusDays(1).toString()
}
