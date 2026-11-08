package br.com.quedo.monitoring

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context

/**
 * Notificações do serviço. Por enquanto só a permanente, exigida pelo serviço
 * em primeiro plano; os avisos e lembretes entram no passo 5.
 *
 * Textos: os da configuração, vindos do i18n do JS (spec 03, seção 4.2). Os
 * de `res/values/strings.xml` são o mínimo neutro para quando ainda não há
 * configuração. Nenhum revela o tema (CLAUDE.md, seção 9), nem o nome do
 * canal, que aparece nos Ajustes.
 */
object Notifier {
  const val ONGOING_CHANNEL_ID = "monitoring"
  const val ONGOING_NOTIFICATION_ID = 1001

  private fun manager(context: Context) =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  /** Cria os canais, ou atualiza o nome deles (o Android aceita trocar o nome de um canal existente). */
  fun ensureChannels(context: Context) {
    // Silencioso: só mantém o serviço em primeiro plano (canal "Acompanhamento").
    manager(context).createNotificationChannel(
      NotificationChannel(
        ONGOING_CHANNEL_ID,
        ConfigStore.text(context, "channels", "tracking", R.string.quedo_monitoring_channel_name),
        NotificationManager.IMPORTANCE_LOW
      )
    )
  }

  fun ongoingNotification(context: Context): Notification {
    val builder = Notification.Builder(context, ONGOING_CHANNEL_ID)
      .setContentTitle(ConfigStore.text(context, "ongoing", "title", R.string.quedo_monitoring_ongoing_title))
      .setContentText(ConfigStore.text(context, "ongoing", "text", R.string.quedo_monitoring_ongoing_text))
      .setSmallIcon(R.drawable.quedo_ic_notification)
      .setOngoing(true)
      .setShowWhen(false)

    context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launch ->
      builder.setContentIntent(
        PendingIntent.getActivity(
          context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      )
    }
    return builder.build()
  }

  /** Depois de uma configuração nova: canal e notificação permanente com os textos novos. */
  fun refresh(context: Context) {
    ensureChannels(context)
    if (MonitoringService.isRunning) {
      manager(context).notify(ONGOING_NOTIFICATION_ID, ongoingNotification(context))
    }
  }

  fun cancelAll(context: Context) {
    manager(context).cancelAll()
  }
}
