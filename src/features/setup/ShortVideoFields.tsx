import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import type { UserCompulsion } from '@/data/repositories';
import {
  DAILY_LIMIT_OPTIONS,
  DEFAULT_DAILY_LIMIT_MINUTES,
  getShortVideoSetupProblem,
  parseWholeNumber,
  type ShortVideoSetupProblem,
} from '@/domain/onboarding';
import { getPreselectedPackages } from '@/domain/suggestedApps';
import { ChipGroup, Text, TextField, useTheme } from '@/ui';

import type { AppTargets } from './appTargets';

export type LimitChoice = number | 'other';

/** Apps e limite de vídeos curtos. `apps` nulo: esperando a lista de apps para pré-marcar. */
export type ShortVideoSetup = {
  apps: string[] | null;
  limitChoice: LimitChoice;
  otherLimit: string;
};

const isOption = (minutes: number) => (DAILY_LIMIT_OPTIONS as readonly number[]).includes(minutes);

/** Já configurada: o gravado. Sem compulsão ou sem limite gravado: os padrões. */
export function loadShortVideoSetup(compulsion?: UserCompulsion | null): ShortVideoSetup {
  const configured = compulsion != null && compulsion.dailyLimitMinutes !== null;
  const limit = compulsion?.dailyLimitMinutes ?? DEFAULT_DAILY_LIMIT_MINUTES;
  return {
    apps: configured
      ? getRepositories()
          .monitoredApps.listByCompulsion(compulsion.id)
          .map((app) => app.packageName)
      : null,
    limitChoice: isOption(limit) ? limit : 'other',
    otherLimit: isOption(limit) ? '' : String(limit),
  };
}

/** Pré-marca os sugeridos instalados, se a lista ainda não foi escolhida. */
export function preselectShortVideoApps(
  setup: ShortVideoSetup,
  installed: readonly string[],
): ShortVideoSetup {
  return setup.apps === null
    ? { ...setup, apps: getPreselectedPackages('short_video', installed) }
    : setup;
}

export function getDailyLimit(setup: ShortVideoSetup): number {
  return setup.limitChoice === 'other' ? parseWholeNumber(setup.otherLimit) : setup.limitChoice;
}

export function getShortVideoProblem(setup: ShortVideoSetup): ShortVideoSetupProblem | null {
  return getShortVideoSetupProblem({
    appCount: setup.apps?.length ?? 0,
    dailyLimitMinutes: getDailyLimit(setup),
  });
}

function saveShortVideoApps(compulsionId: number, setup: ShortVideoSetup): void {
  getRepositories().monitoredApps.replaceForCompulsion(
    compulsionId,
    (setup.apps ?? []).map((packageName) => ({ packageName, role: 'short_video' })),
  );
}

/** Grava apps e limite no onboarding e ao adicionar a compulsão: o limite vale na hora. */
export function saveShortVideoSetup(compulsionId: number, setup: ShortVideoSetup): void {
  saveShortVideoApps(compulsionId, setup);
  getRepositories().compulsions.setDailyLimit(compulsionId, getDailyLimit(setup));
}

/** Grava a edição pelo Perfil: aumentar o limite só vale no dia seguinte. */
export function saveShortVideoEdit(compulsionId: number, setup: ShortVideoSetup): void {
  saveShortVideoApps(compulsionId, setup);
  getRepositories().compulsions.changeDailyLimit(compulsionId, getDailyLimit(setup));
}

/** Texto de cada problema da seção, para o motivo do botão. */
export function useShortVideoProblemText(): Record<ShortVideoSetupProblem, string> {
  const { t } = useTranslation('onboarding');
  return {
    no_apps: t('setup.shortVideos.noApps'),
    invalid_limit: t('setup.shortVideos.invalidLimit'),
  };
}

type Props = {
  value: ShortVideoSetup;
  onChange: (value: ShortVideoSetup) => void;
  apps: AppTargets;
  /** Mostra o título da seção (no onboarding, uma seção por compulsão). */
  showHeading?: boolean;
};

/**
 * Apps (sugeridos pré-marcados) e limite diário somado (doc 01, 6.5.4). Usado
 * na etapa 3 do onboarding e no Perfil.
 */
export function ShortVideoFields({ value, onChange, apps, showHeading = true }: Props) {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();
  const problemText = useShortVideoProblemText();
  const problem = getShortVideoProblem(value);

  return (
    <View style={{ gap: theme.spacing.md }}>
      {showHeading ? <Text variant="heading">{t('setup.shortVideos.heading')}</Text> : null}
      <Text variant="bodyStrong">{t('setup.shortVideos.apps')}</Text>
      <Text color="textMuted">{t('setup.shortVideos.appsHint')}</Text>
      {apps.options.length > 0 ? (
        <ChipGroup
          label={t('setup.shortVideos.apps')}
          options={apps.options}
          selected={value.apps ?? []}
          onChange={(selected) => onChange({ ...value, apps: selected })}
          testID="short-video-apps"
        />
      ) : apps.targets === null ? null : (
        <Text color="textMuted">{t('setup.noAppsFound')}</Text>
      )}
      <Text variant="bodyStrong">{t('setup.shortVideos.limit')}</Text>
      <Text color="textMuted">{t('setup.shortVideos.limitHint')}</Text>
      <ChipGroup<LimitChoice>
        label={t('setup.shortVideos.limit')}
        mode="single"
        options={[
          ...DAILY_LIMIT_OPTIONS.map((minutes) => ({
            value: minutes,
            label: t('setup.shortVideos.limitOption', { minutes }),
          })),
          { value: 'other', label: t('setup.shortVideos.other') },
        ]}
        selected={[value.limitChoice]}
        onChange={([limitChoice]) =>
          limitChoice !== undefined && onChange({ ...value, limitChoice })
        }
      />
      {value.limitChoice === 'other' ? (
        <TextField
          label={t('setup.shortVideos.otherLabel')}
          value={value.otherLimit}
          onChangeText={(otherLimit) => onChange({ ...value, otherLimit })}
          keyboardType="number-pad"
          maxLength={3}
          error={
            value.otherLimit !== '' && problem === 'invalid_limit'
              ? problemText.invalid_limit
              : undefined
          }
        />
      ) : null}
    </View>
  );
}
