package br.com.quedo.monitoring

import android.app.AlarmManager
import android.app.KeyguardManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.PowerManager
import java.time.Instant
import java.time.ZoneId
import org.json.JSONObject

/**
 * Lembretes e avisos no aparelho (spec 03, 5.4). Funciona sem o serviço e sem o
 * acesso ao uso: check-in, preventivas e recomeço dependem só do alarme.
 *
 * Alarmes inexatos (ver `scheduleAlarms`), sem alarme exato (política do Google
 * Play). Os alarmes somem ao reiniciar, e por isso `run` é chamado no boot.
 *
 * Nada aqui escreve no `logcat` (spec 03, 5.11).
 */
object NotificationCenter {
  private const val PREFS = "quedo-monitoring-notifications"
  private const val KEY_STATE = "state"
  private const val KEY_NEXT_WAKE = "nextWake"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun load(context: Context): NotificationPlan.State =
    prefs(context).getString(KEY_STATE, null)
      ?.let { runCatching { NotificationPlan.State.fromJson(JSONObject(it)) }.getOrNull() }
      ?: NotificationPlan.State()

  private fun save(context: Context, state: NotificationPlan.State) {
    prefs(context).edit().putString(KEY_STATE, state.toJson().toString()).apply()
  }

  private const val ALARM_IDLE = 0
  private const val ALARM_WINDOW = 1

  /** O sistema trata janelas menores como 10 minutos. */
  private const val ALARM_WINDOW_MS = 10 * 60_000L

  private fun alarmIntent(context: Context, requestCode: Int): PendingIntent =
    PendingIntent.getBroadcast(
      context,
      requestCode,
      Intent(context, NotificationAlarmReceiver::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  private fun alarms(context: Context) =
    context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun cancelAlarms(context: Context) {
    alarms(context).cancel(alarmIntent(context, ALARM_IDLE))
    alarms(context).cancel(alarmIntent(context, ALARM_WINDOW))
  }

  /**
   * Dois alarmes inexatos para o mesmo instante; o primeiro que disparar faz o
   * trabalho e reagenda os dois. Sozinho, o `setAndAllowWhileIdle` recebe uma
   * janela de até 1 hora quando o horário está distante (visto no S22, em
   * `dumpsys alarm`), acima da tolerância de 15 minutos da spec. O `setWindow`
   * garante 10 minutos no uso normal, e o `setAndAllowWhileIdle` cobre a
   * economia profunda, onde o outro não dispara.
   */
  private fun scheduleAlarms(context: Context, at: Long) {
    val manager = alarms(context)
    manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, alarmIntent(context, ALARM_IDLE))
    manager.setWindow(AlarmManager.RTC_WAKEUP, at, ALARM_WINDOW_MS, alarmIntent(context, ALARM_WINDOW))
  }

  private fun recordSent(context: Context, kind: String) {
    EventStore.append(context, "notification_sent", mapOf("kind" to kind))
  }

  /** Celular em uso: tela acesa e sem bloqueio. */
  private fun inUse(context: Context): Boolean {
    val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    return power.isInteractive && !keyguard.isKeyguardLocked
  }

  /** Sem serviço rodando para perceber o desbloqueio, o recomeço sai às 9h (spec 03, 5.4). */
  private fun canWaitForUnlock(context: Context): Boolean =
    MonitoringState.isActive(context) && Permissions.hasUsageAccess(context)

  private fun preventiveBody(config: JSONObject, minutes: Int, now: Long): String {
    val copy = config.getJSONObject("texts").getJSONObject("notifications").getJSONObject("preventive")
    val byEmotion = copy.getJSONObject("byEmotion")
    val bodies = ArrayList<String>()
    bodies.add(copy.getString("generic"))
    val emotions = config.getJSONObject("preventive").getJSONArray("emotions")
    for (i in 0 until emotions.length()) byEmotion.optString(emotions.getString(i)).takeIf { it.isNotEmpty() }?.let { bodies.add(it) }
    if (!config.isNull("motivation")) {
      bodies.add(copy.getString("withMotivation").replace("{motivation}", config.getString("motivation")))
    }
    val day = Instant.ofEpochMilli(now).atZone(ZoneId.systemDefault()).dayOfYear
    return bodies[(day + minutes).mod(bodies.size)]
  }

  /** Confere o que está vencido, envia e agenda o próximo alarme. */
  @Synchronized
  fun run(context: Context, now: Long = System.currentTimeMillis()) {
    val configJson = ConfigStore.get(context)
    if (configJson == null) {
      cancelAlarms(context)
      return
    }
    Notifier.ensureChannels(context)
    val zone = ZoneId.systemDefault()
    val plan = NotificationPlan.configFrom(configJson)
    val state = load(context)

    // Check-in não respondido sai à meia-noite (spec 03, 5.4).
    if (NotificationPlan.enterDay(state, now, zone)) {
      Notifier.cancel(context, Notifier.CHECK_IN_NOTIFICATION_ID)
    }
    // Respondido no app depois de a notificação sair.
    if (plan.checkIn?.answeredDayKey == state.dayKey) {
      Notifier.cancel(context, Notifier.CHECK_IN_NOTIFICATION_ID)
    }

    if (Notifier.canPost(context)) {
      for (item in NotificationPlan.due(plan, state, now, zone)) {
        when (item) {
          NotificationPlan.Item.CheckInDue -> {
            Notifier.sendCheckIn(context, configJson, requireNotNull(plan.checkIn).compulsionId)
            recordSent(context, "check_in")
          }

          NotificationPlan.Item.Restart -> {
            if (canWaitForUnlock(context) && !inUse(context)) {
              state.restartWaiting = true
              continue
            }
            Notifier.sendRestart(context, configJson)
            recordSent(context, "restart")
          }

          is NotificationPlan.Item.Preventive -> {
            Notifier.sendPreventive(context, configJson, preventiveBody(configJson, item.minutes, now))
            recordSent(context, "preventive")
          }
        }
        NotificationPlan.markSent(state, item)
      }
    }

    save(context, state)
    val next = NotificationPlan.nextWake(plan, state, now, zone)
    prefs(context).edit().putLong(KEY_NEXT_WAKE, next).apply()
    scheduleAlarms(context, next)
  }

  /** A cada verificação do serviço: o recomeço esperando o desbloqueio. */
  @Synchronized
  fun onServiceCheck(context: Context) {
    if (load(context).restartWaiting && inUse(context)) run(context)
  }

  private fun scheduleRestartIfHadStreak(context: Context, config: JSONObject, compulsionId: Int) {
    val today = DayBoundary.dayKey(System.currentTimeMillis())
    val compulsions = config.getJSONArray("compulsions")
    val base = (0 until compulsions.length())
      .map { compulsions.getJSONObject(it) }
      .firstOrNull { it.getInt("id") == compulsionId }
      ?.getString("streakBaseDayKey") ?: return
    if (!NotificationPlan.hadStreak(base, today)) return
    val state = load(context)
    state.nativeRestartDays.add(NotificationPlan.nextDay(today))
    save(context, state)
  }

  /** Resposta dada na própria notificação, sem abrir o app. */
  @Synchronized
  fun answerCheckIn(context: Context, compulsionId: Int, answer: String) {
    val config = ConfigStore.get(context) ?: return
    EventStore.append(
      context,
      "check_in_answered",
      mapOf("compulsionId" to compulsionId, "answer" to answer),
    )
    val state = load(context)
    NotificationPlan.enterDay(state, System.currentTimeMillis(), ZoneId.systemDefault())
    state.checkInAnswered = true
    save(context, state)
    Notifier.cancel(context, Notifier.CHECK_IN_NOTIFICATION_ID)
    if (answer == "relapse") scheduleRestartIfHadStreak(context, config, compulsionId)
    run(context)
  }

  /** Dia reprovado na tela de interrupção: pode haver recomeço amanhã. */
  @Synchronized
  fun onDayFailed(context: Context, compulsionId: Int) {
    val config = ConfigStore.get(context) ?: return
    scheduleRestartIfHadStreak(context, config, compulsionId)
    run(context)
  }

  /** Aviso de limite: fora do limite de 6 por dia (spec 03, 5.4). */
  fun notifyLimit(context: Context, config: JSONObject, target: String?) {
    if (!Notifier.canPost(context)) return
    Notifier.ensureChannels(context)
    Notifier.sendLimit(context, config, target)
    recordSent(context, if (target == null) "limit" else "risk_app")
  }

  /** Proteção pausada: no máximo uma por dia por motivo. Quem chama é a vigilância (passo 7). */
  @Synchronized
  fun notifyProtectionPaused(context: Context, reason: String) {
    val config = ConfigStore.get(context) ?: return
    if (!Notifier.canPost(context)) return
    val state = load(context)
    NotificationPlan.enterDay(state, System.currentTimeMillis(), ZoneId.systemDefault())
    if (!state.protectionReasons.add(reason)) return
    save(context, state)
    Notifier.ensureChannels(context)
    Notifier.sendProtectionPaused(context, config)
    recordSent(context, "protection_paused")
  }

  /** Ferramenta de teste (spec 03, 5.10): dispara agora, fora das regras. Só em build depurável. */
  @Synchronized
  fun debugFire(context: Context, kind: String) {
    if (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE == 0) return
    val config = ConfigStore.get(context) ?: return
    Notifier.ensureChannels(context)
    val now = System.currentTimeMillis()
    when (kind) {
      "limit" -> Notifier.sendLimit(context, config, null)
      "risk_app" -> Notifier.sendLimit(context, config, "debug")
      "check_in" -> {
        val id = NotificationPlan.configFrom(config).checkIn?.compulsionId ?: return
        Notifier.sendCheckIn(context, config, id)
      }

      "preventive" -> Notifier.sendPreventive(context, config, preventiveBody(config, now.toInt().mod(1440), now))
      "restart" -> Notifier.sendRestart(context, config)
      "protection_paused" -> Notifier.sendProtectionPaused(context, config)
    }
  }

  /** O estado de hoje, em JSON, para a tela de desenvolvimento. */
  @Synchronized
  fun statusJson(context: Context): String = JSONObject()
    .put("state", load(context).toJson())
    .put("nextWake", prefs(context).getLong(KEY_NEXT_WAKE, 0L).takeIf { it > 0L } ?: JSONObject.NULL)
    .toString()

  @Synchronized
  fun clear(context: Context) {
    cancelAlarms(context)
    prefs(context).edit().clear().commit()
  }
}

/** O alarme do próximo lembrete. */
class NotificationAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    NotificationCenter.run(context)
  }
}

/** Ações da notificação de check-in, respondidas sem abrir o app. */
class NotificationActionReceiver : BroadcastReceiver() {
  companion object {
    const val ACTION_CHECK_IN = "br.com.quedo.monitoring.CHECK_IN"
    const val EXTRA_COMPULSION = "compulsionId"
    const val EXTRA_ANSWER = "answer"
  }

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_CHECK_IN) return
    val compulsionId = intent.getIntExtra(EXTRA_COMPULSION, -1)
    val answer = intent.getStringExtra(EXTRA_ANSWER) ?: return
    if (compulsionId > 0) NotificationCenter.answerCheckIn(context, compulsionId, answer)
  }
}
