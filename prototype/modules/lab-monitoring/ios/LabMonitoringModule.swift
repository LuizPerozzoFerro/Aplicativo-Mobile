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
      return [
        "usageAccess": "unsupported", "notifications": "unsupported", "overlay": "unsupported",
        "vpn": "unsupported",
      ]
    }

    // A6 no Android e uma VPN local de DNS. No iOS o equivalente e o filtro de
    // conteudo do sistema e as alternativas dos experimentos I8 e I9.
    AsyncFunction("requestVpnPermission") { () -> [String: Any] in
      return ["requested": false, "vpn": "unsupported"]
    }

    // A7 no iOS e o I7: dominio web incluido na selecao do Screen Time.
    AsyncFunction("startAdultContentWatch") { (_: String, _: [String], _: [String]) in
      throw UnsupportedOnIOSException()
    }

    AsyncFunction("stopAdultContentWatch") {
    }

    Function("getDomainWatchStatus") { () -> [String: Any?] in
      return [
        "permission": "unsupported", "running": false, "mode": "alert",
        "domains": [String](), "socialDomains": [String](), "stats": nil,
      ]
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
    // O ultimo parametro e a pausa do A5; no iOS ela vira o I6.
    AsyncFunction("startUsageLimit") { (_: Int, _: [String], _: String, _: String, _: Int) in
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
        "pauseMinutes": 0, "pausedUntil": 0,
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
