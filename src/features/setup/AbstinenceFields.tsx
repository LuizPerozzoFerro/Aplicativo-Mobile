import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import type { UserCompulsion } from '@/data/repositories';
import {
  getAbstinenceSetupProblem,
  parseWholeNumber,
  type AbstinenceSetupProblem,
  type AbstinenceStartMode,
} from '@/domain/onboarding';
import { getPreselectedPackages } from '@/domain/suggestedApps';
import { ChipGroup, Text, TextField, TimePicker, useTheme } from '@/ui';

import type { AppTargets } from './appTargets';

/**
 * Início da streak e apps de risco da abstinência. `riskApps` nulo: esperando
 * a lista de apps para pré-marcar. Declaração nula: ainda não respondida.
 */
export type AbstinenceSetup = {
  startMode: AbstinenceStartMode;
  days: string;
  riskApps: string[] | null;
  declarations: Record<string, boolean | null>;
};

/** Já configurada: o gravado. Sem compulsão ou sem configuração: os padrões. */
export function loadAbstinenceSetup(compulsion?: UserCompulsion | null): AbstinenceSetup {
  const configured = compulsion != null && compulsion.initialStreakDays !== null;
  const days = compulsion?.initialStreakDays ?? 0;
  const saved = configured ? getRepositories().monitoredApps.listByCompulsion(compulsion.id) : null;
  return {
    startMode: days > 0 ? 'days_ago' : 'today',
    days: days > 0 ? String(days) : '',
    riskApps: saved?.map((app) => app.packageName) ?? null,
    declarations: Object.fromEntries(
      (saved ?? []).map((app) => [app.packageName, app.declaredConsumption]),
    ),
  };
}

/** Pré-marca os apps de risco sugeridos instalados, sem resposta, se a lista ainda não foi escolhida. */
export function preselectRiskApps(
  setup: AbstinenceSetup,
  installed: readonly string[],
): AbstinenceSetup {
  if (setup.riskApps !== null) return setup;
  const riskApps = getPreselectedPackages('risk', installed);
  return { ...setup, riskApps, declarations: Object.fromEntries(riskApps.map((id) => [id, null])) };
}

/** Dias já sem recair: 0 em "começando hoje". */
export function getDaysAlreadyWithoutRelapse(setup: AbstinenceSetup): number {
  return setup.startMode === 'today' ? 0 : parseWholeNumber(setup.days);
}

export function getAbstinenceProblem(setup: AbstinenceSetup): AbstinenceSetupProblem | null {
  return getAbstinenceSetupProblem({
    startMode: setup.startMode,
    daysAlreadyWithoutRelapse: parseWholeNumber(setup.days),
    riskAppDeclarations: (setup.riskApps ?? []).map((id) => setup.declarations[id] ?? null),
  });
}

/** Grava os apps de risco e as declarações de uma compulsão de abstinência já existente. */
export function saveRiskApps(compulsionId: number, setup: AbstinenceSetup): void {
  getRepositories().monitoredApps.replaceForCompulsion(
    compulsionId,
    (setup.riskApps ?? []).map((packageName) => ({
      packageName,
      role: 'risk',
      declaredConsumption: setup.declarations[packageName] ?? null,
    })),
  );
}

export function useAbstinenceProblemText(): Record<AbstinenceSetupProblem, string> {
  const { t } = useTranslation('onboarding');
  return {
    invalid_days: t('setup.adult.invalidDays'),
    undeclared_app: t('setup.adult.undeclared'),
  };
}

type Props = {
  value: AbstinenceSetup;
  onChange: (value: AbstinenceSetup) => void;
  apps: AppTargets;
  /** Pergunta do início da streak: no onboarding e ao adicionar pelo Perfil. */
  showStart?: boolean;
  showHeading?: boolean;
};

/**
 * Início da streak (opcional) e apps de risco, cada um com a pergunta sobre
 * consumir o conteúdo nele, obrigatória e sem resposta pré-marcada. Usado na
 * etapa 3 do onboarding e no Perfil.
 */
export function AbstinenceFields({
  value,
  onChange,
  apps,
  showStart = true,
  showHeading = true,
}: Props) {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();
  const problemText = useAbstinenceProblemText();
  const problem = getAbstinenceProblem(value);

  return (
    <View style={{ gap: theme.spacing.md }}>
      {showHeading ? <Text variant="heading">{t('setup.adult.heading')}</Text> : null}
      {showStart ? (
        <>
          <Text variant="bodyStrong">{t('setup.adult.start')}</Text>
          <ChipGroup<AbstinenceStartMode>
            label={t('setup.adult.start')}
            mode="single"
            options={[
              { value: 'today', label: t('setup.adult.startToday') },
              { value: 'days_ago', label: t('setup.adult.startDaysAgo') },
            ]}
            selected={[value.startMode]}
            onChange={([startMode]) => startMode !== undefined && onChange({ ...value, startMode })}
          />
          {value.startMode === 'days_ago' ? (
            <TextField
              label={t('setup.adult.daysLabel')}
              value={value.days}
              onChangeText={(days) => onChange({ ...value, days })}
              keyboardType="number-pad"
              maxLength={4}
              error={
                value.days !== '' && problem === 'invalid_days'
                  ? problemText.invalid_days
                  : undefined
              }
            />
          ) : null}
        </>
      ) : null}
      <Text variant="bodyStrong">{t('setup.adult.riskApps')}</Text>
      <Text color="textMuted">{t('setup.adult.riskAppsHint')}</Text>
      {apps.options.length > 0 ? (
        <ChipGroup
          label={t('setup.adult.riskApps')}
          options={apps.options}
          selected={value.riskApps ?? []}
          onChange={(riskApps) =>
            onChange({
              ...value,
              riskApps,
              // App novo começa sem resposta; quem sai da lista perde a dele.
              declarations: Object.fromEntries(
                riskApps.map((id) => [id, value.declarations[id] ?? null]),
              ),
            })
          }
          testID="risk-apps"
        />
      ) : apps.targets === null ? null : (
        <Text color="textMuted">{t('setup.noAppsFound')}</Text>
      )}
      {(value.riskApps ?? []).map((id) => {
        const question = t('setup.adult.declare', { app: apps.labelOf(id) });
        const declared = value.declarations[id] ?? null;
        return (
          <View key={id} style={{ gap: theme.spacing.sm }}>
            <Text>{question}</Text>
            <ChipGroup<'yes' | 'no'>
              label={question}
              mode="single"
              options={[
                { value: 'yes', label: t('setup.adult.yes') },
                { value: 'no', label: t('setup.adult.no') },
              ]}
              selected={declared === null ? [] : [declared ? 'yes' : 'no']}
              onChange={([answer]) =>
                onChange({
                  ...value,
                  declarations: { ...value.declarations, [id]: answer === 'yes' },
                })
              }
            />
          </View>
        );
      })}
    </View>
  );
}

/** Horário do check-in com a explicação, no onboarding e no Perfil. */
export function CheckInTimeField({
  value,
  onChange,
}: {
  value: number;
  onChange: (minutes: number) => void;
}) {
  const { t } = useTranslation('onboarding');
  return (
    <>
      <TimePicker
        label={t('setup.adult.checkIn')}
        value={value}
        onChange={onChange}
        testID="check-in-time"
      />
      <Text color="textMuted">{t('setup.adult.checkInHint')}</Text>
    </>
  );
}
