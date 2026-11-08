package br.com.quedo.monitoring

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
  }

  fun cancel(context: Context, id: Int) = manager(context).cancel(id)

  fun cancelAll(context: Context) = manager(context).cancelAll()

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
   * "Emergência" abre o app direto: uma ação de notificação não pode abrir
   * tela a partir de um receptor (Android 12). A rota própria entra no passo 6.
   */
  private fun Notification.Builder.withEmergency(context: Context, texts: JSONObject, requestCode: Int) = apply {
    openApp(context, requestCode)?.let {
      addAction(Notification.Action.Builder(null, texts.getString("emergencyAction"), it).build())
    }
  }

  private fun notifications(config: JSONObject) =
    config.getJSONObject("texts").getJSONObject("notifications")

  fun sendLimit(context: Context, config: JSONObject, target: String?) {
    val texts = notifications(config)
    val copy = texts.getJSONObject(if (target == null) "limit" else "riskApp")
    val id = if (target == null) {
      LIMIT_NOTIFICATION_ID
    } else {
      RISK_NOTIFICATION_BASE + target.hashCode().mod(RISK_NOTIFICATION_RANGE)
    }
    val builder = base(context, ALERTS_CHANNEL_ID, texts, copy.getString("title"), copy.getString("text"))
      .withEmergency(context, texts, id)
    openApp(context)?.let { builder.setContentIntent(it) }
    manager(context).notify(id, builder.build())
  }

  fun sendCheckIn(context: Context, config: JSONObject, compulsionId: Int) {
    val texts = notifications(config)
    val copy = texts.getJSONObject("checkIn")
    val builder = base(context, REMINDERS_CHANNEL_ID, texts, copy.getString("title"), copy.getString("text"))
    openApp(context)?.let { builder.setContentIntent(it) }
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
    manager(context).notify(CHECK_IN_NOTIFICATION_ID, builder.build())
  }

  fun sendPreventive(context: Context, config: JSONObject, body: String, id: Int = PREVENTIVE_NOTIFICATION_ID) {
    val texts = notifications(config)
    val title = texts.getJSONObject("preventive").getString("title")
    val builder = base(context, REMINDERS_CHANNEL_ID, texts, title, body).withEmergency(context, texts, id)
    openApp(context)?.let { builder.setContentIntent(it) }
    manager(context).notify(id, builder.build())
  }

  fun sendRestart(context: Context, config: JSONObject) {
    val texts = notifications(config)
    val copy = texts.getJSONObject("restart")
    val builder = base(context, REMINDERS_CHANNEL_ID, texts, copy.getString("title"), copy.getString("text"))
    openApp(context)?.let { builder.setContentIntent(it) }
    manager(context).notify(RESTART_NOTIFICATION_ID, builder.build())
  }

  fun sendProtectionPaused(context: Context, config: JSONObject) {
    val texts = notifications(config)
    val copy = texts.getJSONObject("protectionPaused")
    val builder = base(context, ALERTS_CHANNEL_ID, texts, copy.getString("title"), copy.getString("text"))
      .setContentIntent(
        openLink(context, config.getJSONObject("links").getString("permissions"), PROTECTION_NOTIFICATION_ID),
      )
    manager(context).notify(PROTECTION_NOTIFICATION_ID, builder.build())
  }
}
