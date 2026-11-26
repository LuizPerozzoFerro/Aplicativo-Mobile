import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getRepositories } from '@/data/bootstrap';
import type { CompulsionType } from '@/domain/compulsion';
import { SIMULATION_DAY_OPTIONS, type SimulationSnapshot } from '@/domain/streakSimulation';
import { formatDate } from '@/i18n/format';
import { Button, ChipGroup, Text } from '@/ui';

import { simulationStore } from './simulationStore';

function activeCompulsions() {
  return getRepositories()
    .compulsions.list()
    .filter((compulsion) => compulsion.status === 'active');
}

/**
 * Ferramenta de teste "Simular uma streak" (spec 04, 5.12), só na tela de
 * conferência do desenvolvimento: deixa a streak de uma compulsão em N dias,
 * para ver marcos e celebração sem esperar. Muda dados reais do app de
 * desenvolvimento; o que mudou fica guardado para "Desfazer a simulação", que
 * também apaga os alcances de marco criados durante ela. Uma simulação por vez.
 */
export function StreakSimulationDevTools() {
  const { t } = useTranslation(['dev', 'common']);
  const [compulsions] = useState(activeCompulsions);
  const [active, setActive] = useState<SimulationSnapshot | null>(() => simulationStore.read());
  const [chosen, setChosen] = useState<number | null>(compulsions[0]?.id ?? null);
  const [days, setDays] = useState<number>(7);
  const [message, setMessage] = useState<string | null>(null);

  const names = {
    pornography: t('common:compulsions.pornography'),
    short_videos: t('common:compulsions.short_videos'),
  } satisfies Record<CompulsionType, string>;
  const nameOf = (id: number) => {
    const compulsion = getRepositories()
      .compulsions.list()
      .find((item) => item.id === id);
    return compulsion ? names[compulsion.type] : t('dev:simulation.removed');
  };

  const simulate = () => {
    if (chosen === null) return;
    const repositories = getRepositories();
    const snapshot = repositories.streakSimulation.apply(chosen, days);
    try {
      simulationStore.save(snapshot);
    } catch {
      // Sem onde guardar, não há como desfazer depois: volta agora.
      repositories.streakSimulation.undo(snapshot);
      setMessage(t('dev:simulation.saveFailed'));
      return;
    }
    setActive(snapshot);
    setMessage(t('dev:simulation.done'));
  };

  const undo = () => {
    if (active === null) return;
    getRepositories().streakSimulation.undo(active);
    simulationStore.clear();
    setActive(null);
    setMessage(t('dev:simulation.undone'));
  };

  return (
    <>
      <Text variant="heading">{t('dev:simulation.title')}</Text>
      <Text color="textMuted">{t('dev:simulation.description')}</Text>
      {active !== null ? (
        <>
          <Text testID="dev-simulation-active">
            {t('dev:simulation.active', {
              compulsion: nameOf(active.compulsionId),
              count: active.days,
              date: formatDate(new Date(active.simulatedAt), {
                dateStyle: 'short',
                timeStyle: 'short',
              }),
            })}
          </Text>
          <Button label={t('dev:simulation.undo')} onPress={undo} />
        </>
      ) : compulsions.length === 0 ? (
        <Text>{t('dev:simulation.noCompulsion')}</Text>
      ) : (
        <>
          {compulsions.length > 1 ? (
            <ChipGroup
              testID="dev-simulation-compulsion"
              label={t('dev:simulation.compulsion')}
              mode="single"
              options={compulsions.map((compulsion) => ({
                value: String(compulsion.id),
                label: names[compulsion.type],
              }))}
              selected={chosen === null ? [] : [String(chosen)]}
              onChange={([value]) => {
                if (value !== undefined) setChosen(Number(value));
              }}
            />
          ) : null}
          <ChipGroup
            testID="dev-simulation-days"
            label={t('dev:simulation.days')}
            mode="single"
            options={SIMULATION_DAY_OPTIONS.map((option) => ({
              value: String(option),
              label: t('dev:simulation.daysOption', { count: option }),
            }))}
            selected={[String(days)]}
            onChange={([value]) => {
              if (value !== undefined) setDays(Number(value));
            }}
          />
          <Button label={t('dev:simulation.apply', { count: days })} onPress={simulate} />
        </>
      )}
      {message !== null ? <Text>{message}</Text> : null}
    </>
  );
}
