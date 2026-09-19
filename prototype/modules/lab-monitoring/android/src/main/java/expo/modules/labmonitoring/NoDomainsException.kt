package expo.modules.labmonitoring

import expo.modules.kotlin.exception.CodedException

/** Erro explicito quando a lista de dominios do A6 esta vazia ou ilegivel. */
class NoDomainsException :
  CodedException("Nenhum dominio valido na lista")
