import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import monitoring, {
  type DomainWatchMode,
  type DomainWatchStatus,
  type InstalledApp,
  type LogEvent,
  type InterruptionMode,
  type PermissionState,
  type UsageEntry,
  type UsageLimitStatus,
} from '@/monitoring';

/** Tela de laboratório (spec seção 5.1). Uma seção por experimento. */
export default function LabScreen() {
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [usage, setUsage] = useState<UsageEntry[] | 'unsupported' | null>(null);
  const [usageSource, setUsageSource] = useState<string | null>(null);
  const [log, setLog] = useState<LogEvent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A2
  const [minutes, setMinutes] = useState('2');
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [filter, setFilter] = useState('');
  const [targets, setTargets] = useState<string[]>([]);
  const [limit, setLimit] = useState<UsageLimitStatus | null>(null);

  // A3
  const [notifications, setNotifications] = useState<PermissionState | null>(null);
  const [message, setMessage] = useState('Você atingiu o tempo que definiu para hoje.');

  // A4
  const [overlay, setOverlay] = useState<PermissionState | null>(null);
  const [interruptionMode, setInterruptionMode] = useState<InterruptionMode>('overlay');

  // A5
  const [pauseMinutes, setPauseMinutes] = useState('2');

  // A6
  const [vpn, setVpn] = useState<PermissionState | null>(null);
  const [domainsText, setDomainsText] = useState('example.com, example.org');
  const [watchMode, setWatchMode] = useState<DomainWatchMode>('alert');
  const [watch, setWatch] = useState<DomainWatchStatus | null>(null);

  const refreshLog = useCallback(async () => {
    setLog(await monitoring.getLog());
  }, []);

  const refreshPermission = useCallback(async () => {
    const status = await monitoring.getPermissionStatus();
    setPermission(status.usageAccess);
    setNotifications(status.notifications);
    setOverlay(status.overlay);
    setVpn(status.vpn);
  }, []);

  // Como no A2: a lista e o modo do A6 vêm do nativo na primeira leitura.
  const watchHydrated = useRef(false);

  const refreshWatch = useCallback(async () => {
    const status = await monitoring.getDomainWatchStatus();
    setWatch(status);
    setVpn(status.permission);
    if (!watchHydrated.current) {
      watchHydrated.current = true;
      if (status.domains.length) setDomainsText(status.domains.join(', '));
      setWatchMode(status.mode);
    }
  }, []);

  // A seleção de apps e o modo do A4 vivem só no estado do React, e se perdem
  // sempre que o protótipo é fechado pelos recentes. Na primeira leitura,
  // reaproveitamos o que o nativo guardou, para cada rodada de teste não exigir
  // refazer a lista.
  const hydrated = useRef(false);

  const refreshLimit = useCallback(async () => {
    const status = await monitoring.getUsageLimitStatus();
    setLimit(status);
    if (!hydrated.current) {
      hydrated.current = true;
      if (status.packages.length) setTargets(status.packages);
      setInterruptionMode(status.interruptionMode);
      if (status.pauseMinutes) setPauseMinutes(String(status.pauseMinutes));
    }
  }, []);

  /** Envolve cada ação para nenhuma falha nativa sumir em silêncio. */
  const run = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setBusy(label);
      setError(null);
      try {
        await action();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setBusy(null);
        await refreshLog();
        await refreshLimit();
        await refreshWatch();
      }
    },
    [refreshLog, refreshLimit, refreshWatch]
  );

  // O acesso a dados de uso é concedido fora do app, nos Ajustes do sistema, e o
  // serviço do A2 escreve no log enquanto estamos fora. Por isso relemos tudo a
  // cada volta ao primeiro plano.
  useEffect(() => {
    const sync = () => {
      void refreshPermission();
      void refreshLog();
      void refreshLimit();
      void refreshWatch();
    };
    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
  }, [refreshPermission, refreshLog, refreshLimit, refreshWatch]);

  const toggleTarget = (packageName: string) => {
    setTargets((current) =>
      current.includes(packageName)
        ? current.filter((p) => p !== packageName)
        : [...current, packageName]
    );
  };

  const visibleApps = filter
    ? apps.filter((a) => a.appLabel.toLowerCase().includes(filter.toLowerCase()))
    : apps.slice(0, 8);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Laboratório de monitoramento</Text>
        <Text style={styles.subtitle}>
          Fase 1 · {Platform.OS} {Platform.Version}
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Section title="A1 — Tempo de uso por app">
          <Row label="Acesso a dados de uso" value={permissionLabel(permission)} />

          <View style={styles.rowButtons}>
            <Button
              label="Pedir acesso"
              compact
              busy={busy === 'request'}
              onPress={() => run('request', async () => void monitoring.requestPermissions())}
            />
            <Button
              label="Atualizar"
              compact
              busy={busy === 'status'}
              onPress={() => run('status', refreshPermission)}
            />
          </View>

          <View style={styles.rowButtons}>
            <Button
              label="Ler (agregado)"
              compact
              busy={busy === 'usage'}
              onPress={() =>
                run('usage', async () => {
                  setUsage(await monitoring.getUsageToday());
                  setUsageSource('queryAndAggregateUsageStats');
                })
              }
            />
            <Button
              label="Ler (eventos)"
              compact
              busy={busy === 'usageEvents'}
              onPress={() =>
                run('usageEvents', async () => {
                  setUsage(await monitoring.getUsageTodayFromEvents());
                  setUsageSource('queryEvents');
                })
              }
            />
          </View>

          {usageSource ? <Text style={styles.note}>fonte: {usageSource}</Text> : null}

          {usage === 'unsupported' ? (
            <Text style={styles.note}>unsupported nesta plataforma</Text>
          ) : usage && usage.length === 0 ? (
            <Text style={styles.note}>Nenhum app com uso registrado hoje.</Text>
          ) : (
            usage?.map((entry) => (
              <Row
                key={entry.packageName}
                label={entry.appLabel}
                value={formatDuration(entry.milliseconds)}
                hint={entry.packageName}
              />
            ))
          )}
        </Section>

        <Section title="A2 — Limite de uso com o app fechado">
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Limite (minutos)</Text>
            <TextInput
              style={styles.input}
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
              placeholder="2"
              placeholderTextColor="#475569"
            />
          </View>

          <Button
            label={apps.length ? `Recarregar apps (${apps.length})` : 'Carregar lista de apps'}
            busy={busy === 'apps'}
            onPress={() =>
              run('apps', async () => {
                const selection = await monitoring.selectTargets();
                setApps(selection === 'unsupported' ? [] : selection.apps);
              })
            }
          />

          {apps.length > 0 ? (
            <>
              <TextInput
                style={styles.input}
                value={filter}
                onChangeText={setFilter}
                placeholder="filtrar por nome (ex.: Instagram)"
                placeholderTextColor="#475569"
              />
              {visibleApps.map((app) => {
                const selected = targets.includes(app.packageName);
                return (
                  <Pressable
                    key={app.packageName}
                    onPress={() => toggleTarget(app.packageName)}
                    style={[styles.appRow, selected && styles.appRowSelected]}>
                    <Text style={styles.appLabel}>
                      {selected ? '✓ ' : ''}
                      {app.appLabel}
                    </Text>
                    <Text style={styles.rowHint}>{app.packageName}</Text>
                  </Pressable>
                );
              })}
              {!filter && apps.length > 8 ? (
                <Text style={styles.note}>
                  Mostrando 8 de {apps.length}. Use o filtro para achar os demais.
                </Text>
              ) : null}
            </>
          ) : null}

          <Row
            label="Apps selecionados"
            value={String(targets.length)}
            hint={targets.length ? targets.join(', ') : undefined}
          />

          <View style={styles.rowButtons}>
            <Button
              label="Iniciar limite"
              compact
              busy={busy === 'startLimit'}
              onPress={() =>
                run('startLimit', async () => {
                  await monitoring.startUsageLimit({
                    minutes: Number(minutes) || 1,
                    packages: targets,
                    message,
                    interruptionMode,
                    pauseMinutes: Number(pauseMinutes) || 1,
                  });
                })
              }
            />
            <Button
              label="Parar"
              compact
              busy={busy === 'stopLimit'}
              onPress={() => run('stopLimit', () => monitoring.stopUsageLimit())}
            />
          </View>

          {limit ? (
            <>
              <Row label="Serviço" value={limit.active ? 'ativo' : 'parado'} />
              {limit.active ? (
                <Row label="Limite configurado" value={`${limit.minutes} min`} />
              ) : null}
              <Row
                label="Limite atingido"
                value={limit.firedAt ? new Date(limit.firedAt).toLocaleTimeString('pt-BR') : 'não'}
              />
            </>
          ) : null}
        </Section>

        <Section title="A3 — Alerta de nível 1 (notificação)">
          <Row label="Permissão de notificação" value={permissionLabel(notifications)} />

          <View style={styles.rowButtons}>
            <Button
              label="Pedir permissão"
              compact
              busy={busy === 'askNotif'}
              onPress={() =>
                run('askNotif', async () => {
                  await monitoring.requestNotificationPermission();
                })
              }
            />
            <Button
              label="Ajustes"
              compact
              busy={busy === 'notifSettings'}
              onPress={() =>
                run('notifSettings', async () => {
                  await monitoring.openNotificationSettings();
                })
              }
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Texto do alerta — precisa ser neutro na tela bloqueada (C2)
            </Text>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="Você atingiu o tempo que definiu para hoje."
              placeholderTextColor="#475569"
            />
          </View>

          <Text style={styles.note}>
            O texto acima é salvo ao tocar em &quot;Iniciar limite&quot;, na seção A2.
          </Text>

          <Button
            label="Disparar alerta de teste"
            busy={busy === 'testAlert'}
            onPress={() =>
              run('testAlert', async () => {
                await monitoring.sendTestAlert();
              })
            }
          />
        </Section>

        <Section title="A4 — Alerta de nível 2 (tela de interrupção)">
          <Row label="Aparecer sobre outros apps" value={permissionLabel(overlay)} />

          <Button
            label="Pedir permissão de sobreposição"
            busy={busy === 'askOverlay'}
            onPress={() =>
              run('askOverlay', async () => {
                await monitoring.requestOverlayPermission();
              })
            }
          />

          <Text style={styles.fieldLabel}>Abordagem (a spec pede comparar as duas)</Text>
          <View style={styles.rowButtons}>
            <Button
              label={interruptionMode === 'overlay' ? '✓ Sobreposição' : 'Sobreposição'}
              compact
              onPress={() => setInterruptionMode('overlay')}
            />
            <Button
              label={interruptionMode === 'activity' ? '✓ Tela própria' : 'Tela própria'}
              compact
              onPress={() => setInterruptionMode('activity')}
            />
          </View>

          <Text style={styles.note}>
            A escolha é salva ao tocar em &quot;Iniciar limite&quot;. Depois que o limite estourar, o
            serviço escala para esta tela se você ainda estiver no app monitorado.
          </Text>

          <Button
            label="Fechar interrupção (se travar)"
            busy={busy === 'hideInt'}
            onPress={() =>
              run('hideInt', async () => {
                await monitoring.hideInterruption();
              })
            }
          />

          {limit?.escalatedAt ? (
            <Row
              label="Última interrupção"
              value={new Date(limit.escalatedAt).toLocaleTimeString('pt-BR')}
            />
          ) : null}
        </Section>

        <Section title="A5 — Pausa depois de continuar">
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Pausa (minutos)</Text>
            <TextInput
              style={styles.input}
              value={pauseMinutes}
              onChangeText={setPauseMinutes}
              keyboardType="number-pad"
              placeholder="2"
              placeholderTextColor="#475569"
            />
          </View>

          <Text style={styles.note}>
            Salva ao tocar em &quot;Iniciar limite&quot;. Só &quot;Continuar mesmo assim&quot; pausa
            os alertas. &quot;Ir para a tela inicial&quot; e &quot;Emergência&quot; não pausam: reabrir o
            app monitorado interrompe de novo. No fim da pausa vem a notificação e, se o uso
            continuar, a tela de interrupção.
          </Text>

          <Row
            label="Pausa em curso"
            value={
              limit?.pausedUntil
                ? `até ${new Date(limit.pausedUntil).toLocaleTimeString('pt-BR')}`
                : 'não'
            }
          />
        </Section>

        <Section title="A6 — Domínios da lista (VPN local)">
          <Row label="Autorização da VPN" value={permissionLabel(vpn)} />

          <Button
            label="Autorizar VPN"
            busy={busy === 'askVpn'}
            onPress={() =>
              run('askVpn', async () => {
                await monitoring.requestVpnPermission();
              })
            }
          />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              Domínios de teste, separados por vírgula (inofensivos, CLAUDE.md §9)
            </Text>
            <TextInput
              style={styles.input}
              value={domainsText}
              onChangeText={setDomainsText}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="example.com, example.org"
              placeholderTextColor="#475569"
            />
          </View>

          <Text style={styles.fieldLabel}>Modo</Text>
          <View style={styles.rowButtons}>
            <Button
              label={watchMode === 'alert' ? '✓ Alerta' : 'Alerta'}
              compact
              onPress={() => setWatchMode('alert')}
            />
            <Button
              label={watchMode === 'block' ? '✓ Bloqueio' : 'Bloqueio'}
              compact
              onPress={() => setWatchMode('block')}
            />
          </View>

          <View style={styles.rowButtons}>
            <Button
              label="Iniciar"
              compact
              busy={busy === 'startVpn'}
              onPress={() =>
                run('startVpn', () =>
                  monitoring.startAdultContentWatch({
                    mode: watchMode,
                    domains: domainsText.split(/[\s,;]+/).filter(Boolean),
                  })
                )
              }
            />
            <Button
              label="Parar"
              compact
              busy={busy === 'stopVpn'}
              onPress={() => run('stopVpn', () => monitoring.stopAdultContentWatch())}
            />
            <Button
              label="Atualizar"
              compact
              busy={busy === 'watchStatus'}
              onPress={() => run('watchStatus', refreshWatch)}
            />
          </View>

          {watch ? (
            <Row
              label="VPN"
              value={
                watch.running ? `ativa · ${watch.mode === 'block' ? 'bloqueio' : 'alerta'}` : 'parada'
              }
              hint={watch.domains.length ? watch.domains.join(', ') : undefined}
            />
          ) : null}
          {watch?.stats ? (
            <Row
              label="Consultas de DNS"
              value={`${watch.stats.queries} · na lista ${watch.stats.detected}`}
              hint={
                `repassadas ${watch.stats.forwarded} · sem resposta ${watch.stats.failed} · ` +
                `bloqueadas ${watch.stats.blocked} · outros pacotes ${watch.stats.otherPackets} · ` +
                `ida e volta ${watch.stats.averageUpstreamMs.toFixed(1)} ms`
              }
            />
          ) : null}

          <Text style={styles.note}>
            Só as consultas de DNS passam pela VPN; o resto do tráfego segue direto. Para
            testar, abra no navegador um domínio da lista. O modo é salvo ao tocar em
            &quot;Iniciar&quot;.
          </Text>
        </Section>

        <Section title={`S4 — Log compartilhado (${log.length})`}>
          <View style={styles.rowButtons}>
            <Button
              label="Copiar"
              compact
              busy={busy === 'copy'}
              onPress={() =>
                run('copy', async () => {
                  await Clipboard.setStringAsync(JSON.stringify(log, null, 2));
                })
              }
            />
            <Button
              label="Limpar"
              compact
              busy={busy === 'clear'}
              onPress={() => run('clear', () => monitoring.clearLog())}
            />
          </View>

          {log.length === 0 ? (
            <Text style={styles.note}>Log vazio.</Text>
          ) : (
            log.map((entry, index) => (
              <View key={`${entry.timestamp}-${index}`} style={styles.logEntry}>
                <Text style={styles.logHeader}>
                  {entry.timestamp.slice(11, 19)} · {entry.source} · {entry.experiment}
                </Text>
                <Text
                  style={[
                    styles.logEvent,
                    entry.event === 'threshold_reached' && styles.logEventHighlight,
                  ]}>
                  {entry.event}
                </Text>
                {entry.details ? <Text style={styles.logDetails}>{entry.details}</Text> : null}
              </View>
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Text style={styles.rowLabelText}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Button({
  label,
  onPress,
  busy,
  compact,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={busy}>
      {busy ? (
        <ActivityIndicator color="#0B1220" size="small" />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

function permissionLabel(state: PermissionState | null): string {
  if (state === null) return '...';
  if (state === 'granted') return 'concedido';
  if (state === 'denied') return 'negado';
  return 'unsupported';
}

function formatDuration(milliseconds: number): string {
  // Abaixo de um minuto mostramos segundos: arredondar tudo para "0 min"
  // esconderia justamente as diferenças que estamos tentando medir.
  if (milliseconds < 60_000) return `${Math.round(milliseconds / 1000)} s`;
  const totalMinutes = Math.round(milliseconds / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const rest = totalMinutes % 60;
  return `${hours} h ${String(rest).padStart(2, '0')} min`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B1220' },
  content: { padding: 16, paddingBottom: 64, gap: 16 },
  title: { color: '#F8FAFC', fontSize: 21, fontWeight: '700' },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: -12 },
  section: { backgroundColor: '#111B2E', borderRadius: 12, padding: 14, gap: 10 },
  sectionTitle: { color: '#93C5FD', fontSize: 15, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  rowLabel: { flex: 1 },
  rowLabelText: { color: '#E2E8F0', fontSize: 14 },
  rowHint: { color: '#475569', fontSize: 11 },
  rowValue: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  rowButtons: { flexDirection: 'row', gap: 10 },
  field: { gap: 6 },
  fieldLabel: { color: '#94A3B8', fontSize: 12 },
  input: {
    backgroundColor: '#0B1220',
    borderColor: '#1E3A5F',
    borderWidth: 1,
    borderRadius: 8,
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
  },
  appRow: {
    borderLeftWidth: 2,
    borderLeftColor: '#1E3A5F',
    paddingLeft: 10,
    paddingVertical: 6,
  },
  appRowSelected: { borderLeftColor: '#38BDF8' },
  appLabel: { color: '#E2E8F0', fontSize: 14 },
  button: {
    backgroundColor: '#38BDF8',
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  buttonCompact: { flex: 1 },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: '#0B1220', fontSize: 14, fontWeight: '600' },
  note: { color: '#94A3B8', fontSize: 12, lineHeight: 17 },
  errorBox: { backgroundColor: '#3F1D24', borderRadius: 8, padding: 12 },
  errorText: { color: '#FCA5A5', fontSize: 13 },
  logEntry: {
    borderLeftWidth: 2,
    borderLeftColor: '#1E3A5F',
    paddingLeft: 10,
    paddingVertical: 3,
  },
  logHeader: { color: '#64748B', fontSize: 11 },
  logEvent: { color: '#E2E8F0', fontSize: 13 },
  logEventHighlight: { color: '#4ADE80', fontWeight: '700' },
  logDetails: { color: '#94A3B8', fontSize: 12 },
});
