package expo.modules.labmonitoring

import android.content.Context
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
