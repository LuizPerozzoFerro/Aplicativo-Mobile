import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getRepositories } from '@/data/bootstrap';
import { getCompulsionDefinition } from '@/domain/compulsion';
import { fromDayKey, toDayKey } from '@/domain/day';
import { formatDate } from '@/i18n/format';
import { Button, Text } from '@/ui';

import { evaluateBaseline, minutesByDay } from './usageHistorySync';
import { getAppUsageHistorySync } from './useUsageHistorySync';

function readSnapshot() {
  const repositories = getRepositories();
  const now = new Date();
  const covered = repositories.usageHistory.listCoveredDayKeys();
  const moderation = repositories.compulsions
    .list()
    .filter(
      (item) =>
        item.status === 'active' && getCompulsionDefinition(item.type).mechanic === 'moderation',
    )
    .map((compulsion) => ({
      compulsion,
      todayMinutes: minutesByDay(repositories, compulsion.id).get(toDayKey(now)) ?? 0,
      baseline: evaluateBaseline(repositories, compulsion, now),
    }));
  return { covered, moderation };
}

const day = (dayKey: string) => {
  const date = fromDayKey(dayKey);
  return date === null ? dayKey : formatDate(date, { dateStyle: 'short' });
};

// Ferramenta de teste do histórico de uso (spec 04, 5.12), só na tela de
// conferência do desenvolvimento: dias com histórico, uso de hoje (já sem as
// telas de interrupção) e o ponto de partida.
export function UsageDevTools() {
  const { t } = useTranslation('dev');
  const [snapshot, setSnapshot] = useState(readSnapshot);

  const importNow = async () => {
    await getAppUsageHistorySync().sync();
    setSnapshot(readSnapshot());
  };

  const first = snapshot.covered[0];
  const last = snapshot.covered.at(-1);

  return (
    <>
      <Text variant="heading">{t('usage.title')}</Text>
      <Text>
        {first === undefined || last === undefined
          ? t('usage.noDays')
          : t('usage.days', { count: snapshot.covered.length, from: day(first), to: day(last) })}
      </Text>
      {snapshot.moderation.map(({ compulsion, todayMinutes, baseline }) => (
        <Text key={compulsion.id}>
          {[
            t('usage.today', { minutes: todayMinutes }),
            compulsion.baselineMinutesPerDay !== null
              ? t('usage.baselineSaved', {
                  minutes: compulsion.baselineMinutesPerDay,
                  source: compulsion.baselineSource ?? '',
                })
              : baseline?.status === 'pending'
                ? t('usage.baselinePending', { date: day(baseline.availableFromDayKey) })
                : t('usage.baselineUnknown'),
          ].join(' · ')}
        </Text>
      ))}
      <Button label={t('usage.import')} variant="secondary" onPress={() => void importNow()} />
    </>
  );
}
