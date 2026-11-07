package br.com.quedo.monitoring

/**
 * Reconstrução do tempo em primeiro plano a partir do fluxo de eventos do
 * `UsageStatsManager` (achado A1 do protótipo). Sem nada do Android, para os
 * testes JUnit.
 *
 * Por que eventos e não `queryAndAggregateUsageStats`: no S22, os totais
 * agregados chegam com minutos de atraso (A1).
 *
 * Correções em relação ao protótipo (doc 02, seção 4.1):
 * - **borda do dia explícita:** os eventos são lidos desde antes do início do
 *   dia, e cada intervalo é cortado em `[dayStart, now]`. Um app aberto antes
 *   da meia-noite e ainda na tela conta só a parte de hoje (o protótipo lia a
 *   partir da meia-noite e perdia esse uso);
 * - **lançadores fora:** a tela inicial não é uso de app (I-8).
 */
object UsageTimeline {

  enum class Kind { RESUMED, PAUSED, STOPPED, SCREEN_OFF }

  data class Event(
    val kind: Kind,
    val timestamp: Long,
    val packageName: String? = null,
    val className: String? = null,
  )

  data class Result(
    /** Milissegundos em primeiro plano entre `dayStart` e `now`, por pacote. */
    val totals: Map<String, Long>,
    /** Pacote que está na tela agora, ou nulo. Lançadores também ficam fora. */
    val foreground: String?,
  )

  /**
   * @param events em ordem cronológica, como o `queryEvents` devolve.
   * @param excluded pacotes que nunca contam (os lançadores).
   */
  fun compute(events: Iterable<Event>, dayStart: Long, now: Long, excluded: Set<String>): Result {
    val totals = HashMap<String, Long>()

    // Intervalos abertos por pacote|classe: quando começaram e de quem são.
    val openedAt = HashMap<String, Long>()
    val ownerOf = HashMap<String, String>()

    // Quantos STOPPED ainda são esperados para uma chave por conta de um
    // PAUSED já processado. Resolve a ambiguidade do A1: o STOPPED de uma
    // instância pode chegar depois que outra já voltou ao primeiro plano.
    val pendingStops = HashMap<String, Int>()

    fun add(packageName: String, from: Long, to: Long) {
      val start = maxOf(from, dayStart)
      val end = minOf(to, now)
      if (end > start) totals[packageName] = (totals[packageName] ?: 0L) + (end - start)
    }

    fun close(key: String, at: Long) {
      val from = openedAt.remove(key) ?: return
      val packageName = ownerOf.remove(key) ?: return
      add(packageName, from, at)
    }

    for (event in events) {
      if (event.kind == Kind.SCREEN_OFF) {
        // Tela apagada fecha tudo: contar tela apagada como uso seria o pior
        // erro possível neste produto (A1).
        openedAt.keys.toList().forEach { close(it, event.timestamp) }
        continue
      }
      val packageName = event.packageName ?: continue
      if (packageName in excluded) continue
      val key = "$packageName|${event.className.orEmpty()}"

      when (event.kind) {
        Kind.RESUMED -> {
          // RESUMED repetido sem saída: o primeiro vale até agora.
          if (key !in openedAt) {
            openedAt[key] = event.timestamp
            ownerOf[key] = packageName
          }
        }
        Kind.PAUSED -> {
          close(key, event.timestamp)
          pendingStops[key] = (pendingStops[key] ?: 0) + 1
        }
        Kind.STOPPED -> {
          val pending = pendingStops[key] ?: 0
          if (pending > 0) {
            // Par de um PAUSED já contado.
            pendingStops[key] = pending - 1
          } else {
            // STOPPED sem PAUSED: o app foi morto. Único sinal do fim do uso.
            close(key, event.timestamp)
          }
        }
        Kind.SCREEN_OFF -> Unit
      }
    }

    // Quem ainda está aberto conta até agora. O mais recente é o que está na
    // tela.
    var foreground: String? = null
    var latest = Long.MIN_VALUE
    for ((key, from) in openedAt) {
      val packageName = ownerOf[key] ?: continue
      add(packageName, from, now)
      if (from > latest) {
        latest = from
        foreground = packageName
      }
    }

    return Result(totals.filterValues { it > 0L }, foreground)
  }
}
