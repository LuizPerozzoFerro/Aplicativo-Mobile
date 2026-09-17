package expo.modules.labmonitoring

import android.content.Context
import android.content.Intent
import android.os.Build
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
      mapOf("usageAccess" to if (UsageReader.hasUsageAccess(context)) "granted" else "denied")
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

    AsyncFunction("startUsageLimit") { minutes: Int, packages: List<String> ->
      if (!UsageReader.hasUsageAccess(context)) {
        throw PermissionDeniedException()
      }
      if (packages.isEmpty()) {
        throw NoTargetsException()
      }

      LimitConfig.save(context, minutes, packages)

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
        "firedAt" to LimitConfig.firedAt(context)
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
