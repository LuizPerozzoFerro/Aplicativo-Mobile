package br.com.quedo.monitoring

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import org.json.JSONObject

/**
 * Canais e envio das notificações (spec 03, 5.4).
 *
 * Textos: os da configuração, vindos do i18n do JS (4.2). Os de `strings.xml`
 * são o mínimo neutro da notificação permanente, para quando ainda não há
 * configuração. Nenhum revela o tema (CLAUDE.md, seção 9): toda notificação tem
 * uma **versão pública** neutra para a tela bloqueada.
 *
 * A versão pública só vale com "ocultar conteúdo" na tela bloqueada. Para valer
 * em qualquer ajuste, com o aparelho bloqueado a notificação sai neutra e vira a
 * completa depois do desbloqueio (`NotificationHold`, M12).
 */
object Notifier {
  const val ONGOING_CHANNEL_ID = "monitoring"
  const val ALERTS_CHANNEL_ID = "alerts"
  const val REMINDERS_CHANNEL_ID = "reminders"

  const val ONGOING_NOTIFICATION_ID = 1001
  const val LIMIT_NOTIFICATION_ID = 1002
  const val PREVENTIVE_NOTIFICATION_ID = 1010
  const val CHECK_IN_NOTIFICATION_ID = 1011
  const val RESTART_NOTIFICATION_ID = 1012
  const val PROTECTION_NOTIFICATION_ID = 1020

  /** Um id por app de risco, para um aviso não substituir o de outro. */
  private const val RISK_NOTIFICATION_BASE = 3000
  private const val RISK_NOTIFICATION_RANGE = 1000

  private fun manager(context: Context) =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  /** Cria os canais, ou atualiza os nomes (o Android aceita trocar o nome de um canal existente). */
  fun ensureChannels(context: Context) {
    val manager = manager(context)
    manager.createNotificationChannel(
      NotificationChannel(
        ONGOING_CHANNEL_ID,
        ConfigStore.text(context, "channels", "tracking", R.string.quedo_monitoring_channel_name),
        NotificationManager.IMPORTANCE_LOW,
      ),
    )
    val texts = ConfigStore.get(context)?.getJSONObject("texts")?.getJSONObject("channels") ?: return
    manager.createNotificationChannel(
      NotificationChannel(ALERTS_CHANNEL_ID, texts.getString("alerts"), NotificationManager.IMPORTANCE_HIGH),
    )
    manager.createNotificationChannel(
      NotificationChannel(REMINDERS_CHANNEL_ID, texts.getString("reminders"), NotificationManager.IMPORTANCE_DEFAULT),
    )
  }

  fun ongoingNotification(context: Context): Notification {
    val builder = Notification.Builder(context, ONGOING_CHANNEL_ID)
      .setContentTitle(ConfigStore.text(context, "ongoing", "title", R.string.quedo_monitoring_ongoing_title))
      .setContentText(ConfigStore.text(context, "ongoing", "text", R.string.quedo_monitoring_ongoing_text))
      .setSmallIcon(R.drawable.quedo_ic_notification)
      .setOngoing(true)
      .setShowWhen(false)
    openApp(context)?.let { builder.setContentIntent(it) }
    return builder.build()
  }

  /** Depois de uma configuração nova: canais e notificação permanente com os textos novos. */
  fun refresh(context: Context) {
    ensureChannels(context)
    if (MonitoringService.isRunning) {
      manager(context).notify(ONGOING_NOTIFICATION_ID, ongoingNotification(context))
    }
    revealHeld(context)
  }

  fun cancel(context: Context, id: Int) {
    manager(context).cancel(id)
    HeldNotifications.remove(context, id)
  }

  fun cancelAll(context: Context) {
    manager(context).cancelAll()
    HeldNotifications.clear(context)
  }

  private fun isLocked(context: Context): Boolean =
    (context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked

  /** O mesmo que a versão pública, como conteúdo principal e sem ações. */
  private fun neutral(
    context: Context,
    channel: String,
    texts: JSONObject,
    contentIntent: PendingIntent?,
    postedAt: Long,
  ): Notification.Builder {
    val public = texts.getJSONObject("public")
    val builder = Notification.Builder(context, channel)
      .setContentTitle(public.getString("title"))
      .setContentText(public.getString("text"))
      .setSmallIcon(R.drawable.quedo_ic_notification)
      .setAutoCancel(true)
      .setWhen(postedAt)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
    contentIntent?.let { builder.setContentIntent(it) }
    return builder
  }

  /** Bloqueado: a neutra, e guarda como refazer. Senão, a completa (sem tocar de novo, se for a troca). */
  private fun publish(
    context: Context,
    id: Int,
    channel: String,
    texts: JSONObject,
    full: Notification.Builder,
    contentIntent: PendingIntent?,
    spec: NotificationHold.Spec,
    revealing: Boolean,
  ) {
    if (NotificationHold.shouldHold(isLocked(context), revealing)) {
      manager(context).notify(id, neutral(context, channel, texts, contentIntent, spec.postedAt).build())
      HeldNotifications.save(context, id, spec)
      return
    }
    full.setWhen(spec.postedAt)
    if (revealing) full.setOnlyAlertOnce(true)
    manager(context).notify(id, full.build())
    HeldNotifications.remove(context, id)
  }

  /** Depois do desbloqueio: as neutras que ainda estão na barra viram as completas. */
  @Synchronized
  fun revealHeld(context: Context) {
    val held = HeldNotifications.all(context)
    if (held.isEmpty()) return
    val active = manager(context).activeNotifications.map { it.id }.toSet()
    val decision = NotificationHold.decide(held.keys, isLocked(context), active)
    decision.forget.forEach { HeldNotifications.remove(context, it) }
    if (decision.reveal.isEmpty()) return
    val config = ConfigStore.get(context) ?: return
    for (id in decision.reveal) {
      val spec = held.getValue(id)
      when (spec.kind) {
        "limit" -> sendLimit(context, config, null, spec.postedAt, revealing = true)
        "riskApp" -> sendLimit(context, config, spec.target, spec.postedAt, revealing = true)
        "checkIn" -> spec.compulsionId?.let { sendCheckIn(context, config, it, spec.postedAt, revealing = true) }
        "preventive" -> spec.body?.let { sendPreventive(context, config, it, id, spec.postedAt, revealing = true) }
        "restart" -> sendRestart(context, config, spec.postedAt, revealing = true)
        "protectionPaused" -> sendProtectionPaused(context, config, spec.postedAt, revealing = true)
        else -> HeldNotifications.remove(context, id)
      }
    }
  }

  fun canPost(context: Context): Boolean = Permissions.notificationsEnabled(context)

  private fun openApp(context: Context, requestCode: Int = 0): PendingIntent? =
    context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
      PendingIntent.getActivity(
        context,
        requestCode,
        it,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

  private fun openLink(context: Context, link: String, requestCode: Int): PendingIntent =
    PendingIntent.getActivity(
      context,
      requestCode,
      Intent(Intent.ACTION_VIEW, Uri.parse(link)).setPackage(context.packageName),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  private fun base(
    context: Context,
    channel: String,
    texts: JSONObject,
    title: String,
    text: String,
    autoCancel: Boolean = true,
  ): Notification.Builder {
    val public = texts.getJSONObject("public")
    return Notification.Builder(context, channel)
      .setContentTitle(title)
      .setContentText(text)
      .setStyle(Notification.BigTextStyle().bigText(text))
      .setSmallIcon(R.drawable.quedo_ic_notification)
      .setAutoCancel(autoCancel)
      .setVisibility(Notification.VISIBILITY_PRIVATE)
      .setPublicVersion(
        Notification.Builder(context, channel)
          .setContentTitle(public.getString("title"))
          .setContentText(public.getString("text"))
          .setSmallIcon(R.drawable.quedo_ic_notification)
          .build(),
      )
  }

  /**
   * "Emergência" abre a rota direto: uma ação de notificação não pode abrir
   * tela a partir de um receptor (Android 12).
   */
  private fun Notification.Builder.withEmergency(context: Context, config: JSONObject, requestCode: Int) = apply {
    val link = config.getJSONObject("links").getString("emergencyFromNotification")
    val label = notifications(config).getString("emergencyAction")
    addAction(Notification.Action.Builder(null, label, openLink(context, link, requestCode)).build())
  }

  private fun notifications(config: JSONObject) =
    config.getJSONObject("texts").getJSONObject("notifications")

  fun sendLimit(
    context: Context,
    config: JSONObject,
    target: String?,
    postedAt: Long = System.currentTimeMillis(),
    revealing: Boolean = false,
  ) {
    val texts = notifications(config)
    val copy = texts.getJSONObject(if (target == null) "limit" else "riskApp")
    val id = if (target == null) {
      LIMIT_NOTIFICATION_ID
    } else {
      RISK_NOTIFICATION_BASE + target.hashCode().mod(RISK_NOTIFICATION_RANGE)
    }
    val open = openApp(context)
    val builder = base(context, ALERTS_CHANNEL_ID, texts, copy.getString("title"), copy.getString("text"))
      .withEmergency(context, config, id)
    open?.let { builder.setContentIntent(it) }
    val spec = NotificationHold.Spec(if (target == null) "limit" else "riskApp", postedAt, target = target)
    publish(context, id, ALERTS_CHANNEL_ID, texts, builder, open, spec, revealing)
  }

  fun sendCheckIn(
    context: Context,
    config: JSONObject,
    compulsionId: Int,
    postedAt: Long = System.currentTimeMillis(),
    revealing: Boolean = false,
  ) {
    val texts = notifications(config)
    val copy = texts.getJSONObject("checkIn")
    val open = openApp(context)
    val builder = base(context, REMINDERS_CHANNEL_ID, texts, copy.getString("title"), copy.getString("text"))
    open?.let { builder.setContentIntent(it) }
    fun action(label: String, answer: String, requestCode: Int) = Notification.Action.Builder(
      null,
      label,
      PendingIntent.getBroadcast(
        context,
        requestCode,
        Intent(context, NotificationActionReceiver::class.java)
          .setAction(NotificationActionReceiver.ACTION_CHECK_IN)
          .putExtra(NotificationActionReceiver.EXTRA_COMPULSION, compulsionId)
          .putExtra(NotificationActionReceiver.EXTRA_ANSWER, answer),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      ),
    ).build()
    builder.addAction(action(copy.getString("noRelapse"), "no_relapse", 11))
    builder.addAction(action(copy.getString("relapse"), "relapse", 12))
    val spec = NotificationHold.Spec("checkIn", postedAt, compulsionId = compulsionId)
    publish(context, CHECK_IN_NOTIFICATION_ID, REMINDERS_CHANNEL_ID, texts, builder, open, spec, revealing)
  }

  fun sendPreventive(
    context: Context,
    config: JSONObject,
    body: String,
    id: Int = PREVENTIVE_NOTIFICATION_ID,
    postedAt: Long = System.currentTimeMillis(),
    revealing: Boolean = false,
  ) {
    val texts = notifications(config)
    val title = texts.getJSONObject("preventive").getString("title")
    val open = openApp(context)
    val builder = base(context, REMINDERS_CHANNEL_ID, texts, title, body).withEmergency(context, config, id)
    open?.let { builder.setContentIntent(it) }
    val spec = NotificationHold.Spec("preventive", postedAt, body = body)
    publish(context, id, REMINDERS_CHANNEL_ID, texts, builder, open, spec, revealing)
  }

  fun sendRestart(
    context: Context,
    config: JSONObject,
    postedAt: Long = System.currentTimeMillis(),
    revealing: Boolean = false,
  ) {
    val texts = notifications(config)
    val copy = texts.getJSONObject("restart")
    val open = openApp(context)
    val builder = base(context, REMINDERS_CHANNEL_ID, texts, copy.getString("title"), copy.getString("text"))
    open?.let { builder.setContentIntent(it) }
    val spec = NotificationHold.Spec("restart", postedAt)
    publish(context, RESTART_NOTIFICATION_ID, REMINDERS_CHANNEL_ID, texts, builder, open, spec, revealing)
  }

  fun sendProtectionPaused(
    context: Context,
    config: JSONObject,
    postedAt: Long = System.currentTimeMillis(),
    revealing: Boolean = false,
  ) {
    val texts = notifications(config)
    val copy = texts.getJSONObject("protectionPaused")
    val open = openLink(context, config.getJSONObject("links").getString("permissions"), PROTECTION_NOTIFICATION_ID)
    val builder = base(context, ALERTS_CHANNEL_ID, texts, copy.getString("title"), copy.getString("text"))
      .setContentIntent(open)
    val spec = NotificationHold.Spec("protectionPaused", postedAt)
    publish(context, PROTECTION_NOTIFICATION_ID, ALERTS_CHANNEL_ID, texts, builder, open, spec, revealing)
  }
}
