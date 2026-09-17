package expo.modules.labmonitoring

import expo.modules.kotlin.exception.CodedException

/** Erro explicito quando se tenta iniciar o limite sem escolher nenhum app. */
class NoTargetsException :
  CodedException("Nenhum app selecionado para monitorar")
