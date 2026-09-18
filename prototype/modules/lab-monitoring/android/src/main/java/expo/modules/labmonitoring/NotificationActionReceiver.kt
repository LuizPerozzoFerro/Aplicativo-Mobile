package expo.modules.labmonitoring

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Trata os botoes da notificacao de alerta (A3).
 *
 * No protótipo, "Emergência" apenas registra o toque e abre o app. No produto,
 * abriria direto o botao de emergencia descrito no documento 01, secao 6.7.
 */
class NotificationActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Notifier.ACTION_EMERGENCY) return

    EventLog.append(
      context = context,
      source = "NotificationActionReceiver",
      experiment = "A3",
      event = "emergency_tapped"
    )

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancel(Notifier.ALERT_NOTIFICATION_ID)

    context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
      it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      runCatching { context.startActivity(it) }
    }
  }
}
