package br.com.quedo.monitoring

import android.content.Context
import java.io.File
import java.time.ZoneId
import org.json.JSONArray
import org.json.JSONObject

/**
 * Histórico de uso no aparelho (spec 04, 4.4): segundos por dia, hora e app,
 * só dos apps de vídeos curtos da configuração. O Android guarda os eventos
 * de uso por "alguns dias" (cerca de 10 no S22, NOTAS-APP.md); aqui os dias já
 * terminados ficam guardados por `KEEP_DAYS`, para o JS importar mesmo depois
 * de dias sem abrir o app.
 *
 * - Os dias que faltam (até `LOOKBACK_DAYS` para trás) são calculados de uma
 *   vez, numa leitura de eventos, uma vez por dia (pelo serviço) ou quando o JS
 *   pede. Isso também lê os dias anteriores à primeira abertura da Fase 5.
 * - O dia de hoje não é guardado: é calculado na hora do pedido.
 * - Nada daqui vai para o `logcat` (spec 04, 5.13).
 */
object UsageHistory {
  private const val FILE_NAME = "quedo-usage-history.json"
  const val KEEP_DAYS = 21L
  const val LOOKBACK_DAYS = 14L

  private fun file(context: Context) = File(context.filesDir, FILE_NAME)

  /** Dia da última leitura, em memória: o serviço não abre o arquivo a cada verificação. */
  @Volatile
  private var snapshotDay: String? = null

  private fun load(context: Context): JSONObject =
    runCatching { JSONObject(file(context).readText(Charsets.UTF_8)) }.getOrNull()
      ?: JSONObject().put("days", JSONObject())

  private fun save(context: Context, store: JSONObject) {
    val target = file(context)
    val temp = File(target.parentFile, "$FILE_NAME.tmp")
    temp.writeText(store.toString(), Charsets.UTF_8)
    if (!temp.renameTo(target)) {
      target.delete()
      temp.renameTo(target)
    }
  }

  /** Apps de vídeos curtos da configuração: os únicos cujo uso fica guardado. */
  private fun targets(config: JSONObject): Set<String> {
    val rules = config.optJSONArray("moderationRules") ?: return emptySet()
    val result = HashSet<String>()
    for (i in 0 until rules.length()) {
      val ids = rules.getJSONObject(i).getJSONArray("targetIds")
      for (j in 0 until ids.length()) result.add(ids.getString(j))
    }
    return result
  }

  private fun dayJson(day: UsageDays.Day): JSONObject {
    val apps = JSONObject()
    for ((packageName, hours) in day.apps) apps.put(packageName, JSONArray(hours.toList()))
    return JSONObject().put("covered", day.covered).put("apps", apps)
  }

  /** Calcula e guarda os dias terminados que faltam. Devolve o armazém atualizado. */
  @Synchronized
  fun snapshot(context: Context, now: Long = System.currentTimeMillis()): JSONObject {
    val store = load(context)
    val config = ConfigStore.get(context) ?: return store
    if (!Permissions.hasUsageAccess(context)) return store
    val targets = targets(config)
    val zone = ZoneId.systemDefault()
    val today = UsageDays.dayOf(now, zone)
    val days = store.getJSONObject("days")

    val missing = (LOOKBACK_DAYS downTo 1L).map { today.minusDays(it) }.filter { !days.has(it.toString()) }
    if (targets.isNotEmpty() && missing.isNotEmpty()) {
      val from = missing.first().atStartOfDay(zone).toInstant().toEpochMilli() - UsageReader.LOOKBACK_MS
      val to = today.atStartOfDay(zone).toInstant().toEpochMilli()
      val events = UsageReader.readEvents(context, from, to)
      val computed = UsageDays.compute(events, missing, to, UsageReader.launcherPackages(context), targets, zone)
      for (day in computed) days.put(day.dayKey, dayJson(day))
    }

    // Só os últimos KEEP_DAYS dias.
    val oldest = today.minusDays(KEEP_DAYS).toString()
    days.keys().asSequence().toList().filter { it < oldest }.forEach { days.remove(it) }
    store.put("snapshotDay", today.toString())
    save(context, store)
    snapshotDay = today.toString()
    return store
  }

  /** Pelo serviço: uma vez por dia, guarda o dia que terminou (e os que faltarem). */
  fun onServiceCheck(context: Context, now: Long) {
    val today = UsageDays.dayOf(now, ZoneId.systemDefault()).toString()
    if (snapshotDay == today) return
    if (load(context).optString("snapshotDay") == today) {
      snapshotDay = today
      return
    }
    snapshot(context, now)
  }

  /**
   * Os dias guardados a partir de `fromDayKey` e o de hoje até agora, em JSON:
   * `{"today": "AAAA-MM-DD", "days": [{"dayKey", "covered", "apps": {pacote: [24 segundos]}}]}`.
   */
  @Synchronized
  fun historyJson(context: Context, fromDayKey: String, now: Long = System.currentTimeMillis()): String {
    val store = snapshot(context, now)
    val zone = ZoneId.systemDefault()
    val today = UsageDays.dayOf(now, zone)
    val days = store.getJSONObject("days")
    val result = JSONArray()
    for (key in days.keys().asSequence().toList().sorted()) {
      if (key >= fromDayKey && key < today.toString()) result.put(JSONObject(days.getJSONObject(key).toString()).put("dayKey", key))
    }
    val config = ConfigStore.get(context)
    if (config != null && today.toString() >= fromDayKey) {
      val dayStart = today.atStartOfDay(zone).toInstant().toEpochMilli()
      val events = UsageReader.readEvents(context, dayStart - UsageReader.LOOKBACK_MS, now)
      val live = UsageDays.compute(events, listOf(today), now, UsageReader.launcherPackages(context), targets(config), zone)
      result.put(dayJson(live.first()).put("dayKey", today.toString()))
    }
    return JSONObject().put("today", today.toString()).put("days", result).toString()
  }

  /** "Apagar meus dados" (spec 04, 5.13). */
  @Synchronized
  fun clear(context: Context) {
    file(context).delete()
    snapshotDay = null
  }
}
