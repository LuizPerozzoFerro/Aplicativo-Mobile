// Borda do dia (spec 01, seção 4.7; doc 01, seção 6: "meia-noite no fuso do
// aparelho"). Base para streak, limites e "alertas encerrados até a meia-noite".
//
// Usa o horário local do Date, que segue o fuso do aparelho. Por isso um dia
// nem sempre tem 24 horas: com horário de verão ele pode ter 23 ou 25, e onde a
// troca acontece à meia-noite (Brasil até 2019) a hora 00:00 não existe e o dia
// começa à 01:00. Nunca somar 24 horas para achar o dia seguinte.

export type DayBounds = {
  /** Primeiro instante do dia, inclusive. */
  readonly start: Date;
  /** Primeiro instante do dia seguinte, exclusive. */
  readonly end: Date;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Primeiro instante do dia local de `date`. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Primeiro instante do dia local seguinte ao de `date`. */
export function startOfNextDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/** Intervalo [start, end) do dia local que contém `date`. */
export function getDayBounds(date: Date): DayBounds {
  return { start: startOfDay(date), end: startOfNextDay(date) };
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Chave do dia local no formato AAAA-MM-DD, para guardar estado por dia. */
export function toDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Quantas viradas de dia local há de `from` até `to` (negativo se `to` for
 * antes). Compara as datas do calendário, então não depende de o dia ter 23,
 * 24 ou 25 horas.
 */
export function calendarDaysBetween(from: Date, to: Date): number {
  const toCalendarDay = (date: Date) =>
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY;
  return toCalendarDay(to) - toCalendarDay(from);
}
