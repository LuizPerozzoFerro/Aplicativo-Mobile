package expo.modules.labmonitoring

import expo.modules.kotlin.exception.CodedException

/** Erro explicito quando se tenta ligar a VPN do A6 sem o consentimento do sistema. */
class VpnNotAuthorizedException :
  CodedException("VPN nao autorizada: toque em \"Autorizar VPN\" antes")
