import type { Repositories, UserCompulsion } from '@/data/repositories';
import { computeBaseline, type BaselineResult } from '@/domain/baseline';
import { getCompulsionDefinition } from '@/domain/compulsion';
import { addCalendarDays, toDayKey } from '@/domain/day';
import { buildHourlyRows, type CompulsionApps, type InterruptionSpan } from '@/domain/usageHistory';
import { UNSUPPORTED, type MonitoringModule } from '@/monitoring';

// Histórico de uso e ponto de partida (spec 04, 4.4 e 5.7). O JS consulta o
// nativo ao abrir o app e ao voltar do segundo plano, depois da sincronização
// do monitoramento (que importa as telas de interrupção), grava no banco de
// forma idempotente e calcula o ponto de partida que ainda falta.

/** Quantos dias para trás pedir: o que o nativo guarda (`UsageHistory.KEEP_DAYS`). */
export const USAGE_HISTORY_DAYS = 21;

export type UsageHistorySyncDeps = {
  repositories: () => Repositories;
  target: () => MonitoringModule;
  now?: () => Date;
  /** Só um texto fixo: nada de dados do usuário (CLAUDE.md, seção 9). */
  report?: (message: string) => void;
};

export type UsageHistorySync = {
  /** Importa o histórico e calcula o ponto de partida. Uma rodada por vez. */
  sync(): Promise<void>;
};

const SECONDS_PER_MINUTE = 60;

function moderationCompulsions(repositories: Repositories): UserCompulsion[] {
  return repositories.compulsions
    .list()
    .filter(
      (compulsion) =>
        compulsion.status === 'active' &&
        getCompulsionDefinition(compulsion.type).mechanic === 'moderation',
    );
}

/** Minutos de uso por dia de uma compulsão, das linhas do banco. */
export function minutesByDay(
  repositories: Repositories,
  compulsionId: number,
): Map<string, number> {
  const seconds = new Map<string, number>();
  for (const row of repositories.usageHistory.listByCompulsion(compulsionId)) {
    seconds.set(row.dayKey, (seconds.get(row.dayKey) ?? 0) + row.seconds);
  }
  return new Map([...seconds].map(([day, total]) => [day, Math.floor(total / SECONDS_PER_MINUTE)]));
}

/** O ponto de partida de uma compulsão de moderação com o que está no banco. */
export function evaluateBaseline(
  repositories: Repositories,
  compulsion: UserCompulsion,
  now: Date,
): BaselineResult | null {
  const since = repositories.settings.get().usageHistorySince;
  if (since === null) return null;
  const minutes = minutesByDay(repositories, compulsion.id);
  return computeBaseline({
    startDayKey: toDayKey(compulsion.startedAt),
    historySinceDayKey: since,
    todayKey: toDayKey(now),
    coveredDayKeys: new Set(repositories.usageHistory.listCoveredDayKeys()),
    minutesOn: (day) => minutes.get(day) ?? 0,
  });
}

export function createUsageHistorySync({
  repositories,
  target,
  now = () => new Date(),
  report = (message) => console.error(message),
}: UsageHistorySyncDeps): UsageHistorySync {
  let running: Promise<void> | null = null;

  async function runOnce(): Promise<void> {
    const repos = repositories();
    const compulsions = moderationCompulsions(repos);
    if (compulsions.length === 0) return;
    const monitoring = target();
    const { usageAccess } = await monitoring.getPermissionStatus();
    if (usageAccess !== 'granted') return;

    const today = now();
    const history = await monitoring.getUsageHistory(
      toDayKey(addCalendarDays(today, -USAGE_HISTORY_DAYS)),
    );
    if (history === UNSUPPORTED) return;

    // As telas de interrupção de todas as compulsões: a tela cobre o app, seja qual for a regra.
    const interruptions: InterruptionSpan[] = repos.compulsions
      .list()
      .flatMap((compulsion) => repos.monitoringEvents.listInterruptions(compulsion.id))
      .map((event) => ({
        appPackage: event.appPackage,
        shownAt: event.shownAt,
        respondedAt: event.respondedAt,
      }));
    const apps: CompulsionApps[] = compulsions.map((compulsion) => ({
      compulsionId: compulsion.id,
      appPackages: repos.monitoredApps
        .listByCompulsion(compulsion.id)
        .filter((app) => app.role === 'short_video')
        .map((app) => app.packageName),
    }));

    if (repos.settings.get().usageHistorySince === null) {
      repos.settings.setUsageHistorySince(toDayKey(today));
    }
    if (history.days.length > 0) {
      repos.usageHistory.importDays(
        compulsions.map((compulsion) => compulsion.id),
        history.days.map((day) => ({
          dayKey: day.dayKey,
          covered: day.covered,
          rows: buildHourlyRows(day, apps, interruptions),
        })),
      );
    }

    // Calculado uma vez: depois de guardado, mudar os apps não recalcula (5.7).
    for (const compulsion of compulsions) {
      if (compulsion.baselineMinutesPerDay !== null) continue;
      const result = evaluateBaseline(repos, compulsion, today);
      if (result?.status === 'ready') {
        repos.compulsions.setBaseline(compulsion.id, result.minutesPerDay, result.source);
      }
    }
  }

  return {
    sync() {
      running ??= runOnce()
        .catch(() => report('Histórico de uso: falha ao importar'))
        .finally(() => {
          running = null;
        });
      return running;
    },
  };
}
