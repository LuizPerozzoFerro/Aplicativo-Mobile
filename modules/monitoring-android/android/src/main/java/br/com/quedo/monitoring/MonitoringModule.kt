package br.com.quedo.monitoring

import android.content.Context
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Sem acesso ao uso. O JS converte em `MonitoringError('permission_required')`. */
class UsageAccessRequiredException :
  CodedException("ERR_PERMISSION_REQUIRED", "Usage access is required", null)

/** Configuração fora do formato. O JS converte em `MonitoringError('invalid_config')`. */
class InvalidConfigException :
  CodedException("ERR_INVALID_CONFIG", "Invalid monitoring configuration", null)

/**
 * Fachada exposta ao JavaScript (`modules/monitoring-android/index.ts`). A
 * lógica fica nos outros arquivos.
 *
 * Privacidade (spec 03, seção 5.11): nada daqui escreve no `logcat`, e as
 * mensagens de erro não citam apps nem pacotes.
 */
class MonitoringModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("QuedoMonitoring")

    Function("getPermissionStatus") {
      mapOf(
        "usageAccess" to state(Permissions.hasUsageAccess(context)),
        "notifications" to state(Permissions.notificationsEnabled(context)),
        "overlay" to state(Permissions.canDrawOverlays(context)),
      )
    }

    AsyncFunction("openUsageAccessSettings") { Permissions.openUsageAccessSettings(context) }
    AsyncFunction("openOverlaySettings") { Permissions.openOverlaySettings(context) }
    AsyncFunction("openNotificationSettings") { Permissions.openNotificationSettings(context) }

    AsyncFunction("listTargets") { UsageReader.listLaunchableApps(context) }

    AsyncFunction("getUsageToday") {
      if (!Permissions.hasUsageAccess(context)) throw UsageAccessRequiredException()
      UsageReader.readToday(context).totals.map { (packageName, milliseconds) ->
        mapOf("targetId" to packageName, "milliseconds" to milliseconds)
      }
    }

    /**
     * Liga o serviço. Chamado com o app na tela, que é quando o Android deixa
     * iniciar um serviço em primeiro plano sem outra exceção.
     */
    AsyncFunction("startMonitoring") {
      if (!Permissions.hasUsageAccess(context)) throw UsageAccessRequiredException()
      MonitoringState.setActive(context, true)
      MonitoringService.start(context, MonitoringService.Origin.APP)
    }

    AsyncFunction("stopMonitoring") {
      MonitoringState.setActive(context, false)
      MonitoringService.stop(context)
    }

    Function("getServiceStatus") {
      MonitoringState.snapshot(context) + mapOf("pendingEvents" to EventStore.count(context))
    }

    // Configuração e eventos (spec 03, 4.2 e 4.3).

    AsyncFunction("configure") { json: String ->
      if (!ConfigStore.save(context, json)) throw InvalidConfigException()
      Notifier.refresh(context)
    }

    Function("getConfig") { ConfigStore.json(context) }

    // Só para a tela de desenvolvimento e as ferramentas de teste (spec 03, 5.10).
    Function("getMomentStatus") { MomentRunner.statusJson(context) }

    Function("setTestLimit") { minutes: Int? -> MomentRunner.setTestLimit(context, minutes) }

    AsyncFunction("getPendingEvents") { EventStore.pendingJson(context) }

    AsyncFunction("acknowledgeEvents") { ids: List<String> -> EventStore.acknowledge(context, ids) }

    /** "Apagar meus dados": para o serviço e apaga configuração, estado e eventos. */
    AsyncFunction("reset") {
      MonitoringState.setActive(context, false)
      MonitoringService.stop(context)
      InterruptionPresenter.close(context)
      ConfigStore.clear(context)
      EventStore.clear(context)
      MomentRunner.clear(context)
      MonitoringState.clear(context)
      Notifier.cancelAll(context)
    }
  }

  private fun state(granted: Boolean) = if (granted) "granted" else "denied"
}
