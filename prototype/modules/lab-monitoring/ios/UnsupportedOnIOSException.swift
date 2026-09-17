import ExpoModulesCore

/// Erro explicito para funcoes que ainda nao existem no iOS (spec secao 5.2).
internal final class UnsupportedOnIOSException: Exception {
  override var reason: String {
    "Ainda não implementado no iOS — chega nos experimentos I1 em diante"
  }
}
