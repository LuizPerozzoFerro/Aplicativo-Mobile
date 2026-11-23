import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { AppState, Linking } from 'react-native';

import type { DatabaseState } from '@/data/bootstrap';
import { dataChanges, observeRepositories } from '@/data/changes';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { addCalendarDays, toDayKey } from '@/domain/day';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { FakeMonitoringModule } from '@/monitoring';

// Marcos (spec 04, 5.3 e 5.4) sobre as rotas reais: aba Progresso, detalhe,
// celebração e o card do Início. Banco sql.js e monitoramento falso novos a
// cada teste; o catálogo é o embutido (conteúdo de teste de content/). As
// datas seguem o relógio real.
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
const expectPath = (path: string) => waitFor(() => expect(screen).toHavePathname(path));
const press = async (name: string | RegExp) =>
  userEvent.setup().press(await screen.findByRole('button', { name }));
const daysAgo = (days: number) => addCalendarDays(new Date(), -days);
const dayKeyAgo = (days: number) => toDayKey(daysAgo(days));

function addAdult(startedDaysAgo: number) {
  const adult = mockRepositories.compulsions.add({
    type: 'pornography',
    startedAt: daysAgo(startedDaysAgo),
  });
  mockRepositories.compulsions.setInitialStreakDays(adult.id, 0);
  return adult;
}

function addVideos(startedDaysAgo: number) {
  return mockRepositories.compulsions.add({
    type: 'short_videos',
    startedAt: daysAgo(startedDaysAgo),
    dailyLimitMinutes: 60,
  });
}

beforeEach(async () => {
  // Observados como no app: cada gravação avisa dataChanges.
  mockRepositories = observeRepositories(
    createRepositories((await createTestDatabase()).db),
    dataChanges.notify,
  );
  mockMonitoring = new FakeMonitoringModule();
  onboardingStatus.setCompleted(true);
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
});
afterEach(() => jest.restoreAllMocks());

describe('aba Progresso', () => {
  it('sem compulsão ativa, o estado vazio', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/progress' });
    expect(await screen.findByTestId('progress-empty')).toBeOnTheScreen();
  });

  it('cabeçalho e linha do tempo nos quatro estados', async () => {
    const adult = addAdult(20);
    // Primeira abertura há 6 dias (7 e 14 alcançados), recaída há 4: sequência de 4 dias.
    mockRepositories.relapses.record({ compulsionId: adult.id, dayKey: dayKeyAgo(4) });
    mockRepositories.milestoneReaches.addMany(adult.id, [
      { milestoneDay: 7, streakBaseDay: dayKeyAgo(20), reachedOn: dayKeyAgo(13), celebrated: true },
      { milestoneDay: 14, streakBaseDay: dayKeyAgo(20), reachedOn: dayKeyAgo(6), celebrated: true },
    ]);
    await renderRouter(APP_DIR, { initialUrl: '/progress' });

    const header = within(await screen.findByTestId('progress-header-pornography'));
    expect(header.getByText('4 dias')).toBeOnTheScreen();
    expect(header.getByText('Próximo marco: 7 dias')).toBeOnTheScreen();
    expect(header.getByText('Faltam 3 dias')).toBeOnTheScreen();

    const item = (day: number) => screen.getByTestId(`progress-milestone-${day}`);
    expect(item(3)).toHaveAccessibleName(/3 dias, Marco de teste A: 3 dias · Alcançado/);
    expect(item(7)).toHaveAccessibleName(/Próximo · alcançado antes/);
    expect(item(14)).toHaveAccessibleName(/14 dias, Marco de teste A: 14 dias · Alcançado antes/);
    expect(item(30)).toHaveAccessibleName(/Ainda não alcançado/);
    // Uma compulsão só: sem filtro.
    expect(screen.queryByTestId('progress-filter')).toBeNull();
  });

  it('com duas compulsões, filtra pelos chips', async () => {
    addVideos(4);
    addAdult(12);
    await renderRouter(APP_DIR, { initialUrl: '/progress' });

    expect(await screen.findByTestId('progress-header-short_videos')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('radio', { name: 'Conteúdo adulto' }));
    expect(await screen.findByTestId('progress-header-pornography')).toBeOnTheScreen();
    expect(screen.queryByTestId('progress-header-short_videos')).toBeNull();
  });

  it('tocar num marco abre o detalhe: textos, referência, aviso e vídeo ainda bloqueado', async () => {
    addAdult(4);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderRouter(APP_DIR, { initialUrl: '/progress' });

    await userEvent.setup().press(await screen.findByTestId('progress-milestone-7'));
    await expectPath('/milestone');
    expect(await screen.findByText('Marco de teste A: 7 dias')).toBeOnTheScreen();
    expect(screen.getByText(/Resumo de teste do marco de 7 dias/)).toBeOnTheScreen();
    expect(screen.getByText(/não substitui o acompanhamento de um profissional/)).toBeOnTheScreen();
    expect(screen.getByText('Disponível ao chegar a 7 dias')).toBeOnTheScreen();

    await press(/^Referência de exemplo/);
    expect(openURL).toHaveBeenCalledWith('https://example.com/referencia');
  });

  it('marco alcançado: sem a espera do vídeo (o player entra no passo 4)', async () => {
    addAdult(10);
    await renderRouter(APP_DIR, { initialUrl: '/milestone?compulsion=pornography&day=7' });
    expect(await screen.findByText('Marco de teste A: 7 dias')).toBeOnTheScreen();
    expect(screen.queryByTestId('milestone-video')).toBeNull();
  });

  it('marco sem vídeo no catálogo: nenhum espaço para o vídeo', async () => {
    addAdult(10);
    await renderRouter(APP_DIR, { initialUrl: '/milestone?compulsion=pornography&day=60' });
    expect(await screen.findByText('Marco de teste A: 60 dias')).toBeOnTheScreen();
    expect(screen.queryByTestId('milestone-video')).toBeNull();
  });

  it('detalhe de marco que não existe: mensagem neutra', async () => {
    addAdult(10);
    await renderRouter(APP_DIR, { initialUrl: '/milestone?compulsion=pornography&day=5' });
    expect(await screen.findByTestId('milestone-not-found')).toBeOnTheScreen();
  });
});

describe('card do Início', () => {
  it('a área da streak abre o Progresso filtrado na compulsão do card', async () => {
    addVideos(4);
    addAdult(12);
    await renderRouter(APP_DIR, { initialUrl: '/' });

    const area = await screen.findByTestId('home-progress-pornography');
    expect(area).toHaveAccessibleName('12 dias, sem recair, Próximo marco: 14 dias');
    await userEvent.setup().press(area);
    await expectPath('/progress');
    expect(screen).toHaveSearchParams({ compulsion: 'pornography' });
    expect(await screen.findByTestId('progress-header-pornography')).toBeOnTheScreen();
  });
});

describe('celebração', () => {
  it('no dia do marco, abre ao entrar nas abas; "Fechar" volta e não repete', async () => {
    addAdult(7);
    await renderRouter(APP_DIR, { initialUrl: '/' });

    expect(await screen.findByText('Você chegou a 7 dias')).toBeOnTheScreen();
    expect(screen.getByText('Marco de teste A: 7 dias')).toBeOnTheScreen();
    // Os do passado (1 e 3) entraram sem celebração: só esta aparece.
    expect(mockRepositories.milestoneReaches.listPending()).toEqual([]);

    await press('Fechar');
    await expectPath('/');
    expect(screen.queryByText('Você chegou a 7 dias')).toBeNull();
  });

  it('"Ver o marco" abre o detalhe', async () => {
    addAdult(7);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('Ver o marco');
    await expectPath('/milestone');
    expect(screen).toHaveSearchParams({ compulsion: 'pornography', day: '7' });
  });

  it('dois pendentes: um por vez, e "de novo" para o marco já alcançado antes', async () => {
    const videos = addVideos(8);
    const adult = addAdult(30);
    mockRepositories.relapses.record({ compulsionId: adult.id, dayKey: dayKeyAgo(3) });
    mockRepositories.settings.setMilestonesCheckedOn(dayKeyAgo(0));
    mockRepositories.milestoneReaches.addMany(videos.id, [
      { milestoneDay: 7, streakBaseDay: dayKeyAgo(8), reachedOn: dayKeyAgo(1), celebrated: false },
    ]);
    mockRepositories.milestoneReaches.addMany(adult.id, [
      { milestoneDay: 3, streakBaseDay: dayKeyAgo(30), reachedOn: dayKeyAgo(27), celebrated: true },
      { milestoneDay: 3, streakBaseDay: dayKeyAgo(3), reachedOn: dayKeyAgo(0), celebrated: false },
    ]);
    await renderRouter(APP_DIR, { initialUrl: '/' });

    // Do mais antigo ao mais novo, cada um com a compulsão.
    expect(await screen.findByText('Você chegou a 7 dias')).toBeOnTheScreen();
    expect(screen.getByText('Vídeos curtos e redes sociais')).toBeOnTheScreen();
    await press('Fechar');
    expect(await screen.findByText('Você chegou de novo a 3 dias')).toBeOnTheScreen();
    expect(screen.getByText('Conteúdo adulto')).toBeOnTheScreen();
    await press('Fechar');
    await expectPath('/');
  });

  it('mais de dois pendentes: um resumo', async () => {
    const adult = addAdult(20);
    mockRepositories.settings.setMilestonesCheckedOn(dayKeyAgo(0));
    mockRepositories.milestoneReaches.addMany(
      adult.id,
      [1, 3, 7, 14].map((day) => ({
        milestoneDay: day,
        streakBaseDay: dayKeyAgo(20),
        reachedOn: dayKeyAgo(20 - day),
        celebrated: false,
      })),
    );
    await renderRouter(APP_DIR, { initialUrl: '/' });

    expect(await screen.findByText('Você alcançou 4 marcos')).toBeOnTheScreen();
    expect(mockRepositories.milestoneReaches.listPending()).toEqual([]);
    await press(/^Conteúdo adulto: 14 dias/);
    await expectPath('/milestone');
    expect(screen).toHaveSearchParams({ compulsion: 'pornography', day: '14' });
  });

  it('fora do dia de marco, nada abre', async () => {
    addAdult(5);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByTestId('home-card-pornography')).toBeOnTheScreen();
    expect(screen.queryByTestId('celebration')).toBeNull();
    expect(mockRepositories.milestoneReaches.listByCompulsion(1)).toHaveLength(2);
  });
});
