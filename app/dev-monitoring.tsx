import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { variant } from '@/config/variant';
import { SUGGESTED_PACKAGES } from '@/domain/suggestedApps';
import { getAppMonitoringSync } from '@/features/monitoring/useMonitoringSync';
import { Button, Screen, Text } from '@/ui';

import {
  ERR_PERMISSION_REQUIRED,
  getQuedoMonitoring,
  type NativeBootResult,
  type NativeMomentStatus,
  type NativeNotificationStatus,
  type NativePermissionState,
  type NativePermissionStatus,
  type NativeServiceStatus,
  type NativeTarget,
  type NativeUsageEntry,
  type QuedoMonitoringNativeModule,
} from '../modules/monitoring-android';

const REFRESH_MS = 5_000;
const USAGE_ROWS = 8;
const TEST_LIMIT_MINUTES = 1;

type ConfigSummary = {
  readonly compulsions: number;
  readonly moderationRules: number;
  readonly riskAppRules: number;
};

type Snapshot = {
  readonly permissions: NativePermissionStatus;
  readonly service: NativeServiceStatus;
  readonly targets: readonly NativeTarget[];
  /** Nulo sem o acesso ao uso. */
  readonly usage: readonly NativeUsageEntry[] | null;
  /** O que o nativo guardou da configuração (passo 2), ou nulo se ainda não recebeu. */
  readonly config: ConfigSummary | null;
  readonly moment: NativeMomentStatus;
  readonly notifications: NativeNotificationStatus;
};

function summarizeConfig(json: string | null): ConfigSummary | null {
  if (json === null) return null;
  try {
    const config = JSON.parse(json) as Partial<Record<keyof ConfigSummary, unknown[]>>;
    return {
      compulsions: config.compulsions?.length ?? 0,
      moderationRules: config.moderationRules?.length ?? 0,
      riskAppRules: config.riskAppRules?.length ?? 0,
    };
  } catch {
    return null;
  }
}

function formatTime(epochMs: number | null): string | null {
  if (epochMs === null) return null;
  const date = new Date(epochMs);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

async function readSnapshot(native: QuedoMonitoringNativeModule): Promise<Snapshot> {
  const targets = await native.listTargets();
  let usage: NativeUsageEntry[] | null = null;
  try {
    usage = await native.getUsageToday();
  } catch (error) {
    if (!hasCode(error, ERR_PERMISSION_REQUIRED)) throw error;
  }
  return {
    permissions: native.getPermissionStatus(),
    service: native.getServiceStatus(),
    targets,
    usage,
    config: summarizeConfig(native.getConfig()),
    moment: JSON.parse(native.getMomentStatus()) as NativeMomentStatus,
    notifications: JSON.parse(native.getNotificationStatus()) as NativeNotificationStatus,
  };
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

// Ferramenta dos passos 1 a 5 da Fase 4, só em development: conferir no
// aparelho as permissões reais, o serviço em primeiro plano, o boot, a lista
// de apps, o uso de hoje, a configuração guardada no nativo e os eventos
// pendentes, antes de o módulo nativo substituir o falso (passo 7). Nas
// outras variantes, volta ao início. Vira parte das ferramentas de teste do
// passo 8 (spec 03, seção 5.10).
export default function DevMonitoringScreen() {
  const { t } = useTranslation(['dev', 'common']);
  const native = getQuedoMonitoring();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (native) setSnapshot(await readSnapshot(native));
  }, [native]);

  useEffect(() => {
    if (variant.environment !== 'development' || !native) return;
    let mounted = true;
    const load = () =>
      void readSnapshot(native).then((current) => {
        if (mounted) setSnapshot(current);
      });
    load();
    const timer = setInterval(load, REFRESH_MS);
    // Ao voltar dos Ajustes, as permissões podem ter mudado.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => {
      mounted = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [native]);

  if (variant.environment !== 'development') return <Redirect href="/" />;

  const permissionTexts = {
    granted: t('monitoring.permissions.granted'),
    denied: t('monitoring.permissions.denied'),
  } satisfies Record<NativePermissionState, string>;
  const permissionText = (state: NativePermissionState) => permissionTexts[state];
  const bootResultTexts = {
    started: t('monitoring.service.bootResults.started'),
    inactive: t('monitoring.service.bootResults.inactive'),
    no_usage_access: t('monitoring.service.bootResults.no_usage_access'),
    failed: t('monitoring.service.bootResults.failed'),
  } satisfies Record<NativeBootResult, string>;
  const yesNo = (value: boolean) => (value ? t('monitoring.yes') : t('monitoring.no'));
  const timeText = (epochMs: number | null) => formatTime(epochMs) ?? t('monitoring.never');

  const startService = async () => {
    if (!native) return;
    setMessage(null);
    try {
      await native.startMonitoring();
    } catch (error) {
      if (!hasCode(error, ERR_PERMISSION_REQUIRED)) throw error;
      setMessage(t('monitoring.service.usageRequired'));
    }
    await refresh();
  };

  const stopService = async () => {
    await native?.stopMonitoring();
    await refresh();
  };

  // A mesma rodada que o app faz ao abrir: importa os eventos e reenvia a configuração.
  const syncNow = async () => {
    await getAppMonitoringSync().sync();
    await refresh();
  };

  const toggleTestLimit = async () => {
    native?.setTestLimit(snapshot?.moment.testLimitMinutes ? null : TEST_LIMIT_MINUTES);
    await refresh();
  };

  const labelOf = (id: string) => snapshot?.targets.find((target) => target.id === id)?.label ?? id;
  const suggested = [...SUGGESTED_PACKAGES.short_video, ...SUGGESTED_PACKAGES.risk];
  const usage = [...(snapshot?.usage ?? [])]
    .sort((a, b) => b.milliseconds - a.milliseconds)
    .slice(0, USAGE_ROWS);

  return (
    <Screen>
      <Text variant="title">{t('monitoring.title')}</Text>
      <Text color="textMuted">{t('monitoring.description')}</Text>

      {!native ? <Text>{t('monitoring.missing')}</Text> : null}

      {native && snapshot ? (
        <>
          <Text variant="heading">{t('monitoring.permissions.title')}</Text>
          <Text>
            {t('monitoring.permissions.usageAccess', {
              state: permissionText(snapshot.permissions.usageAccess),
            })}
          </Text>
          <Text>
            {t('monitoring.permissions.notifications', {
              state: permissionText(snapshot.permissions.notifications),
            })}
          </Text>
          <Text>
            {t('monitoring.permissions.overlay', {
              state: permissionText(snapshot.permissions.overlay),
            })}
          </Text>
          <Button
            label={t('monitoring.permissions.openUsageAccess')}
            variant="secondary"
            onPress={() => void native.openUsageAccessSettings()}
          />
          <Button
            label={t('monitoring.permissions.openNotifications')}
            variant="secondary"
            onPress={() => void native.openNotificationSettings()}
          />
          <Button
            label={t('monitoring.permissions.openOverlay')}
            variant="secondary"
            onPress={() => void native.openOverlaySettings()}
          />

          <Text variant="heading">{t('monitoring.service.title')}</Text>
          <Text>{t('monitoring.service.active', { value: yesNo(snapshot.service.active) })}</Text>
          <Text>{t('monitoring.service.running', { value: yesNo(snapshot.service.running) })}</Text>
          <Text>
            {t('monitoring.service.checks', {
              count: snapshot.service.checks,
              time: timeText(snapshot.service.lastCheckAt),
            })}
          </Text>
          <Text>
            {t('monitoring.service.starts', {
              count: snapshot.service.serviceStarts,
              time: timeText(snapshot.service.serviceStartedAt),
            })}
          </Text>
          <Text>
            {t('monitoring.service.boot', {
              time: timeText(snapshot.service.lastBootAt),
              result: snapshot.service.lastBootResult
                ? bootResultTexts[snapshot.service.lastBootResult]
                : t('monitoring.never'),
            })}
          </Text>
          {message ? <Text color="danger">{message}</Text> : null}
          <Button label={t('monitoring.service.start')} onPress={() => void startService()} />
          <Button
            label={t('monitoring.service.stop')}
            variant="secondary"
            onPress={() => void stopService()}
          />

          <Text variant="heading">{t('monitoring.sync.title')}</Text>
          {snapshot.config ? (
            <Text>
              {t('monitoring.sync.config', {
                compulsions: snapshot.config.compulsions,
                moderation: snapshot.config.moderationRules,
                risk: snapshot.config.riskAppRules,
              })}
            </Text>
          ) : (
            <Text>{t('monitoring.sync.noConfig')}</Text>
          )}
          <Text>{t('monitoring.sync.pending', { count: snapshot.service.pendingEvents })}</Text>
          <Button
            label={t('monitoring.sync.now')}
            variant="secondary"
            onPress={() => void syncNow()}
          />

          <Text variant="heading">{t('monitoring.moment.title')}</Text>
          {Object.entries(snapshot.moment.rules.compulsions).map(([id, moment]) => (
            <Text key={id}>
              {t('monitoring.moment.compulsion', {
                id,
                interruptions: moment.interruptions,
                continues: moment.continues,
                stopped: yesNo(moment.stopped),
              })}
            </Text>
          ))}
          <Text>
            {t('monitoring.moment.foreground', {
              name: snapshot.moment.foreground
                ? labelOf(snapshot.moment.foreground)
                : t('monitoring.moment.none'),
            })}
          </Text>
          {Object.entries(snapshot.moment.usage)
            .sort(([, a], [, b]) => b - a)
            .slice(0, USAGE_ROWS)
            .map(([target, milliseconds]) => (
              <Text key={target}>
                {t('monitoring.usage.entry', {
                  name: labelOf(target),
                  minutes: Math.round(milliseconds / 60_000),
                })}
              </Text>
            ))}
          <Text>
            {snapshot.moment.lastShow
              ? t('monitoring.moment.lastShow', {
                  name: labelOf(snapshot.moment.lastShow.target),
                  time: timeText(snapshot.moment.lastShow.at),
                })
              : t('monitoring.moment.noShow')}
          </Text>
          <Button
            label={
              snapshot.moment.testLimitMinutes
                ? t('monitoring.moment.useRealLimits')
                : t('monitoring.moment.useTestLimit')
            }
            variant="secondary"
            onPress={() => void toggleTestLimit()}
          />

          <Text variant="heading">{t('monitoring.notifications.title')}</Text>
          <Text>
            {t('monitoring.notifications.status', {
              count: snapshot.notifications.state.proactiveSent,
              time: timeText(snapshot.notifications.nextWake),
            })}
          </Text>
          {snapshot.notifications.state.restartWaiting ? (
            <Text>{t('monitoring.notifications.restartWaiting')}</Text>
          ) : null}
          <Button
            label={t('monitoring.notifications.fireLimit')}
            variant="secondary"
            onPress={() => native.debugFireNotification('limit')}
          />
          <Button
            label={t('monitoring.notifications.fireCheckIn')}
            variant="secondary"
            onPress={() => native.debugFireNotification('check_in')}
          />
          <Button
            label={t('monitoring.notifications.firePreventive')}
            variant="secondary"
            onPress={() => native.debugFireNotification('preventive')}
          />
          <Button
            label={t('monitoring.notifications.fireRestart')}
            variant="secondary"
            onPress={() => native.debugFireNotification('restart')}
          />
          <Button
            label={t('monitoring.notifications.fireProtection')}
            variant="secondary"
            onPress={() => native.debugFireNotification('protection_paused')}
          />

          <Text variant="heading">{t('monitoring.suggested.title')}</Text>
          {suggested.map((id) => (
            <Text key={id}>
              {snapshot.targets.some((target) => target.id === id)
                ? t('monitoring.suggested.installed', { name: labelOf(id) })
                : t('monitoring.suggested.notInstalled', { name: id })}
            </Text>
          ))}

          <Text variant="heading">{t('monitoring.usage.title')}</Text>
          {snapshot.usage === null ? <Text>{t('monitoring.usage.denied')}</Text> : null}
          {snapshot.usage !== null && usage.length === 0 ? (
            <Text>{t('monitoring.usage.empty')}</Text>
          ) : null}
          {usage.map((entry) => (
            <Text key={entry.targetId}>
              {t('monitoring.usage.entry', {
                name: labelOf(entry.targetId),
                minutes: Math.round(entry.milliseconds / 60_000),
              })}
            </Text>
          ))}

          <Button
            label={t('monitoring.refresh')}
            variant="secondary"
            onPress={() => void refresh()}
          />
        </>
      ) : null}

      <Button label={t('common:actions.back')} variant="text" onPress={() => router.back()} />
    </Screen>
  );
}
