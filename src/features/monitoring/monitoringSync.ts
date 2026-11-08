import type { Repositories } from '@/data/repositories';
import type { MonitoringConfig, MonitoringSyncTarget, MonitoringTexts } from '@/monitoring';

import { buildMonitoringConfig } from './config';

// Sincronização com o monitoramento (spec 03, 4.2 e 4.3): primeiro importa os
// eventos do nativo para o banco, depois envia a configuração montada do
// banco já atualizado. Uma rodada por vez: um pedido durante uma rodada faz
// uma rodada a mais no fim, nunca duas ao mesmo tempo.

export type MonitoringSyncDeps = {
  repositories: () => Repositories;
  target: () => MonitoringSyncTarget;
  texts: () => MonitoringTexts;
  links: () => MonitoringConfig['links'];
  now?: () => Date;
  /** Só a contagem e um texto fixo: nada de dados do usuário (CLAUDE.md, seção 9). */
  report?: (message: string) => void;
};

export type MonitoringSync = {
  /** Roda agora (ou logo depois da rodada em andamento). Resolve no fim. */
  sync(): Promise<void>;
};

export function createMonitoringSync({
  repositories,
  target,
  texts,
  links,
  now = () => new Date(),
  report = (message) => console.error(message),
}: MonitoringSyncDeps): MonitoringSync {
  let running: Promise<void> | null = null;
  let again = false;

  async function runOnce(): Promise<void> {
    const monitoring = target();
    const repos = repositories();
    const { events, invalidIds } = await monitoring.getPendingEvents();
    const handled =
      events.length > 0
        ? repos.monitoringEvents.importEvents(events)
        : { handledIds: [], failed: 0 };
    if (handled.failed > 0 || invalidIds.length > 0) {
      report(
        `Monitoramento: ${handled.failed} evento(s) sem efeito e ${invalidIds.length} malformado(s)`,
      );
    }
    // Só depois de gravar no banco o nativo pode apagar (spec 03, 4.3).
    const ids = [...handled.handledIds, ...invalidIds];
    if (ids.length > 0) await monitoring.acknowledgeEvents(ids);
    await monitoring.configure(buildMonitoringConfig(repos, texts(), now(), links()));
  }

  async function loop(): Promise<void> {
    do {
      again = false;
      try {
        await runOnce();
      } catch {
        // A próxima abertura do app ou gravação tenta de novo.
        report('Monitoramento: falha ao sincronizar');
      }
    } while (again);
  }

  return {
    sync() {
      if (running) {
        again = true;
        return running;
      }
      running = loop().finally(() => {
        running = null;
      });
      return running;
    },
  };
}
