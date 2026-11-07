package br.com.quedo.monitoring

/**
 * Quais respostas à intenção HOME são telas iniciais de verdade, para
 * descontá-las do uso (I-8). Sem nada do Android, para os testes JUnit.
 *
 * Achado no S22 em 07/11/2026 (`cmd package query-activities`): além do
 * lançador (One UI Home, prioridade 0), o `com.android.settings/.FallbackHome`
 * responde a HOME com prioridade -1000. É a tela de reserva que o sistema
 * mostra durante o boot, antes do lançador. Contá-la como lançador tirava o
 * app de Configurações inteiro do uso. Lançadores instalados pelo usuário
 * também têm prioridade 0.
 */
object Launchers {
  data class Candidate(val packageName: String, val priority: Int)

  fun select(candidates: Iterable<Candidate>): Set<String> =
    candidates.filter { it.priority >= 0 }.map { it.packageName }.toSet()
}
