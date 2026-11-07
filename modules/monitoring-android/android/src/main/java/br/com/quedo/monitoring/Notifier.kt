package br.com.quedo.monitoring

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context

/**
 * Notificações do serviço. Nesta etapa só a permanente, exigida pelo serviço
 * em primeiro plano; os avisos entram no passo 5.
 *
 * Textos: os definitivos virão do i18n pela configuração (spec 03, seção 4.2).
 * Os de `res/values/strings.xml` são o mínimo neutro para quando ainda não há
 * configuração, e não revelam o tema (CLAUDE.md, seção 9). Vale também para o
 * nome do canal, que aparece nos Ajustes.
 */
object Notifier {
  const val ONGOING_CHANNEL_ID = "monitoring"
  const val ONGOING_NOTIFICATION_ID = 1001

  fun ensureChannels(context: Context) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    // Silencioso: só mantém o serviço em primeiro plano.
    manager.createNotificationChannel(
      NotificationChannel(
        ONGOING_CHANNEL_ID,
        context.getString(R.string.quedo_monitoring_channel_name),
        NotificationManager.IMPORTANCE_LOW
      )
    )
  }

  fun ongoingNotification(context: Context): Notification {
    val builder = Notification.Builder(context, ONGOING_CHANNEL_ID)
      .setContentTitle(context.getString(R.string.quedo_monitoring_ongoing_title))
      .setContentText(context.getString(R.string.quedo_monitoring_ongoing_text))
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
}
