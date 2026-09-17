package expo.modules.labmonitoring

import expo.modules.kotlin.exception.CodedException

/** Erro explicito quando o acesso a dados de uso ainda nao foi concedido. */
class PermissionDeniedException :
  CodedException("Acesso a dados de uso nao concedido")
