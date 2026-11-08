package br.com.quedo.monitoring

import org.json.JSONArray
import org.json.JSONObject

/**
 * Acúmulo incremental do uso (correção obrigatória do doc 02, 4.1): cada
 * verificação lê só os eventos novos do `UsageStatsManager`, em vez de reler o
 * dia inteiro. Sem nada do Android além do org.json, para os testes JUnit, e
 * inteiro num JSON, porque o processo pode morrer a qualquer momento (I-31).
 *
 * - **Regra do STOPPED pendente (A1):** o STOPPED de uma instância pode chegar
 *   depois que outra já voltou ao primeiro plano; só fecha o intervalo se não
 *   for o par de um PAUSED já contado.
 * - **Tela apagada** fecha tudo.
 * - **Borda do dia explícita:** todo crédito é cortado em `[dayStart, now]`, e
 *   os totais zeram quando o dia muda.
 * - **Sem lançadores** (I-8).
 * - **Tempo diante da tela de interrupção** não conta (`suspend`/`resume`).
 * - **Eventos atrasados:** cada leitura repete os últimos `OVERLAP_MS`, e as
 *   impressões digitais evitam contar o mesmo evento duas vezes. Sem isso, um
 *   PAUSED que chegasse logo depois da leitura se perderia, e o app contaria
 *   como aberto até a tela apagar.
 */
class UsageAccumulator(cursor: Long, dayStart: Long) {

  companion object {
    const val OVERLAP_MS = 10_000L

    fun fromJson(json: JSONObject): UsageAccumulator {
      val usage = UsageAccumulator(json.getLong("cursor"), json.getLong("dayStart"))
      val totals = json.getJSONObject("totals")
      for (key in totals.keys()) usage.totals[key] = totals.getLong(key)
      val open = json.getJSONObject("open")
      for (key in open.keys()) {
        val item = open.getJSONObject(key)
        usage.open[key] = Open(item.getString("packageName"), item.getLong("openedAt"), item.getLong("creditedUntil"))
      }
      val stops = json.getJSONObject("pendingStops")
      for (key in stops.keys()) usage.pendingStops[key] = stops.getInt(key)
      val seen = json.getJSONObject("seen")
      for (key in seen.keys()) usage.seen[key] = seen.getLong(key)
      val spans = json.getJSONArray("suspended")
      for (index in 0 until spans.length()) {
        val span = spans.getJSONObject(index)
        usage.suspended.add(Span(span.getLong("from"), if (span.isNull("to")) null else span.getLong("to")))
      }
      return usage
    }
  }

  private class Open(val packageName: String, val openedAt: Long, var creditedUntil: Long)

  private class Span(val from: Long, var to: Long?)

  /** Até onde os eventos já foram lidos. */
  var cursor: Long = cursor
    private set
  private var dayStart: Long = dayStart

  private val totals = HashMap<String, Long>()
  private val open = HashMap<String, Open>()
  private val pendingStops = HashMap<String, Int>()
  private val seen = HashMap<String, Long>()
  private val suspended = ArrayList<Span>()

  /** Milissegundos de uso hoje, por pacote. */
  fun totals(): Map<String, Long> = totals.filterValues { it > 0L }

  /** O app na frente: o intervalo aberto mais recente. */
  fun foreground(): String? = open.values.maxByOrNull { it.openedAt }?.packageName

  /** De onde a próxima leitura de eventos deve começar. */
  fun readFrom(): Long = cursor - OVERLAP_MS

  /** A tela de interrupção apareceu: daqui em diante, nada conta como uso. */
  fun suspend(at: Long) {
    if (suspended.lastOrNull()?.to == null && suspended.isNotEmpty()) return
    suspended.add(Span(at, null))
  }

  /** A tela de interrupção saiu. */
  fun resume(at: Long) {
    suspended.lastOrNull()?.takeIf { it.to == null }?.to = at
  }

  private fun creditable(from: Long, to: Long, now: Long): Long {
    val start = maxOf(from, dayStart)
    val end = minOf(to, now)
    if (end <= start) return 0L
    var amount = end - start
    for (span in suspended) {
      val overlapStart = maxOf(start, span.from)
      val overlapEnd = minOf(end, span.to ?: Long.MAX_VALUE)
      if (overlapEnd > overlapStart) amount -= overlapEnd - overlapStart
    }
    return amount
  }

  private fun credit(item: Open, to: Long, now: Long) {
    if (to <= item.creditedUntil) return
    val amount = creditable(item.creditedUntil, to, now)
    if (amount > 0L) totals[item.packageName] = (totals[item.packageName] ?: 0L) + amount
    item.creditedUntil = to
  }

  private fun close(key: String, at: Long, now: Long) {
    val item = open.remove(key) ?: return
    credit(item, at, now)
  }

  /**
   * Processa os eventos lidos desde `readFrom()` (em ordem cronológica) e
   * credita os apps abertos até `now`.
   */
  fun advance(
    events: Iterable<UsageTimeline.Event>,
    now: Long,
    dayStart: Long,
    excluded: Set<String>,
  ) {
    if (dayStart != this.dayStart) {
      this.dayStart = dayStart
      totals.clear()
    }

    for (event in events) {
      val fingerprint = "${event.timestamp}|${event.kind}|${event.packageName}|${event.className}"
      if (seen.containsKey(fingerprint)) continue
      seen[fingerprint] = event.timestamp

      if (event.kind == UsageTimeline.Kind.SCREEN_OFF) {
        open.keys.toList().forEach { close(it, event.timestamp, now) }
        continue
      }
      val packageName = event.packageName ?: continue
      if (packageName in excluded) continue
      val key = "$packageName|${event.className.orEmpty()}"

      when (event.kind) {
        UsageTimeline.Kind.RESUMED ->
          if (key !in open) open[key] = Open(packageName, event.timestamp, event.timestamp)

        UsageTimeline.Kind.PAUSED -> {
          close(key, event.timestamp, now)
          pendingStops[key] = (pendingStops[key] ?: 0) + 1
        }

        UsageTimeline.Kind.STOPPED -> {
          val pending = pendingStops[key] ?: 0
          if (pending > 0) {
            // Par de um PAUSED já contado.
            if (pending == 1) pendingStops.remove(key) else pendingStops[key] = pending - 1
          } else {
            // STOPPED sem PAUSED: o app foi morto. Único sinal do fim do uso.
            close(key, event.timestamp, now)
          }
        }

        UsageTimeline.Kind.SCREEN_OFF -> Unit
      }
    }

    open.values.forEach { credit(it, now, now) }

    cursor = now
    val horizon = now - 2 * OVERLAP_MS
    seen.values.removeAll { it < horizon }
    // Trechos de tela já encerrados, que nenhum intervalo aberto alcança mais.
    val oldestOpen = open.values.minOfOrNull { it.creditedUntil } ?: now
    suspended.removeAll { span -> span.to?.let { it < oldestOpen && it < horizon } ?: false }
  }

  fun toJson(): JSONObject {
    val totalsJson = JSONObject()
    for ((key, value) in totals) totalsJson.put(key, value)
    val openJson = JSONObject()
    for ((key, item) in open) {
      openJson.put(
        key,
        JSONObject()
          .put("packageName", item.packageName)
          .put("openedAt", item.openedAt)
          .put("creditedUntil", item.creditedUntil),
      )
    }
    val stopsJson = JSONObject()
    for ((key, value) in pendingStops) stopsJson.put(key, value)
    val seenJson = JSONObject()
    for ((key, value) in seen) seenJson.put(key, value)
    val spans = JSONArray()
    for (span in suspended) {
      spans.put(JSONObject().put("from", span.from).put("to", span.to ?: JSONObject.NULL))
    }
    return JSONObject()
      .put("cursor", cursor)
      .put("dayStart", dayStart)
      .put("totals", totalsJson)
      .put("open", openJson)
      .put("pendingStops", stopsJson)
      .put("seen", seenJson)
      .put("suspended", spans)
  }
}
