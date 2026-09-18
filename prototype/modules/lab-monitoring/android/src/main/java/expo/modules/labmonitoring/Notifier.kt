package expo.modules.labmonitoring

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Experimento A3: alerta de nivel 1, disparado pelo codigo nativo no momento em
 * que o limite e atingido -- inclusive com o app fechado.
 *
 * Privacidade (CLAUDE.md secao 9 e principio P7 do documento 01): o texto e
 * NEUTRO e vem da configuracao, nao do codigo. Nada aqui pode revelar o tema do
 * app para quem olhar a tela bloqueada. Nem o nome do canal, que aparece nos
 * Ajustes do sistema.
 */
object Notifier {
  const val ONGOING_CHANNEL_ID = "lab-monitoring"
  const val ALERT_CHANNEL_ID = "lab-alerts"

  const val ONGOING_NOTIFICATION_ID = 1001
  const val ALERT_NOTIFICATION_ID = 1002

  const val ACTION_EMERGENCY = "expo.modules.labmonitoring.EMERGENCY"

  /** Texto padrao, usado quando o responsavel nao configura outro na tela. */
  const val DEFAULT_MESSAGE = "Você atingiu o tempo que definiu para hoje."

  fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    // Canal do servico: silencioso, so para manter o servico em primeiro plano.
    manager.createNotificationChannel(
      NotificationChannel(
        ONGOING_CHANNEL_ID,
        "Monitoramento",
        NotificationManager.IMPORTANCE_LOW
      )
    )

    // Canal do alerta: precisa de IMPORTANCE_HIGH para aparecer como aviso
    // flutuante. Com IMPORTANCE_LOW ele so entraria na gaveta, e o A3 exige que
    // o usuario seja interrompido.
    manager.createNotificationChannel(
      NotificationChannel(
        ALERT_CHANNEL_ID,
        "Alertas",
        NotificationManager.IMPORTANCE_HIGH
      )
    )
  }

  /** Notificacao permanente exigida pelo servico em primeiro plano. */
  fun ongoingNotification(context: Context): Notification =
    Notification.Builder(context, ONGOING_CHANNEL_ID)
      .setContentTitle("Acompanhamento ativo")
      .setContentText("O app está acompanhando seu tempo de uso.")
      .setSmallIcon(android.R.drawable.ic_menu_recent_history)
      .setOngoing(true)
      .build()

  fun sendLimitAlert(context: Context, message: String) {
    ensureChannels(context)

    val openApp = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val openAppPending = openApp?.let {
      PendingIntent.getActivity(
        context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    val emergencyPending = PendingIntent.getBroadcast(
      context,
      1,
      Intent(context, NotificationActionReceiver::class.java).setAction(ACTION_EMERGENCY),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = Notification.Builder(context, ALERT_CHANNEL_ID)
      .setContentTitle("Momento de pausa")
      .setContentText(message)
      .setSmallIcon(android.R.drawable.ic_menu_recent_history)
      .setAutoCancel(true)
      // Sem isso, textos mais longos ficam cortados numa linha so.
      .setStyle(Notification.BigTextStyle().bigText(message))
      .addAction(
        Notification.Action.Builder(null, "Emergência", emergencyPending).build()
      )

    if (openAppPending != null) {
      builder.setContentIntent(openAppPending)
    }

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(ALERT_NOTIFICATION_ID, builder.build())
  }
}
