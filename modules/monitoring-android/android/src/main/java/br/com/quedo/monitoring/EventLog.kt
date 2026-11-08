package br.com.quedo.monitoring

import java.io.File
import java.util.UUID
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/**
 * Eventos do monitoramento em disco (spec 03, seção 4.3): um JSON por linha,
 * cada um com identificador único. O JS lê, grava no banco de forma
 * idempotente e só então confirma; só os confirmados saem do arquivo.
 *
 * Sem nada do Android, para os testes JUnit: o arquivo vem de fora
 * (`EventStore` usa o armazenamento privado do app). Todas as operações são
 * sincronizadas: o serviço, os receptores e o módulo gravam do mesmo processo,
 * em threads diferentes.
 */
class EventLog(private val file: File, private val maxEvents: Int = MAX_EVENTS) {

  companion object {
    /**
     * Teto do arquivo. Sem o JS abrir o app por muito tempo, os mais antigos
     * saem primeiro. Com as regras da spec, um dia normal gera algumas dezenas.
     * Os de `STREAK_EVENT_TYPES` não saem nunca: só eles podem passar do teto.
     */
    const val MAX_EVENTS = 2000

    /**
     * Eventos que mudam a streak: perder um deles mudaria a contagem do
     * usuário sem aviso (pedido do responsável, 08/11/2026). No máximo alguns
     * por dia, então o arquivo não cresce sem limite na prática.
     */
    val STREAK_EVENT_TYPES = setOf("day_failed", "check_in_answered")
  }

  /** Grava um evento e devolve o id. `fields` não pode ter id, at, dayKey nem type. */
  @Synchronized
  fun append(type: String, at: Long, dayKey: String, fields: Map<String, Any?> = emptyMap()): String {
    val id = UUID.randomUUID().toString()
    val event = JSONObject()
      .put("id", id)
      .put("at", at)
      .put("dayKey", dayKey)
      .put("type", type)
    for ((key, value) in fields) event.put(key, value ?: JSONObject.NULL)

    write(withinCeiling(readLines() + event.toString()))
    return id
  }

  /** Acima do teto, saem os mais antigos, pulando os que mudam a streak. */
  private fun withinCeiling(lines: List<String>): List<String> {
    var excess = lines.size - maxEvents
    if (excess <= 0) return lines
    return lines.filter { line ->
      val drop = excess > 0 && parse(line)?.optString("type") !in STREAK_EVENT_TYPES
      if (drop) excess -= 1
      !drop
    }
  }

  /** Todos os eventos ainda não confirmados, como uma lista JSON, do mais antigo ao mais novo. */
  @Synchronized
  fun pendingJson(): String {
    val array = JSONArray()
    for (line in readLines()) parse(line)?.let { array.put(it) }
    return array.toString()
  }

  /** Apaga os confirmados. Linhas ilegíveis também saem: o JS nunca conseguiria confirmá-las. */
  @Synchronized
  fun acknowledge(ids: Collection<String>) {
    if (!file.exists()) return
    val remove = ids.toSet()
    write(readLines().filter { line -> parse(line)?.optString("id")?.let { it !in remove } ?: false })
  }

  @Synchronized
  fun count(): Int = readLines().count { parse(it) != null }

  @Synchronized
  fun clear() {
    file.delete()
  }

  private fun parse(line: String): JSONObject? =
    try {
      JSONObject(line).takeIf { it.optString("id").isNotEmpty() }
    } catch (error: JSONException) {
      null
    }

  private fun readLines(): List<String> =
    if (file.exists()) file.readLines(Charsets.UTF_8).filter { it.isNotBlank() } else emptyList()

  /** Escreve num arquivo temporário e troca: uma morte no meio não deixa o arquivo pela metade. */
  private fun write(lines: List<String>) {
    file.parentFile?.mkdirs()
    val temporary = File(file.parentFile, "${file.name}.tmp")
    temporary.writeText(lines.joinToString(separator = "\n", postfix = if (lines.isEmpty()) "" else "\n"), Charsets.UTF_8)
    if (!temporary.renameTo(file)) {
      file.delete()
      temporary.renameTo(file)
    }
  }
}
