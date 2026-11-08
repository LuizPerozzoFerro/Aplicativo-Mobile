package br.com.quedo.monitoring

import java.time.Instant
import java.time.ZoneId

/**
 * Borda do dia (doc 01, seção 6: "meia-noite no fuso do aparelho"), igual à
 * de `src/domain/day.ts`.
 *
 * Um dia nem sempre tem 24 horas: com horário de verão ele pode ter 23 ou 25,
 * e onde a troca acontece à meia-noite (Brasil até 2019) a hora 00:00 não
 * existe e o dia começa à 01:00. O `atStartOfDay` do java.time já devolve o
 * primeiro instante válido, como o `new Date(a, m, d)` do JavaScript. Nunca
 * somar 24 horas para achar o dia seguinte.
 */
object DayBoundary {
  /** Chave AAAA-MM-DD do dia local, como `toDayKey` em `src/domain/day.ts`. */
  fun dayKey(epochMs: Long, zone: ZoneId = ZoneId.systemDefault()): String =
    Instant.ofEpochMilli(epochMs).atZone(zone).toLocalDate().toString()

  /** Primeiro instante (ms) do dia local que contém `epochMs`. */
  fun startOfDay(epochMs: Long, zone: ZoneId = ZoneId.systemDefault()): Long =
    Instant.ofEpochMilli(epochMs).atZone(zone).toLocalDate().atStartOfDay(zone)
      .toInstant().toEpochMilli()

  /** Primeiro instante (ms) do dia local seguinte ao de `epochMs`. */
  fun startOfNextDay(epochMs: Long, zone: ZoneId = ZoneId.systemDefault()): Long =
    Instant.ofEpochMilli(epochMs).atZone(zone).toLocalDate().plusDays(1)
      .atStartOfDay(zone).toInstant().toEpochMilli()
}
