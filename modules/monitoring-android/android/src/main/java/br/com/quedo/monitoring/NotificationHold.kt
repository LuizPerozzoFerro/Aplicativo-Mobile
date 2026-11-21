package br.com.quedo.monitoring

import android.content.Context
import org.json.JSONObject

/**
 * Notificação neutra na tela bloqueada (decisão de 20/11/2026, M12). Com
 * "mostrar conteúdo" na tela bloqueada, o Android ignora a versão pública e
 * mostra o texto completo. Por isso o app troca o próprio conteúdo:
 *
 * - o que chega com o aparelho bloqueado sai neutro;
 * - o que estava na barra vira neutro quando a tela apaga (serviço ligado);
 * - no desbloqueio, tudo volta à versão completa, sem tocar de novo.
 *
 * Sem nada do Android além do org.json (testada em JUnit).
 */
object NotificationHold {
  enum class Mode {
    /** Notificação nova. */
    NEW,

    /** A tela apagou: a que estava completa vira neutra, em silêncio. */
    HIDE,

    /** Desbloqueio: a neutra vira completa, em silêncio. */
    REVEAL,
  }

  fun shouldHold(locked: Boolean, mode: Mode): Boolean =
    mode == Mode.HIDE || (mode == Mode.NEW && locked)

  enum class LockScreen {
    /** Aparece na tela bloqueada. */
    SHOWN,

    /** Não aparece na tela bloqueada, mesmo com "mostrar conteúdo" ligado. */
    HIDDEN,
  }

  /**
   * Decisão de 21/11/2026: a versão completa nunca aparece na tela bloqueada
   * (secreta); só a neutra aparece. Cobre o serviço parado, quando nada troca a
   * completa ao apagar a tela, e o instante entre apagar e trocar.
   */
  fun lockScreen(neutral: Boolean): LockScreen = if (neutral) LockScreen.SHOWN else LockScreen.HIDDEN

  data class Decision(
    /** Neutras ainda na barra, com o aparelho desbloqueado: viram completas. */
    val reveal: List<Int>,
    /** Não estão mais na barra (respondidas, apagadas, removidas à meia-noite): esquece. */
    val forget: List<Int>,
  )

  /** `posted`: id da notificação e se ela está neutra agora. */
  fun decide(posted: Map<Int, Boolean>, locked: Boolean, active: Set<Int>): Decision {
    val forget = posted.keys.filter { it !in active }.sorted()
    val reveal = if (locked) {
      emptyList()
    } else {
      posted.filter { (id, held) -> held && id in active }.keys.sorted()
    }
    return Decision(reveal, forget)
  }

  /** A tela apagou: as completas que ainda estão na barra viram neutras. */
  fun toHide(posted: Map<Int, Boolean>, active: Set<Int>): List<Int> =
    posted.filter { (id, held) -> !held && id in active }.keys.sorted()

  /** Como refazer a notificação: o tipo, o que muda de uma para outra e quando saiu. */
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
 * As notificações publicadas pelo app (menos a permanente), com o modo de
 * refazê-las e se estão neutras agora. Em disco: o processo pode morrer entre a
 * publicação e o desbloqueio. Nada aqui escreve no `logcat` (spec 03, 5.11).
 */
object PostedNotifications {
  private const val PREFS = "quedo-monitoring-held"

  data class Entry(val spec: NotificationHold.Spec, val held: Boolean)

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  @Synchronized
  fun save(context: Context, id: Int, spec: NotificationHold.Spec, held: Boolean) {
    val json = spec.toJson().put("held", held)
    prefs(context).edit().putString(id.toString(), json.toString()).apply()
  }

  @Synchronized
  fun remove(context: Context, id: Int) {
    prefs(context).edit().remove(id.toString()).apply()
  }

  @Synchronized
  fun all(context: Context): Map<Int, Entry> =
    prefs(context).all.mapNotNull { (key, value) ->
      val id = key.toIntOrNull() ?: return@mapNotNull null
      val json = runCatching { JSONObject(value as String) }.getOrNull() ?: return@mapNotNull null
      val spec = runCatching { NotificationHold.Spec.fromJson(json) }.getOrNull() ?: return@mapNotNull null
      id to Entry(spec, json.optBoolean("held"))
    }.toMap()

  @Synchronized
  fun clear(context: Context) {
    prefs(context).edit().clear().apply()
  }
}
