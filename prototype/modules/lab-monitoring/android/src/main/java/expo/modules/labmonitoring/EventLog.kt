package expo.modules.labmonitoring

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Log compartilhado do laboratorio (spec secao 5.3).
 *
 * Grava um evento por linha, em JSON, num arquivo dentro de filesDir. Como todo
 * componente do app roda sob o mesmo UID, qualquer parte nativa consegue escrever
 * aqui: o modulo, o servico em primeiro plano do A2 e a VPN local do A6. Essa e a
 * razao de existir deste arquivo -- sem Mac nem depurador nativo, o log na tela e
 * a unica evidencia que temos do que o codigo nativo fez.
 */
object EventLog {
  private const val FILE_NAME = "lab-events.jsonl"

  /** Teto para o arquivo nao crescer sem limite durante testes longos (A9, T6). */
  private const val MAX_EVENTS = 2000

  private val lock = Any()

  private fun logFile(context: Context) = File(context.filesDir, FILE_NAME)

  private fun nowIso(): String {
    val format = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US)
    format.timeZone = TimeZone.getDefault()
    return format.format(Date())
  }

  fun append(
    context: Context,
    source: String,
    experiment: String,
    event: String,
    details: String? = null
  ) {
    val entry = JSONObject()
      .put("timestamp", nowIso())
      .put("platform", "android")
      .put("source", source)
      .put("experiment", experiment)
      .put("event", event)

    if (details != null) {
      entry.put("details", details)
    }

    synchronized(lock) {
      runCatching { logFile(context).appendText(entry.toString() + "\n") }
    }
  }

  /** Devolve os eventos do mais recente para o mais antigo, prontos para a tela. */
  fun read(context: Context): List<Map<String, Any?>> = synchronized(lock) {
    val file = logFile(context)
    if (!file.exists()) {
      return emptyList()
    }

    return file.readLines()
      .filter { it.isNotBlank() }
      .takeLast(MAX_EVENTS)
      .mapNotNull { line -> runCatching { parseEntry(line) }.getOrNull() }
      .asReversed()
  }

  fun clear(context: Context) {
    synchronized(lock) {
      runCatching { logFile(context).delete() }
    }
  }

  private fun parseEntry(line: String): Map<String, Any?> {
    val json = JSONObject(line)
    return mapOf(
      "timestamp" to json.getString("timestamp"),
      "platform" to json.getString("platform"),
      "source" to json.getString("source"),
      "experiment" to json.getString("experiment"),
      "event" to json.getString("event"),
      "details" to if (json.has("details")) json.getString("details") else null
    )
  }
}
