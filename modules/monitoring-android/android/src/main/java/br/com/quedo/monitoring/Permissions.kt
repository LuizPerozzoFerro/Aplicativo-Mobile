package br.com.quedo.monitoring

import android.Manifest
import android.app.AppOpsManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings

/**
 * As três permissões do monitoramento (`PermissionKind` em src/monitoring).
 * Acesso ao uso e sobreposição são "acessos especiais": não há pop-up, só a
 * tela dos Ajustes, e o app consulta de novo ao voltar.
 */
object Permissions {

  fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
      ?: return false
    // O Android 10 trocou checkOpNoThrow por unsafeCheckOpNoThrow, e o 16 (API
    // 36) voltou atrás (referência do AppOpsManager, conferida em 07/11/2026).
    val sdk = Build.VERSION.SDK_INT
    val mode = if (sdk >= Build.VERSION_CODES.Q && sdk < Build.VERSION_CODES.BAKLAVA) {
      @Suppress("DEPRECATION")
      appOps.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName
      )
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName
      )
    }
    // MODE_DEFAULT: o AppOps não decidiu, e vale a permissão do manifesto. Sem
    // este ramo, alguns aparelhos dizem "negado" com o acesso concedido (A1).
    return if (mode == AppOpsManager.MODE_DEFAULT) {
      context.checkCallingOrSelfPermission(Manifest.permission.PACKAGE_USAGE_STATS) ==
        PackageManager.PERMISSION_GRANTED
    } else {
      mode == AppOpsManager.MODE_ALLOWED
    }
  }

  fun canDrawOverlays(context: Context): Boolean = Settings.canDrawOverlays(context)

  /** Cobre também as notificações desligadas nos Ajustes, que a permissão sozinha não revela. */
  fun notificationsEnabled(context: Context): Boolean {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
    return manager?.areNotificationsEnabled() ?: false
  }

  /**
   * Abre o acesso ao uso já na chave do app: no S22, a rota com o pacote leva
   * direto a ela (A1). Se o aparelho não aceitar, abre a lista geral.
   */
  fun openUsageAccessSettings(context: Context): Boolean {
    val targeted = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      .setData(Uri.fromParts("package", context.packageName, null))
    return start(context, targeted) ||
      start(context, Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
  }

  fun openOverlaySettings(context: Context): Boolean =
    start(
      context,
      Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))
    )

  fun openNotificationSettings(context: Context): Boolean =
    start(
      context,
      Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    )

  private fun start(context: Context, intent: Intent): Boolean =
    runCatching { context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.isSuccess
}
