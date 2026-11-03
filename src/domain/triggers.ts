// Gatilhos de risco (spec 02 v0.2, seções 4.2 e 4.3; doc 01, seção 4.2):
// faixas de horário, dias da semana e emoções. Sem gatilho de localização.
//
// Formato de `triggers.value` por `kind`:
// - `time`: `HH:MM-HH:MM` (ver timeRange.ts);
// - `weekday`: `0` a `6`, domingo = 0 (como `Date.getDay()`);
// - `emotion`: um dos valores de EMOTIONS.

import type { TriggerKind } from './compulsion';
import { parseTimeRange } from './timeRange';

export const EMOTIONS = [
  'boredom',
  'loneliness',
  'stress',
  'anxiety',
  'tiredness',
  'sadness',
] as const;
export type Emotion = (typeof EMOTIONS)[number];

/** Dias da semana na ordem de `Date.getDay()`: domingo = 0, sábado = 6. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** Atalhos da etapa de gatilhos: "Dias úteis" e "Fim de semana". */
export const WEEKDAY_SHORTCUTS = {
  workdays: [1, 2, 3, 4, 5],
  weekend: [0, 6],
} as const satisfies Record<string, readonly Weekday[]>;
export type WeekdayShortcut = keyof typeof WEEKDAY_SHORTCUTS;

export function isWeekday(value: number): value is Weekday {
  return (WEEKDAYS as readonly number[]).includes(value);
}

export function isEmotion(value: string): value is Emotion {
  return (EMOTIONS as readonly string[]).includes(value);
}

/** O atalho está todo marcado? */
export function isShortcutSelected(
  selected: readonly Weekday[],
  shortcut: WeekdayShortcut,
): boolean {
  return WEEKDAY_SHORTCUTS[shortcut].every((day) => selected.includes(day));
}

/**
 * Toque num atalho: se todos os dias dele já estão marcados, desmarca esses
 * dias; senão, marca os que faltam. Os outros dias não mudam. Resultado em
 * ordem de domingo a sábado.
 */
export function toggleWeekdayShortcut(
  selected: readonly Weekday[],
  shortcut: WeekdayShortcut,
): Weekday[] {
  const days: readonly Weekday[] = WEEKDAY_SHORTCUTS[shortcut];
  const next = isShortcutSelected(selected, shortcut)
    ? selected.filter((day) => !days.includes(day))
    : [...selected, ...days];
  return WEEKDAYS.filter((day) => next.includes(day));
}

/** `triggers.value` válido para o `kind`? Mesma regra do CHECK do banco, quando houver. */
export function isValidTriggerValue(kind: TriggerKind, value: string): boolean {
  switch (kind) {
    case 'time':
      return parseTimeRange(value) !== null;
    case 'weekday':
      return /^[0-6]$/.test(value);
    case 'emotion':
      return isEmotion(value);
  }
}
