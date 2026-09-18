import ExpoModulesCore

/**
 * Esqueleto do iOS. Nesta altura da Fase 1 o iOS ainda nao foi iniciado (depende
 * da conta Apple Developer pessoal, experimentos S2 e S3), entao cada funcao
 * responde "unsupported" de forma explicita, como manda a spec secao 5.2.
 *
 * Nada aqui deve falhar em silencio: se a tela de laboratorio mostrar
 * "unsupported", isso e um resultado valido do experimento, nao um bug.
 *
 * Quando o iOS entrar (I1 em diante), o log passa a ser gravado num App Group
 * compartilhado entre o app e as extensoes do Screen Time.
 */
public class LabMonitoringModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LabMonitoring")

    Function("getPermissionStatus") { () -> [String: Any] in
      return ["usageAccess": "unsupported", "notifications": "unsupported", "overlay": "unsupported"]
    }

    AsyncFunction("requestUsageAccess") { () -> [String: Any] in
      return [
        "settingsOpened": false,
        "settingsRoute": "unavailable",
        "usageAccess": "unsupported",
      ]
    }

    AsyncFunction("getUsageToday") { () -> String in
      return "unsupported"
    }

    AsyncFunction("getUsageTodayFromEvents") { () -> String in
      return "unsupported"
    }

    AsyncFunction("listInstalledApps") { () -> String in
      return "unsupported"
    }

    // O equivalente no iOS e o DeviceActivityMonitor do Screen Time, agendado via
    // Family Controls. Chega no experimento I3.
    AsyncFunction("startUsageLimit") { (_: Int, _: [String], _: String, _: String) in
      throw UnsupportedOnIOSException()
    }

    // No iOS o alerta sai da extensao DeviceActivityMonitor (experimento I4).
    AsyncFunction("requestNotificationPermission") { () -> [String: Any] in
      return ["requested": false, "notifications": "unsupported"]
    }

    // No iOS a tela de interrupcao e a ManagedSettings Shield (experimento I5).
    AsyncFunction("requestOverlayPermission") { () -> [String: Any] in
      return ["settingsOpened": false]
    }

    AsyncFunction("hideInterruption") {
    }

    AsyncFunction("sendTestAlert") {
      throw UnsupportedOnIOSException()
    }

    AsyncFunction("stopUsageLimit") {
      throw UnsupportedOnIOSException()
    }

    Function("getUsageLimitStatus") { () -> [String: Any] in
      return [
        "active": false, "minutes": 0, "packages": [String](), "message": "",
        "interruptionMode": "overlay", "escalatedAt": 0, "firedAt": 0,
      ]
    }

    AsyncFunction("openNotificationSettings") { () -> Bool in
      return false
    }

    AsyncFunction("logEvent") { (_: String, _: String, _: String, _: String?) in
    }

    AsyncFunction("getLog") { () -> [[String: Any?]] in
      return []
    }

    AsyncFunction("clearLog") {
    }
  }
}
