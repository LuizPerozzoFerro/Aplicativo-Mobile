import { useTranslation } from 'react-i18next';

import { ALL_DAY, MINUTES_PER_DAY, mergeTimeRanges, type TimeRange } from '@/domain/timeRange';
import type { Emotion, Weekday } from '@/domain/triggers';

/**
 * Rótulos dos gatilhos e horários, do i18n: "22h", "23h30", "22h–24h", dias e
 * emoções. Chaves literais (o teste de chaves recusa chave montada); o
 * `satisfies` obriga a ter todos os valores.
 */
export function useTriggerLabels() {
  const { t } = useTranslation('common');

  const weekdays = {
    0: t('weekdays.0'),
    1: t('weekdays.1'),
    2: t('weekdays.2'),
    3: t('weekdays.3'),
    4: t('weekdays.4'),
    5: t('weekdays.5'),
    6: t('weekdays.6'),
  } satisfies Record<Weekday, string>;

  const emotions = {
    boredom: t('emotions.boredom'),
    loneliness: t('emotions.loneliness'),
    stress: t('emotions.stress'),
    anxiety: t('emotions.anxiety'),
    tiredness: t('emotions.tiredness'),
    sadness: t('emotions.sadness'),
  } satisfies Record<Emotion, string>;

  /** "22h" ou "23h30". `asEnd`: a meia-noite no fim de uma faixa vira "24h". */
  const formatMinutes = (minutes: number, asEnd = false) => {
    const value = asEnd && minutes === 0 ? MINUTES_PER_DAY : minutes;
    const hour = String(Math.floor(value / 60)).padStart(2, '0');
    const minute = String(value % 60).padStart(2, '0');
    return value % 60 === 0 ? t('time.hour', { hour }) : t('time.hourMinute', { hour, minute });
  };

  const formatRange = (range: TimeRange) =>
    t('time.range', { start: formatMinutes(range.start), end: formatMinutes(range.end, true) });

  /** Faixas unidas para o resumo ("20h–01h"), ou "O dia todo". */
  const formatMergedRanges = (ranges: readonly TimeRange[]) => {
    const merged = mergeTimeRanges(ranges);
    return merged === ALL_DAY ? [t('time.allDay')] : merged.map(formatRange);
  };

  const joinList = (items: readonly string[]) => items.join(t('list.separator'));

  return { weekdays, emotions, formatMinutes, formatRange, formatMergedRanges, joinList };
}
