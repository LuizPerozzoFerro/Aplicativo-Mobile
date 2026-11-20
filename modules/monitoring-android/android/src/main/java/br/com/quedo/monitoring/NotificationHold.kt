package br.com.quedo.monitoring

import android.content.Context
import org.json.JSONObject

/**
 * Notificação neutra enquanto o aparelho está bloqueado (decisão de 20/11/2026,
 * M12). Com "mostrar conteúdo" na tela bloqueada, o Android ignora a versão
 * pública e mostra o texto completo. Por isso, bloqueado, o app publica a versão
 * neutra como conteúdo principal e guarda como refazer a completa; depois do
 * desbloqueio, troca, sem tocar de novo.
 *
 * Sem nada do Android além do org.json (testada em JUnit).
 */
object NotificationHold {
  /** Bloqueado e não é a troca pela completa: publica a neutra e guarda. */
  fun shouldHold(locked: Boolean, revealing: Boolean): Boolean = locked && !revealing

  data class Decision(
    /** Ainda na barra e já desbloqueado: troca pela completa. */
    val reveal: List<Int>,
    /** Não está mais na barra (respondida, apagada, removida à meia-noite): esquece. */
    val forget: List<Int>,
  )

  fun decide(held: Set<Int>, locked: Boolean, active: Set<Int>): Decision {
    val forget = held.filter { it !in active }.sorted()
    val reveal = if (locked) emptyList() else held.filter { it in active }.sorted()
    return Decision(reveal, forget)
  }

  /** Como refazer a completa: o tipo, o que muda de uma para outra e quando saiu. */
  data class Spec(
    val kind: String,
    val postedAt: Long,
    val target: String? = null,
    val compulsionId: Int? = null,
    val body: String? = null,
  ) {
    fun toJson(): JSONObject = JSONObject()
      .put("kind", kind)
      .put("postedAt", postedAt)
      .put("target", target ?: JSONObject.NULL)
      .put("compulsionId", compulsionId ?: JSONObject.NULL)
      .put("body", body ?: JSONObject.NULL)

    companion object {
      fun fromJson(json: JSONObject) = Spec(
        kind = json.getString("kind"),
        postedAt = json.getLong("postedAt"),
        target = if (json.isNull("target")) null else json.getString("target"),
        compulsionId = if (json.isNull("compulsionId")) null else json.getInt("compulsionId"),
        body = if (json.isNull("body")) null else json.getString("body"),
      )
    }
  }
}

/**
 * As notificações publicadas neutras, à espera do desbloqueio. Em disco: o
 * processo pode morrer entre a publicação e o desbloqueio. Nada aqui escreve
 * no `logcat` (spec 03, 5.11).
 */
object HeldNotifications {
  private const val PREFS = "quedo-monitoring-held"

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Synchronized
  fun save(context: Context, id: Int, spec: NotificationHold.Spec) {
    prefs(context).edit().putString(id.toString(), spec.toJson().toString()).apply()
  }

  @Synchronized
  fun remove(context: Context, id: Int) {
    prefs(context).edit().remove(id.toString()).apply()
  }

  @Synchronized
  fun all(context: Context): Map<Int, NotificationHold.Spec> =
    prefs(context).all.mapNotNull { (key, value) ->
      val id = key.toIntOrNull() ?: return@mapNotNull null
      val spec = runCatching { NotificationHold.Spec.fromJson(JSONObject(value as String)) }.getOrNull()
        ?: return@mapNotNull null
      id to spec
    }.toMap()

  @Synchronized
  fun clear(context: Context) {
    prefs(context).edit().clear().apply()
  }
}
