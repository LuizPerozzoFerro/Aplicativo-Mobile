import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { act } from '@testing-library/react-native';
import { Alert, AppState } from 'react-native';

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
  // O mock do React Native não define o estado; o serviço só liga com o app na tela.
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
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

  it('"Registrar recaída" depois de "Sem recaída" substitui a resposta de hoje, e "Desfazer" a devolve', async () => {
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

    await press('Desfazer');
    expect(await screen.findByText('Hoje: sem recaída.')).toBeOnTheScreen();
    expect(mockRepositories.relapses.listByCompulsion(adult.id)).toEqual([]);
  });

  it('ontem "Sem recaída" → recaída para ontem → "Desfazer": volta "Sem recaída"', async () => {
    const adult = addAdult(12);
    mockRepositories.checkIns.answer({
      compulsionId: adult.id,
      dayKey: yesterdayKey(),
      answer: 'no_relapse',
    });
    const [original] = mockRepositories.checkIns.listByCompulsion(adult.id);
    answerNextAlert('Ontem');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('Registrar recaída');

    const card = await adultCard();
    expect(await card.findByText('1 dia')).toBeOnTheScreen();
    expect(mockRepositories.checkIns.listByCompulsion(adult.id)).toEqual([
      expect.objectContaining({ dayKey: yesterdayKey(), answer: 'relapse' }),
    ]);

    await userEvent
      .setup()
      .press(within(card.getByTestId('home-yesterday-relapse')).getByRole('button'));
    expect(await card.findByText('12 dias')).toBeOnTheScreen();
    expect(mockRepositories.relapses.listByCompulsion(adult.id)).toEqual([]);
    expect(mockRepositories.checkIns.listByCompulsion(adult.id)).toEqual([
      expect.objectContaining({
        dayKey: yesterdayKey(),
        answer: 'no_relapse',
        answeredAt: original?.answeredAt,
        previousAnswer: null,
      }),
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

const DAY_MS = 24 * 60 * 60 * 1000;
const GRANTED_ALL = {
  usageAccess: 'granted',
  notifications: 'granted',
  overlay: 'granted',
} as const;

describe('aviso de proteção (doc 01, 6.1 e 6.10)', () => {
  it('sem compulsão, nada faz falta e o aviso não aparece', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await screen.findByTestId('home-empty');
    await act(async () => {});
    expect(screen.queryByTestId('home-protection')).not.toBeOnTheScreen();
  });

  it('com tudo funcionando, o aviso não aparece', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockMonitoring = new FakeMonitoringModule({ permissions: GRANTED_ALL });
    const start = jest.spyOn(mockMonitoring, 'startMonitoring');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await (await videosCard()).findByText('0 min de 60 hoje');
    await waitFor(() => expect(start).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId('home-protection')).not.toBeOnTheScreen();
  });

  it('permissão perdida: diz o que parou, leva à tela de estado e não pode ser adiado', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockRepositories.settings.markPermissionsGranted(['usageAccess']);
    mockMonitoring = new FakeMonitoringModule({
      permissions: { notifications: 'granted', overlay: 'granted' },
    });
    await renderRouter(APP_DIR, { initialUrl: '/' });
    const notice = within(await screen.findByTestId('home-protection'));
    expect(notice.getByText('Proteção pausada')).toBeOnTheScreen();
    expect(
      notice.getByText('O tempo nos apps escolhidos não está sendo acompanhado.'),
    ).toBeOnTheScreen();
    expect(notice.queryByText('Os lembretes e avisos não estão chegando.')).not.toBeOnTheScreen();
    expect(notice.queryByRole('button', { name: 'Agora não' })).not.toBeOnTheScreen();
    await press('Ver o que fazer');
    await expectPath('/permission-status');
  });

  it('nunca concedida: convida a ativar, com o mesmo texto e os dois botões', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockMonitoring = new FakeMonitoringModule({
      permissions: { notifications: 'granted', overlay: 'granted' },
    });
    await renderRouter(APP_DIR, { initialUrl: '/' });
    const notice = within(await screen.findByTestId('home-protection'));
    expect(notice.getByText('Ative o acompanhamento')).toBeOnTheScreen();
    expect(notice.queryByText('Proteção pausada')).not.toBeOnTheScreen();
    expect(
      notice.getByText('O tempo nos apps escolhidos não está sendo acompanhado.'),
    ).toBeOnTheScreen();
    expect(notice.getByRole('button', { name: 'Agora não' })).toBeOnTheScreen();
    await press('Ver o que fazer');
    await expectPath('/permission-status');
  });

  it('"Agora não" esconde o aviso e grava quando foi adiado', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockMonitoring = new FakeMonitoringModule({
      permissions: { notifications: 'granted', overlay: 'granted' },
    });
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await screen.findByTestId('home-protection');
    const before = Date.now();
    await press('Agora não');
    await waitFor(() => expect(screen.queryByTestId('home-protection')).not.toBeOnTheScreen());
    const dismissedAt = mockRepositories.settings.get().protectionNoticeDismissedAt;
    expect(dismissedAt?.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('continua escondido ao abrir de novo dentro dos 7 dias', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockRepositories.settings.setProtectionNoticeDismissedAt(new Date(Date.now() - DAY_MS * 6));
    mockMonitoring = new FakeMonitoringModule({
      permissions: { notifications: 'granted', overlay: 'granted' },
    });
    const status = jest.spyOn(mockMonitoring, 'getServiceStatus');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await videosCard();
    await waitFor(() => expect(status).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId('home-protection')).not.toBeOnTheScreen();
  });

  it('volta a aparecer depois dos 7 dias', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockRepositories.settings.setProtectionNoticeDismissedAt(new Date(Date.now() - DAY_MS * 7));
    mockMonitoring = new FakeMonitoringModule({
      permissions: { notifications: 'granted', overlay: 'granted' },
    });
    await renderRouter(APP_DIR, { initialUrl: '/' });
    const notice = within(await screen.findByTestId('home-protection'));
    expect(notice.getByText('Ative o acompanhamento')).toBeOnTheScreen();
  });

  it('concedida e depois revogada: vira "Proteção pausada", mesmo com o aviso adiado', async () => {
    type Listener = (state: string) => void;
    const listeners: Listener[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as Listener);
      return { remove: () => undefined };
    });
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockRepositories.settings.setProtectionNoticeDismissedAt(new Date());
    mockMonitoring = new FakeMonitoringModule({ permissions: GRANTED_ALL });
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await waitFor(() =>
      expect(mockRepositories.settings.get()).toMatchObject({
        usageAccessGrantedOnce: true,
        notificationsGrantedOnce: true,
        overlayGrantedOnce: true,
      }),
    );

    mockMonitoring.simulatePermission('usageAccess', 'denied');
    await act(async () => {
      listeners.forEach((listener) => listener('active'));
    });
    const notice = within(await screen.findByTestId('home-protection'));
    expect(notice.getByText('Proteção pausada')).toBeOnTheScreen();
  });

  it.each(['notifications', 'overlay'] as const)(
    '%s já concedida antes e negada agora: proteção pausada',
    async (name) => {
      addVideos();
      mockRepositories.settings.setOnboardingCompleted(true);
      mockRepositories.settings.markPermissionsGranted([name]);
      mockMonitoring = new FakeMonitoringModule({
        permissions: { ...GRANTED_ALL, [name]: 'denied' },
      });
      await renderRouter(APP_DIR, { initialUrl: '/' });
      const notice = within(await screen.findByTestId('home-protection'));
      expect(notice.getByText('Proteção pausada')).toBeOnTheScreen();
    },
  );

  it('serviço parado nunca oferece "Agora não"', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockMonitoring = new FakeMonitoringModule({ permissions: GRANTED_ALL });
    jest.spyOn(mockMonitoring, 'startMonitoring').mockRejectedValue(new Error('falhou'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await renderRouter(APP_DIR, { initialUrl: '/' });
    const notice = within(await screen.findByTestId('home-protection'));
    expect(notice.getByText('Proteção pausada')).toBeOnTheScreen();
    expect(notice.queryByRole('button', { name: 'Agora não' })).not.toBeOnTheScreen();
  });

  it('só de abstinência: não cobra o acesso ao uso', async () => {
    addAdult(1);
    mockMonitoring = new FakeMonitoringModule({ permissions: { notifications: 'denied' } });
    await renderRouter(APP_DIR, { initialUrl: '/' });
    const notice = within(await screen.findByTestId('home-protection'));
    expect(notice.getByText('Os lembretes e avisos não estão chegando.')).toBeOnTheScreen();
    expect(
      notice.queryByText('O tempo nos apps escolhidos não está sendo acompanhado.'),
    ).not.toBeOnTheScreen();
  });

  it('serviço que não consegue subir aparece como parado', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockMonitoring = new FakeMonitoringModule({ permissions: GRANTED_ALL });
    jest.spyOn(mockMonitoring, 'startMonitoring').mockRejectedValue(new Error('falhou'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await renderRouter(APP_DIR, { initialUrl: '/' });
    const notice = within(await screen.findByTestId('home-protection'));
    expect(notice.getByText('O acompanhamento parou de funcionar.')).toBeOnTheScreen();
  });
});

describe('estado do monitoramento (/permission-status)', () => {
  const status = async () => within(await screen.findByTestId('monitoring-status'));

  it('sem regra de uso: explica que não há o que acompanhar', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/permission-status' });
    expect(await (await status()).findByText(/Nenhum app para acompanhar agora/)).toBeOnTheScreen();
  });

  it('sem o acesso ao uso: diz o que falta', async () => {
    addVideos();
    await renderRouter(APP_DIR, { initialUrl: '/permission-status' });
    expect(await (await status()).findByText(/falta permitir o acesso/)).toBeOnTheScreen();
  });

  it('ativo: mostra a situação', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockMonitoring = new FakeMonitoringModule({ permissions: GRANTED_ALL });
    await renderRouter(APP_DIR, { initialUrl: '/permission-status' });
    expect(await (await status()).findByText('Ativo.')).toBeOnTheScreen();
  });

  it('mostra a última verificação', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockMonitoring = new FakeMonitoringModule({ permissions: GRANTED_ALL });
    jest.spyOn(mockMonitoring, 'getServiceStatus').mockResolvedValue({
      active: true,
      running: true,
      startRequestedAt: null,
      lastCheckAt: new Date(2026, 10, 8, 17, 43).getTime(),
    });
    await renderRouter(APP_DIR, { initialUrl: '/permission-status' });
    expect(
      await (await status()).findByText(/Última verificação: 08\/11\/2026,? 17:43/),
    ).toBeOnTheScreen();
  });

  it('parado: "Religar" liga de novo', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockMonitoring = new FakeMonitoringModule({ permissions: GRANTED_ALL });
    const start = mockMonitoring.startMonitoring.bind(mockMonitoring);
    let failing = true;
    jest.spyOn(mockMonitoring, 'startMonitoring').mockImplementation(async () => {
      if (failing) throw new Error('falhou');
      return start();
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await renderRouter(APP_DIR, { initialUrl: '/permission-status' });
    await (await status()).findByText(/Parado: o Android/);
    failing = false;
    await press('Religar o acompanhamento');
    expect(await (await status()).findByText('Ativo.')).toBeOnTheScreen();
  });

  it('religar falhando avisa', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockMonitoring = new FakeMonitoringModule({ permissions: GRANTED_ALL });
    jest.spyOn(mockMonitoring, 'startMonitoring').mockRejectedValue(new Error('falhou'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await renderRouter(APP_DIR, { initialUrl: '/permission-status' });
    await (await status()).findByText(/Parado: o Android/);
    await press('Religar o acompanhamento');
    expect(await (await status()).findByText(/Não deu para religar/)).toBeOnTheScreen();
  });

  it('sem sobreposição: explica que ficam só as notificações', async () => {
    addVideos();
    mockRepositories.settings.setOnboardingCompleted(true);
    mockMonitoring = new FakeMonitoringModule({
      permissions: { usageAccess: 'granted', notifications: 'granted' },
    });
    await renderRouter(APP_DIR, { initialUrl: '/permission-status' });
    expect(await (await status()).findByText(/sem a tela de pausa/)).toBeOnTheScreen();
  });

  it('volta dos Ajustes: lê de novo as permissões', async () => {
    type Listener = (state: string) => void;
    const listeners: Listener[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as Listener);
      return { remove: () => undefined };
    });
    mockMonitoring = new FakeMonitoringModule();
    await renderRouter(APP_DIR, { initialUrl: '/permission-status' });
    const usageAccess = within(await screen.findByTestId('permission-usageAccess'));
    expect(usageAccess.queryByText('Permitido')).not.toBeOnTheScreen();

    mockMonitoring.simulatePermission('usageAccess', 'granted');
    await act(async () => {
      listeners.forEach((listener) => listener('active'));
    });
    expect(await usageAccess.findByText('Permitido')).toBeOnTheScreen();
  });
});
