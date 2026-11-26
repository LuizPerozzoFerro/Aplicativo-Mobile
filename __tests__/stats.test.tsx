import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { AppState } from 'react-native';

import type { DatabaseState } from '@/data/bootstrap';
import { dataChanges, observeRepositories } from '@/data/changes';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { addCalendarDays, toDayKey } from '@/domain/day';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { asTargetId, FakeMonitoringModule } from '@/monitoring';

// Aba Estatísticas (spec 04, 5.8) sobre as rotas reais. Banco sql.js e
// monitoramento falso novos a cada teste. As datas seguem o relógio real.
const mockDatabaseState = jest.fn<DatabaseState, []>(() => ({ status: 'ready' }));
let mockRepositories: Repositories;
jest.mock('@/data/bootstrap', () => ({
  useDatabase: () => mockDatabaseState(),
  getRepositories: () => mockRepositories,
}));
let mockMonitoring: FakeMonitoringModule;
jest.mock('@/monitoring', () => ({
  ...jest.requireActual('@/monitoring'),
  getMonitoring: () => mockMonitoring,
}));

const APP_DIR = './app';
const CLIPS = 'com.example.clips';
const FEED = 'com.example.feed';
const FORUM = 'com.example.forum';
const daysAgo = (days: number) => addCalendarDays(new Date(), -days);
const dayKeyAgo = (days: number) => toDayKey(daysAgo(days));
const at = (days: number, hour: number, minute = 0) => {
  const day = daysAgo(days);
  day.setHours(hour, minute);
  return day;
};
let nextId = 1;

function addVideos(startedDaysAgo: number) {
  return mockRepositories.compulsions.add({
    type: 'short_videos',
    startedAt: daysAgo(startedDaysAgo),
    dailyLimitMinutes: 30,
  });
}

function addAdult(startedDaysAgo: number) {
  const adult = mockRepositories.compulsions.add({
    type: 'pornography',
    startedAt: daysAgo(startedDaysAgo),
  });
  mockRepositories.compulsions.setInitialStreakDays(adult.id, 0);
  return adult;
}

/** Uso de um app numa hora, em minutos, por dia (dias atrás). */
function importUsage(compulsionId: number, days: Record<number, [number, number, string][]>) {
  mockRepositories.usageHistory.importDays(
    [compulsionId],
    Object.entries(days).map(([ago, rows]) => {
      const dayKey = dayKeyAgo(Number(ago));
      return {
        dayKey,
        covered: true,
        rows: rows.map(([hour, minutes, appPackage]) => ({
          dayKey,
          hour,
          compulsionId,
          appPackage,
          seconds: minutes * 60,
        })),
      };
    }),
  );
}

beforeEach(async () => {
  mockRepositories = observeRepositories(
    createRepositories((await createTestDatabase()).db),
    dataChanges.notify,
  );
  mockMonitoring = new FakeMonitoringModule({ permissions: { usageAccess: 'granted' } });
  onboardingStatus.setCompleted(true);
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  nextId = 1;
});
afterEach(() => jest.restoreAllMocks());

const card = async (testID: string) => within(await screen.findByTestId(testID));

describe('aba Estatísticas', () => {
  it('sem compulsão ativa: estado vazio e a seção geral', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/stats' });
    expect(await screen.findByTestId('stats-empty')).toBeOnTheScreen();
    const general = await card('stats-general');
    expect(general.getByText('O botão de emergência ainda não foi usado')).toBeOnTheScreen();
    expect(general.getByText('Nenhuma vitória registrada ainda')).toBeOnTheScreen();
  });

  it('vídeos curtos sem dados: estados vazios explicando a partir de quando', async () => {
    addVideos(0);
    await renderRouter(APP_DIR, { initialUrl: '/stats' });
    const usage = await card('stats-usage');
    expect(usage.getAllByText(/Ainda sem dados de uso/)).toHaveLength(2);
    expect(screen.getByTestId('stats-hours-pending')).toHaveTextContent(/Disponível a partir de/);
    expect(
      within(screen.getByTestId('stats-recovered')).getByText(
        /depois de uma semana com dados de uso/,
      ),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('stats-alerts')).getByText('Nenhuma tela de interrupção até agora'),
    ).toBeOnTheScreen();
  });

  it('vídeos curtos com dados: gráficos lidos em texto, faixas de gatilho e o resto', async () => {
    const videos = addVideos(10);
    mockRepositories.compulsions.setBaseline(videos.id, 40, 'before_start');
    importUsage(videos.id, {
      2: [[21, 45, CLIPS]],
      1: [
        [21, 15, CLIPS],
        [8, 10, FEED],
      ],
      0: [[9, 5, CLIPS]],
    });
    mockRepositories.triggers.replaceAll([{ kind: 'time', value: '21:00-22:00' }]);
    mockRepositories.dayStates.markFailed(
      { compulsionId: videos.id, dayKey: dayKeyAgo(2) },
      'ignored_limit',
    );
    const shown = { id: 'tela-1', at: at(1, 21, 5).getTime(), dayKey: dayKeyAgo(1) };
    mockRepositories.monitoringEvents.importEvents([
      {
        ...shown,
        type: 'interruption_shown',
        compulsionId: videos.id,
        targetId: asTargetId(CLIPS),
      },
      {
        id: 'resposta-1',
        at: shown.at + 1000,
        dayKey: shown.dayKey,
        type: 'interruption_response',
        interruptionId: shown.id,
        compulsionId: videos.id,
        response: 'home',
      },
    ]);
    await renderRouter(APP_DIR, { initialUrl: '/stats' });

    const daily = await screen.findByTestId('stats-daily');
    expect(daily).toHaveAccessibleName(
      /^Uso por dia nos últimos 7 dias\. Limite diário: 30 minutos\./,
    );
    expect(daily).toHaveAccessibleName(/45 minutos, acima do limite/);
    expect(daily).toHaveAccessibleName(/Hoje: 5 minutos\.$/);
    expect(within(daily).getByText('Hoje')).toBeOnTheScreen();
    expect(screen.getByTestId('stats-weekly')).toHaveAccessibleName(
      /1 hora e 15 minutos, 3 de 7 dias com dados/,
    );

    const hours = screen.getByTestId('stats-hours');
    expect(hours).toHaveAccessibleName(/21 horas: 30 minutos, faixa de gatilho/);
    expect(hours).toHaveAccessibleName(/8 horas: 5 minutos/);
    expect(screen.getByTestId('stats-hours-trigger-21')).toBeOnTheScreen();
    expect(screen.queryByTestId('stats-hours-trigger-8')).toBeNull();
    expect(screen.getByText('Mais uso: das 21h às 22h')).toBeOnTheScreen();
    expect(screen.getByText(/Faixas de horário que você marcou/)).toBeOnTheScreen();

    // Dias completos com histórico: ontem (40 - 25 = 15) e anteontem (45, acima: não desconta).
    const recovered = within(screen.getByTestId('stats-recovered'));
    expect(recovered.getByText('15 min desde o início')).toBeOnTheScreen();
    expect(
      recovered.getByText(/40 min por dia, a média dos 7 dias antes do início/),
    ).toBeOnTheScreen();

    const alerts = within(screen.getByTestId('stats-alerts'));
    expect(alerts.getByText('1 tela de interrupção')).toBeOnTheScreen();
    expect(alerts.getByText('Respeitados: 1')).toBeOnTheScreen();
    expect(alerts.getByText('Ignorados: 0')).toBeOnTheScreen();

    const days = within(screen.getByTestId('stats-days'));
    expect(days.getByText('Aprovados: 9')).toBeOnTheScreen();
    expect(days.getByText('Reprovados: 1')).toBeOnTheScreen();

    const streaks = within(screen.getByTestId('stats-streaks'));
    expect(streaks.getByText('Atual: 2 dias')).toBeOnTheScreen();
    expect(streaks.getByText('Maior: 8 dias')).toBeOnTheScreen();
  });

  it('filtro por app troca o uso por dia', async () => {
    const videos = addVideos(5);
    importUsage(videos.id, {
      0: [
        [9, 20, CLIPS],
        [9, 7, FEED],
      ],
    });
    await renderRouter(APP_DIR, { initialUrl: '/stats' });
    expect(await screen.findByTestId('stats-daily')).toHaveAccessibleName(/Hoje: 27 minutos/);

    await userEvent.setup().press(await screen.findByRole('radio', { name: 'Example Feed' }));
    await waitFor(() =>
      expect(screen.getByTestId('stats-daily')).toHaveAccessibleName(/Hoje: 7 minutos/),
    );
  });

  it('sem o acesso ao uso: os minutos mostram o motivo e o botão; o resto continua', async () => {
    mockMonitoring = new FakeMonitoringModule();
    const videos = addVideos(5);
    importUsage(videos.id, { 1: [[9, 20, CLIPS]] });
    await renderRouter(APP_DIR, { initialUrl: '/stats' });

    const notice = await card('stats-no-access');
    expect(notice.getByText(/não consegue medir os minutos/)).toBeOnTheScreen();
    expect(screen.queryByTestId('stats-usage')).toBeNull();
    expect(screen.queryByTestId('stats-hours-card')).toBeNull();
    expect(screen.queryByTestId('stats-recovered')).toBeNull();
    expect(screen.getByTestId('stats-days')).toBeOnTheScreen();
    expect(screen.getByTestId('stats-streaks')).toBeOnTheScreen();

    await userEvent.setup().press(notice.getByRole('button', { name: 'Ver o que fazer' }));
    await waitFor(() => expect(screen).toHavePathname('/permission-status'));
  });

  it('conteúdo adulto: sequências, check-ins e avisos dos apps de risco, sem minutos', async () => {
    const adult = addAdult(20);
    mockRepositories.relapses.record({ compulsionId: adult.id, dayKey: dayKeyAgo(5) });
    mockRepositories.triggers.replaceAll([{ kind: 'time', value: '22:00-00:00' }]);
    mockRepositories.monitoringEvents.importEvents([
      {
        id: `aviso-${nextId++}`,
        at: at(1, 22, 15).getTime(),
        dayKey: dayKeyAgo(1),
        type: 'limit_reached',
        compulsionId: adult.id,
        targetId: asTargetId(FORUM),
      },
      {
        id: `tela-${nextId++}`,
        at: at(1, 22, 30).getTime(),
        dayKey: dayKeyAgo(1),
        type: 'interruption_shown',
        compulsionId: adult.id,
        targetId: asTargetId(FORUM),
      },
    ]);
    await renderRouter(APP_DIR, { initialUrl: '/stats' });

    const streaks = await card('stats-streaks');
    expect(streaks.getByText('Atual: 5 dias')).toBeOnTheScreen();
    expect(streaks.getByText('Maior: 15 dias')).toBeOnTheScreen();
    expect(streaks.getByText('1 recaída registrada')).toBeOnTheScreen();

    const checkIns = within(screen.getByTestId('stats-check-ins'));
    expect(checkIns.getByText('1 check-in respondido')).toBeOnTheScreen();

    const risk = within(screen.getByTestId('stats-risk-apps'));
    expect(risk.getByText('1 aviso por notificação')).toBeOnTheScreen();
    expect(risk.getByText('1 tela de interrupção')).toBeOnTheScreen();
    expect(screen.getByTestId('stats-risk-hours')).toHaveAccessibleName(
      /22 horas: 1 aviso e 1 tela, faixa de gatilho; 23 horas: nenhum aviso e nenhuma tela, faixa de gatilho/,
    );
    // Sem minutos de uso na abstinência (doc 01, 6.8).
    expect(screen.queryByTestId('stats-usage')).toBeNull();
    expect(screen.queryByTestId('stats-no-access')).toBeNull();
  });

  it('com duas compulsões, filtra pelos chips; a seção geral fica nas duas', async () => {
    addVideos(4);
    addAdult(12);
    const session = mockRepositories.emergencySessions.start('home');
    mockRepositories.emergencySessions.finish(session.id, 'passed');
    await renderRouter(APP_DIR, { initialUrl: '/stats' });

    expect(await screen.findByTestId('stats-heading-short_videos')).toBeOnTheScreen();
    expect(screen.getByText('1 vitória: a vontade passou')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('radio', { name: 'Conteúdo adulto' }));
    expect(await screen.findByTestId('stats-heading-pornography')).toBeOnTheScreen();
    expect(screen.queryByTestId('stats-heading-short_videos')).toBeNull();
    expect(screen.getByText('Pelo Início: 1')).toBeOnTheScreen();
  });

  it('abre direto na compulsão pelo parâmetro da rota', async () => {
    addVideos(4);
    addAdult(12);
    await renderRouter(APP_DIR, { initialUrl: '/stats?compulsion=pornography' });
    expect(await screen.findByTestId('stats-heading-pornography')).toBeOnTheScreen();
  });

  it('um aviso novo aparece sem sair da tela', async () => {
    const adult = addAdult(4);
    await renderRouter(APP_DIR, { initialUrl: '/stats' });
    expect(await screen.findByText('Nenhum aviso por notificação')).toBeOnTheScreen();
    mockRepositories.monitoringEvents.importEvents([
      {
        id: 'aviso-novo',
        at: Date.now(),
        dayKey: toDayKey(new Date()),
        type: 'limit_reached',
        compulsionId: adult.id,
        targetId: asTargetId(FORUM),
      },
    ]);
    expect(await screen.findByText('1 aviso por notificação')).toBeOnTheScreen();
  });
});
