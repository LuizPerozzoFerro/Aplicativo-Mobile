import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import monitoring, {
  type LogEvent,
  type PermissionState,
  type UsageEntry,
} from '@/monitoring';

/**
 * Tela de laboratorio (spec secao 5.1).
 *
 * Uma secao por experimento. Os campos de motivacao e de limite em minutos
 * previstos na spec entram no A2, quando passarem a ter efeito -- por ora
 * seriam campos mortos.
 */
export default function LabScreen() {
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [usage, setUsage] = useState<UsageEntry[] | 'unsupported' | null>(null);
  const [appCount, setAppCount] = useState<number | 'unsupported' | null>(null);
  const [log, setLog] = useState<LogEvent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshLog = useCallback(async () => {
    setLog(await monitoring.getLog());
  }, []);

  const refreshPermission = useCallback(async () => {
    const status = await monitoring.getPermissionStatus();
    setPermission(status.usageAccess);
  }, []);

  /** Envolve cada acao para nenhuma falha nativa sumir em silencio. */
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
      }
    },
    [refreshLog]
  );

  // O acesso a dados de uso e concedido fora do app, na tela de Ajustes do
  // sistema. Por isso relemos o status na abertura e toda vez que o app volta ao
  // primeiro plano -- e a unica forma de a tela perceber que o usuario concedeu.
  useEffect(() => {
    const sync = () => {
      void refreshPermission();
      void refreshLog();
    };

    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        sync();
      }
    });
    return () => subscription.remove();
  }, [refreshPermission, refreshLog]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Laboratório de monitoramento</Text>
        <Text style={styles.subtitle}>
          Fase 1 · plataforma: {Platform.OS} {Platform.Version}
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Section title="A1 — Tempo de uso por app">
          <Row label="Acesso a dados de uso" value={permissionLabel(permission)} />

          <Button
            label="Pedir acesso (abre os Ajustes)"
            busy={busy === 'request'}
            onPress={() =>
              run('request', async () => {
                await monitoring.requestPermissions();
              })
            }
          />

          <Button
            label="Atualizar status"
            busy={busy === 'status'}
            onPress={() => run('status', refreshPermission)}
          />

          <Button
            label="Ler uso de hoje"
            busy={busy === 'usage'}
            onPress={() =>
              run('usage', async () => {
                setUsage(await monitoring.getUsageToday());
              })
            }
          />

          {usage === 'unsupported' ? (
            <Text style={styles.note}>unsupported nesta plataforma</Text>
          ) : usage ? (
            usage.length === 0 ? (
              <Text style={styles.note}>
                Nenhum app com uso registrado hoje. Use algum app por alguns minutos e leia de novo.
              </Text>
            ) : (
              usage.map((entry) => (
                <Row
                  key={entry.packageName}
                  label={entry.appLabel}
                  value={formatDuration(entry.milliseconds)}
                  hint={entry.packageName}
                />
              ))
            )
          ) : null}

          <Button
            label="Listar apps instalados"
            busy={busy === 'apps'}
            onPress={() =>
              run('apps', async () => {
                const selection = await monitoring.selectTargets();
                setAppCount(selection === 'unsupported' ? 'unsupported' : selection.apps.length);
              })
            }
          />

          {appCount !== null ? (
            <Text style={styles.note}>
              {appCount === 'unsupported'
                ? 'unsupported nesta plataforma'
                : `${appCount} apps visíveis via <queries> MAIN/LAUNCHER`}
            </Text>
          ) : null}
        </Section>

        <Section title={`S4 — Log compartilhado (${log.length})`}>
          <Button
            label="Escrever evento de teste"
            busy={busy === 'test'}
            onPress={() =>
              run('test', async () => {
                await monitoring.logEvent('S4', 'test_event', 'escrito pela camada JavaScript');
              })
            }
          />

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
              onPress={() =>
                run('clear', async () => {
                  await monitoring.clearLog();
                })
              }
            />
          </View>

          {log.length === 0 ? (
            <Text style={styles.note}>Log vazio.</Text>
          ) : (
            log.map((entry, index) => (
              <View key={`${entry.timestamp}-${index}`} style={styles.logEntry}>
                <Text style={styles.logHeader}>
                  {entry.timestamp.slice(11, 23)} · {entry.source} · {entry.experiment}
                </Text>
                <Text style={styles.logEvent}>{entry.event}</Text>
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
  const totalMinutes = Math.round(milliseconds / 60_000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${String(minutes).padStart(2, '0')} min`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B1220' },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  title: { color: '#F8FAFC', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: -12 },
  section: {
    backgroundColor: '#111B2E',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
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
  errorBox: {
    backgroundColor: '#3F1D24',
    borderRadius: 8,
    padding: 12,
  },
  errorText: { color: '#FCA5A5', fontSize: 13 },
  logEntry: {
    borderLeftWidth: 2,
    borderLeftColor: '#1E3A5F',
    paddingLeft: 10,
    paddingVertical: 3,
  },
  logHeader: { color: '#64748B', fontSize: 11 },
  logEvent: { color: '#E2E8F0', fontSize: 13 },
  logDetails: { color: '#94A3B8', fontSize: 12 },
});
