package br.com.quedo.monitoring

import android.content.Context
import org.json.JSONObject

/**
 * Decide o que a vigilância faz (spec 03, 5.7; I-30), sem nada do Android além
 * do org.json (testada em JUnit).
 */
object ProtectionRules {
  const val USAGE_ACCESS = "usageAccess"
  const val NOTIFICATIONS = "notifications"
  const val OVERLAY = "overlay"
  const val SERVICE_STOPPED = "service_stopped"

  /** Sem verificação nem pedido para ligar neste tempo, o serviço parou. */
  const val STALL_MS = 5 * 60_000L

  data class Snapshot(val usageAccess: Boolean, val notifications: Boolean, val overlay: Boolean) {
    fun toJson(): JSONObject = JSONObject()
      .put(USAGE_ACCESS, usageAccess)
      .put(NOTIFICATIONS, notifications)
      .put(OVERLAY, overlay)

    companion object {
      fun fromJson(json: JSONObject) = Snapshot(
        json.getBoolean(USAGE_ACCESS),
        json.getBoolean(NOTIFICATIONS),
        json.getBoolean(OVERLAY),
      )
    }
  }

  data class Input(
    /** O que valia na última conferência; nulo na primeira. */
    val previous: Snapshot?,
    val current: Snapshot,
    /** Se o monitoramento deve estar ligado. */
    val active: Boolean,
    /** Se alguma regra usa a tela de interrupção. */
    val needsOverlay: Boolean,
    val running: Boolean,
    val lastCheckAt: Long,
    val startRequestedAt: Long,
    val now: Long,
  )

  data class Decision(
    /** Permissões que estavam concedidas e não estão mais: um evento para cada. */
    val lost: List<String>,
    /** Motivos de "proteção pausada". O limite de um por dia fica em `NotificationCenter`. */
    val pausedReasons: List<String>,
  )

  fun decide(input: Input): Decision {
    val previous = input.previous
    val current = input.current
    val lost = buildList {
      if (previous == null) return@buildList
      if (previous.usageAccess && !current.usageAccess) add(USAGE_ACCESS)
      if (previous.notifications && !current.notifications) add(NOTIFICATIONS)
      if (previous.overlay && !current.overlay) add(OVERLAY)
    }
    val reasons = buildList {
      if (!input.active) return@buildList
      if (USAGE_ACCESS in lost) add(USAGE_ACCESS)
      if (OVERLAY in lost && input.needsOverlay) add(OVERLAY)
      if (stalled(input)) add(SERVICE_STOPPED)
    }
    return Decision(lost, reasons)
  }

  /** Sem o acesso ao uso o motivo é a permissão, não o serviço. */
  private fun stalled(input: Input): Boolean {
    if (input.running || !input.current.usageAccess) return false
    return input.now - maxOf(input.lastCheckAt, input.startRequestedAt) >= STALL_MS
  }

  /** Alguma regra com tela? Moderação sempre; app de risco, só o declarado. */
  fun needsOverlay(config: JSONObject?): Boolean {
    if (config == null) return false
    if ((config.optJSONArray("moderationRules")?.length() ?: 0) > 0) return true
    val risk = config.optJSONArray("riskAppRules") ?: return false
    return (0 until risk.length()).any { risk.getJSONObject(it).optBoolean("interruption") }
  }
}

/**
 * Vigilância de permissões e do serviço. Roda a cada verificação do serviço, ao
 * abrir o app, no boot e nos alarmes (estes percebem o serviço parado, quando
 * ele não pode avisar sozinho). Nada aqui escreve no `logcat` (spec 03, 5.11).
 */
object ProtectionWatch {
  private const val PREFS = "quedo-monitoring-protection"
  private const val KEY_SNAPSHOT = "snapshot"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun load(context: Context): ProtectionRules.Snapshot? =
    prefs(context).getString(KEY_SNAPSHOT, null)
      ?.let { runCatching { ProtectionRules.Snapshot.fromJson(JSONObject(it)) }.getOrNull() }

  @Synchronized
  fun run(context: Context, now: Long = System.currentTimeMillis()) {
    val current = ProtectionRules.Snapshot(
      usageAccess = Permissions.hasUsageAccess(context),
      notifications = Permissions.notificationsEnabled(context),
      overlay = Permissions.canDrawOverlays(context),
    )
    val decision = ProtectionRules.decide(
      ProtectionRules.Input(
        previous = load(context),
        current = current,
        active = MonitoringState.isActive(context),
        needsOverlay = ProtectionRules.needsOverlay(ConfigStore.get(context)),
        running = MonitoringService.isRunning,
        lastCheckAt = MonitoringState.lastCheckAt(context),
        startRequestedAt = MonitoringState.startRequestedAt(context),
        now = now,
      ),
    )
    prefs(context).edit().putString(KEY_SNAPSHOT, current.toJson().toString()).apply()
    for (permission in decision.lost) {
      EventStore.append(context, "permission_lost", mapOf("permission" to permission))
    }
    for (reason in decision.pausedReasons) NotificationCenter.notifyProtectionPaused(context, reason)
  }

  @Synchronized
  fun clear(context: Context) {
    prefs(context).edit().clear().commit()
  }
}
