package expo.modules.labmonitoring

import android.content.Context
import android.content.Intent
import android.os.Build
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Fachada exposta ao JavaScript. A logica fica em UsageReader e EventLog.
 *
 * Cada operacao nativa grava no log compartilhado usando o nome do seu proprio
 * componente como "source". E assim que vamos enxergar, mais adiante, se quem
 * disparou um evento foi o app, o servico em primeiro plano ou a VPN local.
 */
class LabMonitoringModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("LabMonitoring")

    Function("getPermissionStatus") {
      mapOf(
        "usageAccess" to if (UsageReader.hasUsageAccess(context)) "granted" else "denied",
        "notifications" to if (Notifications.isAllowed(context)) "granted" else "denied",
        "overlay" to if (InterruptionOverlay.canDraw(context)) "granted" else "denied"
      )
    }

    /**
     * A4: abre os Ajustes de "Aparecer sobre outros apps". Essa permissao serve as
     * DUAS abordagens: desenhar a sobreposicao e, por tabela, iniciar uma activity
     * estando em segundo plano.
     */
    AsyncFunction("requestOverlayPermission") {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${context.packageName}")
      ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }

      val opened = runCatching { context.startActivity(intent) }.isSuccess

      EventLog.append(
        context = context,
        source = "app",
        experiment = "A4",
        event = if (opened) "overlay_settings_opened" else "overlay_settings_unavailable"
      )

      mapOf("settingsOpened" to opened)
    }

    /** Fecha a sobreposicao, se estiver na tela. */
    AsyncFunction("hideInterruption") {
      InterruptionOverlay.hide(context)
    }

    /**
     * Pede a permissao de notificacao (Android 13+). Ao contrario do acesso a
     * dados de uso, esta e uma permissao de runtime normal, com pop-up.
     */
    AsyncFunction("requestNotificationPermission") {
      val activity = appContext.currentActivity
      val asked = Notifications.request(context, activity)

      EventLog.append(
        context = context,
        source = "app",
        experiment = "A3",
        event = if (asked) "notification_permission_requested" else "notification_permission_unavailable"
      )

      mapOf(
        "requested" to asked,
        "notifications" to if (Notifications.isAllowed(context)) "granted" else "denied"
      )
    }

    /** Dispara o alerta do A3 na hora, sem esperar o limite. Para teste. */
    AsyncFunction("sendTestAlert") {
      Notifier.sendLimitAlert(context, LimitConfig.message(context))
      EventLog.append(
        context = context,
        source = "app",
        experiment = "A3",
        event = "notification_sent",
        details = "disparo manual de teste"
      )
    }

    AsyncFunction("requestUsageAccess") {
      val route = UsageReader.openUsageAccessSettings(context)
      val opened = route != UsageReader.SettingsRoute.UNAVAILABLE
      val granted = UsageReader.hasUsageAccess(context)

      EventLog.append(
        context = context,
        source = "UsageReader",
        experiment = "A1",
        event = if (opened) "settings_opened" else "settings_unavailable",
        details = "rota: ${route.name.lowercase()}"
      )

      mapOf(
        "settingsOpened" to opened,
        "settingsRoute" to route.name.lowercase(),
        "usageAccess" to if (granted) "granted" else "denied"
      )
    }

    AsyncFunction("getUsageToday") {
      if (!UsageReader.hasUsageAccess(context)) {
        EventLog.append(
          context = context,
          source = "UsageReader",
          experiment = "A1",
          event = "usage_read_denied"
        )
        throw PermissionDeniedException()
      }

      val entries = UsageReader.getUsageToday(context)

      EventLog.append(
        context = context,
        source = "UsageReader",
        experiment = "A1",
        event = "usage_read",
        details = "${entries.size} apps com uso hoje"
      )

      entries
    }

    AsyncFunction("getUsageTodayFromEvents") {
      if (!UsageReader.hasUsageAccess(context)) {
        throw PermissionDeniedException()
      }

      val entries = UsageReader.getUsageTodayFromEvents(context)

      EventLog.append(
        context = context,
        source = "UsageReader",
        experiment = "A1",
        event = "usage_read_events",
        details = "${entries.size} apps pelo fluxo de eventos"
      )

      entries
    }

    AsyncFunction("listInstalledApps") {
      val apps = UsageReader.listLaunchableApps(context)

      EventLog.append(
        context = context,
        source = "UsageReader",
        experiment = "A1",
        event = "apps_listed",
        details = "${apps.size} apps visiveis"
      )

      apps
    }

    AsyncFunction("startUsageLimit") { minutes: Int, packages: List<String>, message: String, interruptionMode: String ->
      if (!UsageReader.hasUsageAccess(context)) {
        throw PermissionDeniedException()
      }
      if (packages.isEmpty()) {
        throw NoTargetsException()
      }

      LimitConfig.save(context, minutes, packages, message, interruptionMode)

      val intent = Intent(context, UsageLimitService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }

      EventLog.append(
        context = context,
        source = "app",
        experiment = "A2",
        event = "limit_configured",
        details = "$minutes min para ${packages.size} app(s)"
      )
    }

    AsyncFunction("stopUsageLimit") {
      context.stopService(Intent(context, UsageLimitService::class.java))
      LimitConfig.clear(context)
    }

    Function("getUsageLimitStatus") {
      mapOf(
        "active" to LimitConfig.isActive(context),
        "minutes" to LimitConfig.minutes(context),
        "packages" to LimitConfig.packages(context),
        "firedAt" to LimitConfig.firedAt(context),
        "message" to LimitConfig.message(context),
        "interruptionMode" to LimitConfig.interruptionMode(context),
        "escalatedAt" to LimitConfig.escalatedAt(context)
      )
    }

    /** Abre os ajustes de notificacao do app, para a notificacao do servico aparecer. */
    AsyncFunction("openNotificationSettings") {
      val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      }
      runCatching { context.startActivity(intent) }.isSuccess
    }

    AsyncFunction("logEvent") { source: String, experiment: String, event: String, details: String? ->
      EventLog.append(context, source, experiment, event, details)
    }

    AsyncFunction("getLog") {
      EventLog.read(context)
    }

    AsyncFunction("clearLog") {
      EventLog.clear(context)
    }
  }
}
