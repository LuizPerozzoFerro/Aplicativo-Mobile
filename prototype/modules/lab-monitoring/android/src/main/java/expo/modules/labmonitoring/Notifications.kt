package expo.modules.labmonitoring

import android.Manifest
import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

/**
 * Permissao de notificacao (A3).
 *
 * Diferente do acesso a dados de uso do A1, esta e uma permissao de runtime
 * comum: existe pop-up, e ela so passou a ser exigida no Android 13. Abaixo
 * disso, notificar e permitido por padrao.
 */
object Notifications {
  private const val REQUEST_CODE = 4301

  fun isAllowed(context: Context): Boolean {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    // areNotificationsEnabled cobre tambem o caso de o usuario ter desligado as
    // notificacoes do app inteiro nos Ajustes, que a permissao sozinha nao revela.
    return manager?.areNotificationsEnabled() ?: false
  }

  /** Devolve false quando nao ha nada a pedir (Android 12 ou anterior, ou sem activity). */
  fun request(context: Context, activity: Activity?): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return false
    if (activity == null) return false

    val already = context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
      PackageManager.PERMISSION_GRANTED
    if (already) return false

    activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_CODE)
    return true
  }
}
