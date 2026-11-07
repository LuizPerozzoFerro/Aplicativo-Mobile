package br.com.quedo.monitoring

import android.content.Context
import java.io.File
import java.time.Instant
import java.time.ZoneId

/**
 * O `EventLog` do app, no armazenamento privado (fora do backup, como o
 * resto). Os tipos e campos são os de `MonitoringEvent` em
 * src/monitoring/types.ts; o JS confere cada evento antes de importar.
 */
object EventStore {
  private const val FILE_NAME = "quedo-monitoring-events.jsonl"

  @Volatile
  private var log: EventLog? = null

  private fun log(context: Context): EventLog =
    log ?: synchronized(this) {
      log ?: EventLog(File(context.applicationContext.filesDir, FILE_NAME)).also { log = it }
    }

  fun append(context: Context, type: String, fields: Map<String, Any?> = emptyMap()): String {
    val now = System.currentTimeMillis()
    val dayKey = Instant.ofEpochMilli(now).atZone(ZoneId.systemDefault()).toLocalDate().toString()
    return log(context).append(type, now, dayKey, fields)
  }

  fun pendingJson(context: Context): String = log(context).pendingJson()

  fun acknowledge(context: Context, ids: Collection<String>) = log(context).acknowledge(ids)

  fun count(context: Context): Int = log(context).count()

  fun clear(context: Context) = log(context).clear()
}
