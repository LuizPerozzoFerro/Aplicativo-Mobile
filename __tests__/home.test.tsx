import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import type { DatabaseState } from '@/data/bootstrap';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { addCalendarDays, toDayKey } from '@/domain/day';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { asTargetId, FakeMonitoringModule } from '@/monitoring';

// Tela Início (spec 02, seção 4.5) sobre as rotas reais, com um banco sql.js e
// um monitoramento falso novos a cada teste. As datas seguem o relógio real.
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
const adultCard = async () => within(await screen.findByTestId('home-card-pornography'));
const videosCard = async () => within(await screen.findByTestId('home-card-short_videos'));
const daysAgo = (days: number) => addCalendarDays(new Date(), -days);
const todayKey = () => toDayKey(new Date());
const yesterdayKey = () => toDayKey(daysAgo(1));

/** Responde o próximo diálogo do sistema tocando no botão com este texto. */
function answerNextAlert(label: string) {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons) => {
    buttons?.find((button) => button.text === label)?.onPress?.();
  });
}

function addAdult(startedDaysAgo: number) {
  return mockRepositories.compulsions.add({
    type: 'pornography',
    startedAt: daysAgo(startedDaysAgo),
  });
}

function addVideos(startedDaysAgo = 0) {
  const videos = mockRepositories.compulsions.add({
    type: 'short_videos',
    startedAt: daysAgo(startedDaysAgo),
    dailyLimitMinutes: 60,
  });
  mockRepositories.monitoredApps.replaceForCompulsion(videos.id, [
    { packageName: 'com.instagram.android', role: 'short_video' },
    { packageName: 'com.zhiliaoapp.musically', role: 'short_video' },
  ]);
  return videos;
}

beforeEach(async () => {
  mockRepositories = createRepositories((await createTestDatabase()).db);
  mockMonitoring = new FakeMonitoringModule();
  onboardingStatus.setCompleted(true);
});
afterEach(() => jest.restoreAllMocks());

describe('Início', () => {
  it('sem compulsão, mostra o estado vazio com atalho para o Perfil', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByText('Nada para acompanhar ainda')).toBeOnTheScreen();
    await press('Escolher no Perfil');
    await expectPath('/profile');
  });

  it('um card por compulsão ativa, na ordem da escolha, com streak e próximo marco (R6)', async () => {
    addVideos(3);
    addAdult(12);
    await renderRouter(APP_DIR, { initialUrl: '/' });

    const cards = await screen.findAllByTestId(/^home-card-/);
    expect(cards.map((card) => card.props.testID)).toEqual([
      'home-card-short_videos',
      'home-card-pornography',
    ]);
    const adult = await adultCard();
    expect(adult.getByText('Conteúdo adulto')).toBeOnTheScreen();
    expect(adult.getByText('12 dias')).toBeOnTheScreen();
    expect(adult.getByText('Próximo marco: 14 dias')).toBeOnTheScreen();
    const videos = await videosCard();
    expect(videos.getByText('3 dias')).toBeOnTheScreen();
    expect(videos.getByText('Próximo marco: 7 dias')).toBeOnTheScreen();
  });

  it('no dia do início: "0 dias" e "Próximo marco: 1 dia"', async () => {
    addAdult(0);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    const adult = await adultCard();
    expect(adult.getByText('0 dias')).toBeOnTheScreen();
    expect(adult.getByText('Próximo marco: 1 dia')).toBeOnTheScreen();
  });

  it('compulsão pausada não aparece', async () => {
    const adult = addAdult(5);
    mockRepositories.compulsions.setStatus(adult.id, 'paused');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByTestId('home-empty')).toBeOnTheScreen();
  });
});

describe('card de conteúdo adulto', () => {
  it('"Sem recaída" grava o check-in, e "Desfazer" volta a "Como foi hoje?" (R7)', async () => {
    const adult = addAdult(12);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect((await adultCard()).getByText('Como foi hoje?')).toBeOnTheScreen();

    await press('Sem recaída');
    expect(await screen.findByText('Hoje: sem recaída.')).toBeOnTheScreen();
    expect(mockRepositories.checkIns.listByCompulsion(adult.id)).toEqual([
      expect.objectContaining({ dayKey: todayKey(), answer: 'no_relapse', source: 'app' }),
    ]);
    expect((await adultCard()).getByText('12 dias')).toBeOnTheScreen();

    await press('Desfazer');
    expect(await screen.findByText('Como foi hoje?')).toBeOnTheScreen();
    expect(mockRepositories.checkIns.listByCompulsion(adult.id)).toEqual([]);
  });

  it('"Tive uma recaída" zera a streak e mostra a mensagem de apoio', async () => {
    const adult = addAdult(12);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('Tive uma recaída');

    const card = await adultCard();
    expect(await card.findByText('0 dias')).toBeOnTheScreen();
    expect(card.getByText('Hoje: recaída registrada.')).toBeOnTheScreen();
    expect(card.getByText(/não apaga o que você já conquistou/)).toBeOnTheScreen();
    expect(mockRepositories.relapses.listByCompulsion(adult.id)).toEqual([
      expect.objectContaining({ dayKey: todayKey() }),
    ]);
  });

  it('recaída para ontem: streak a partir de ontem, mensagem de apoio e "Desfazer" (R8)', async () => {
    const adult = addAdult(12);
    const alert = answerNextAlert('Ontem');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('Registrar recaída');

    expect(alert).toHaveBeenCalledWith(
      'Registrar uma recaída?',
      expect.stringMatching(/^Quando foi\?/),
      [
        expect.objectContaining({ text: 'Cancelar', style: 'cancel' }),
        expect.objectContaining({ text: 'Ontem' }),
        expect.objectContaining({ text: 'Hoje' }),
      ],
      expect.any(Object),
    );
    const card = await adultCard();
    expect(await card.findByText('1 dia')).toBeOnTheScreen();
    expect(card.getByText('Próximo marco: 3 dias')).toBeOnTheScreen();
    expect(card.getByText(/não apaga o que você já conquistou/)).toBeOnTheScreen();
    expect(card.getByText('Como foi hoje?')).toBeOnTheScreen();
    expect(mockRepositories.relapses.listByCompulsion(adult.id)).toEqual([
      expect.objectContaining({ dayKey: yesterdayKey() }),
    ]);

    // Desfaz a recaída de ontem, registrada hoje por engano.
    await userEvent
      .setup()
      .press(within(card.getByTestId('home-yesterday-relapse')).getByRole('button'));
    expect(await card.findByText('12 dias')).toBeOnTheScreen();
    expect(card.queryByText(/não apaga o que você já conquistou/)).toBeNull();
    expect(mockRepositories.relapses.listByCompulsion(adult.id)).toEqual([]);
    expect(mockRepositories.checkIns.listByCompulsion(adult.id)).toEqual([]);
  });

  it('no dia do início, só "hoje"; cancelar não grava nada', async () => {
    const adult = addAdult(0);
    const alert = answerNextAlert('Cancelar');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('Registrar recaída');

    expect(alert).toHaveBeenCalledWith(
      'Registrar uma recaída?',
      'A contagem recomeça hoje. Seu histórico e seus marcos continuam com você.',
      [
        expect.objectContaining({ text: 'Cancelar' }),
        expect.objectContaining({ text: 'Registrar' }),
      ],
      expect.any(Object),
    );
    expect(mockRepositories.relapses.listByCompulsion(adult.id)).toEqual([]);
  });

  it('"Registrar recaída" depois de "Sem recaída" substitui a resposta de hoje', async () => {
    const adult = addAdult(12);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('Sem recaída');
    await screen.findByText('Hoje: sem recaída.');

    answerNextAlert('Hoje');
    await press('Registrar recaída');
    expect(await screen.findByText('Hoje: recaída registrada.')).toBeOnTheScreen();
    expect(mockRepositories.checkIns.listByCompulsion(adult.id)).toEqual([
      expect.objectContaining({ dayKey: todayKey(), answer: 'relapse' }),
    ]);
  });

  it('com recaída hoje e ontem, não oferece mais "Registrar recaída"', async () => {
    const adult = addAdult(12);
    mockRepositories.relapses.record({ compulsionId: adult.id, dayKey: yesterdayKey() });
    mockRepositories.relapses.record({ compulsionId: adult.id, dayKey: todayKey() });
    await renderRouter(APP_DIR, { initialUrl: '/' });
    const card = await adultCard();
    expect(card.getByText('0 dias')).toBeOnTheScreen();
    expect(card.queryByRole('button', { name: 'Registrar recaída' })).toBeNull();
  });
});

describe('card de vídeos curtos', () => {
  it('soma o uso de hoje entre os apps escolhidos', async () => {
    addVideos();
    mockMonitoring = new FakeMonitoringModule({ permissions: { usageAccess: 'granted' } });
    mockMonitoring.simulateUsage(asTargetId('com.instagram.android'), 30);
    mockMonitoring.simulateUsage(asTargetId('com.zhiliaoapp.musically'), 12);
    // Fora da lista: não conta.
    mockMonitoring.simulateUsage(asTargetId('com.google.android.youtube'), 50);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await (await videosCard()).findByText('42 min de 60 hoje')).toBeOnTheScreen();
  });

  it('dia reprovado hoje dá "0 dias"', async () => {
    const videos = addVideos(10);
    mockRepositories.dayStates.markFailed(
      { compulsionId: videos.id, dayKey: todayKey() },
      'ignored_limit',
    );
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect((await videosCard()).getByText('0 dias')).toBeOnTheScreen();
  });

  it('sem permissão, avisa e leva às permissões; ao voltar, mostra o uso', async () => {
    addVideos();
    await renderRouter(APP_DIR, { initialUrl: '/' });
    const card = await videosCard();
    expect(
      await card.findByText('O acompanhamento do tempo ainda não está ativo.'),
    ).toBeOnTheScreen();

    await press('Ver permissões');
    await expectPath('/permission-status');
    const usageAccess = within(await screen.findByTestId('permission-usageAccess'));
    await userEvent.setup().press(usageAccess.getByRole('button', { name: 'Permitir' }));
    expect(await usageAccess.findByText('Permitido')).toBeOnTheScreen();

    await press('Voltar');
    await expectPath('/');
    expect(await (await videosCard()).findByText('0 min de 60 hoje')).toBeOnTheScreen();
  });

  it('na tela de permissões, recusar não fala em Perfil', async () => {
    mockMonitoring = new FakeMonitoringModule({ grantOnRequest: false });
    await renderRouter(APP_DIR, { initialUrl: '/permission-status' });
    const notifications = within(await screen.findByTestId('permission-notifications'));
    await userEvent.setup().press(notifications.getByRole('button', { name: 'Agora não' }));
    expect(
      notifications.getByText('Não permitido agora. Dá para permitir quando quiser, nesta tela.'),
    ).toBeOnTheScreen();
  });
});
