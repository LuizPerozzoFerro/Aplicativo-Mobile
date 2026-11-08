import { act, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { AccessibilityInfo, Animated, BackHandler } from 'react-native';

import type { DatabaseState } from '@/data/bootstrap';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { EMERGENCY_BREATHING_MS, EMERGENCY_WAIT_MS } from '@/domain/emergency';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { FakeMonitoringModule } from '@/monitoring';

// Botão de emergência (spec 03, 5.5) sobre as rotas reais, com um banco sql.js
// novo a cada teste. O tempo das etapas sai do `Date.now`: os testes o adiantam.
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

// Conta quantas etapas estão segurando a tela acesa neste momento.
let mockKeepAwakeHolders = 0;
jest.mock('expo-keep-awake', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useKeepAwake: () =>
      useEffect(() => {
        mockKeepAwakeHolders += 1;
        return () => {
          mockKeepAwakeHolders -= 1;
        };
      }, []),
  };
});

const APP_DIR = './app';
const expectPath = (path: string) => waitFor(() => expect(screen).toHavePathname(path));
const press = async (name: string | RegExp) =>
  userEvent.setup().press(await screen.findByRole('button', { name }));
const sessions = () => mockRepositories.emergencySessions.list();
const open = (source = 'home') =>
  renderRouter(APP_DIR, { initialUrl: `/emergency?source=${source}` });

/** Adianta o relógio; o próximo tique da etapa percebe. */
function advanceClock(ms: number) {
  const target = Date.now() + ms;
  jest.spyOn(Date, 'now').mockReturnValue(target);
}

beforeEach(async () => {
  mockRepositories = createRepositories((await createTestDatabase()).db);
  mockMonitoring = new FakeMonitoringModule();
  onboardingStatus.setCompleted(true);
  mockKeepAwakeHolders = 0;
});
afterEach(() => jest.restoreAllMocks());

describe('Entrada pelo Início', () => {
  it('o botão fica no Início mesmo sem compulsão e abre a emergência com a origem', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByTestId('home-empty')).toBeOnTheScreen();
    await press('Emergência');
    await expectPath('/emergency');
    await waitFor(() => expect(sessions()).toHaveLength(1));
    expect(sessions()[0]).toMatchObject({ source: 'home', outcome: null });
  });
});

describe('Etapas', () => {
  it('começa pela motivação do usuário', async () => {
    mockRepositories.motivation.save('Dormir melhor');
    await open();
    expect(await screen.findByText('Dormir melhor')).toBeOnTheScreen();
    expect(screen.getByText('Sua motivação')).toBeOnTheScreen();
  });

  it('sem motivação salva, mostra uma frase neutra', async () => {
    await open();
    expect(await screen.findByText(/Vamos atravessar este momento/)).toBeOnTheScreen();
    expect(screen.queryByText('Sua motivação')).not.toBeOnTheScreen();
  });

  it('segue da respiração para o cronômetro e para a pergunta, pelo relógio', async () => {
    await open();
    await press('Começar a respiração');
    expect(await screen.findByText('Inspire')).toBeOnTheScreen();
    expect(screen.getByText('1:00')).toBeOnTheScreen();

    advanceClock(EMERGENCY_BREATHING_MS);
    expect(await screen.findByText('Agora, dê um tempo')).toBeOnTheScreen();
    expect(screen.getByText('5:00')).toBeOnTheScreen();
    expect(screen.getByText('Beba um copo de água')).toBeOnTheScreen();

    advanceClock(EMERGENCY_WAIT_MS);
    expect(await screen.findByText('A vontade passou?')).toBeOnTheScreen();
  });

  it('a respiração alterna entre inspirar e soltar o ar', async () => {
    await open();
    await press('Começar a respiração');
    expect(await screen.findByText('Inspire')).toBeOnTheScreen();
    advanceClock(4_000);
    expect(await screen.findByText('Solte o ar')).toBeOnTheScreen();
  });

  it.each([
    ['a motivação', 0],
    ['a respiração', 1],
    ['o cronômetro', 2],
  ])('"Pular" em %s leva direto à pergunta', async (_name, advances) => {
    await open();
    if (advances >= 1) await press('Começar a respiração');
    if (advances >= 2) {
      advanceClock(EMERGENCY_BREATHING_MS);
      await screen.findByText('Agora, dê um tempo');
    }
    await press('Pular');
    expect(await screen.findByText('A vontade passou?')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Pular' })).not.toBeOnTheScreen();
  });
});

describe('Resultado', () => {
  it.each([
    ['Sim', 'passed', 'Muito bem'],
    ['Ainda não', 'not_passed', 'Tudo bem'],
  ])('"%s" grava %s e mostra o fechamento', async (button, outcome, title) => {
    await open('interruption');
    await press('Pular');
    await press(button);
    expect(await screen.findByText(title)).toBeOnTheScreen();
    expect(sessions()).toEqual([
      expect.objectContaining({ source: 'interruption', outcome, endedAt: expect.any(Date) }),
    ]);
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeOnTheScreen();
  });

  it('sair depois de responder não troca o resultado', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('Emergência');
    await press('Pular');
    await press('Sim');
    await press('Voltar ao início');
    await expectPath('/');
    expect(sessions()).toEqual([expect.objectContaining({ outcome: 'passed' })]);
  });
});

describe('Sair no meio', () => {
  it('"Sair" registra a sessão como abandonada e volta', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('Emergência');
    await press('Sair');
    await expectPath('/');
    await waitFor(() =>
      expect(sessions()).toEqual([
        expect.objectContaining({ outcome: 'abandoned', endedAt: expect.any(Date) }),
      ]),
    );
  });

  it('o Voltar do sistema também abandona', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('Emergência');
    await waitFor(() => expect(sessions()).toHaveLength(1));
    await act(async () => router.back());
    await expectPath('/');
    await waitFor(() => expect(sessions()[0]?.outcome).toBe('abandoned'));
  });

  it('aberta a frio, sem tela atrás, "Sair" vai para o Início', async () => {
    await open('notification');
    await press('Sair');
    await expectPath('/');
    await waitFor(() => expect(sessions()[0]?.outcome).toBe('abandoned'));
  });

  it('aberta a frio, o Voltar do Android vai para o Início', async () => {
    type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
    const listeners: BackListener[] = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
      listeners.push(listener);
      return { remove: () => void listeners.splice(listeners.indexOf(listener), 1) };
    });
    await open('notification');
    await screen.findByRole('button', { name: 'Sair' });
    await act(async () => {
      [...listeners].reverse().some((listener) => listener({} as never));
    });
    await expectPath('/');
  });
});

describe('Origem e sessão única', () => {
  it.each([
    ['notification', 'notification'],
    ['interruption', 'interruption'],
    ['desconhecida', 'home'],
  ])('endereço com origem %s grava %s', async (param, expected) => {
    await open(param);
    await waitFor(() => expect(sessions()).toHaveLength(1));
    expect(sessions()[0]?.source).toBe(expected);
  });

  it('pedir a emergência com ela já aberta não abre outra', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('Emergência');
    await press('Começar a respiração');
    expect(await screen.findByText('Inspire')).toBeOnTheScreen();

    await act(async () => router.push('/emergency?source=interruption'));

    expect(await screen.findByText('Inspire')).toBeOnTheScreen();
    expect(sessions()).toEqual([expect.objectContaining({ source: 'home', outcome: null })]);
  });
});

describe('Tela acesa', () => {
  it('só durante a respiração e o cronômetro', async () => {
    await open();
    await screen.findByText('Este momento vai passar');
    expect(mockKeepAwakeHolders).toBe(0);

    await press('Começar a respiração');
    await screen.findByText('Inspire');
    expect(mockKeepAwakeHolders).toBe(1);

    advanceClock(EMERGENCY_BREATHING_MS);
    await screen.findByText('Agora, dê um tempo');
    expect(mockKeepAwakeHolders).toBe(1);

    advanceClock(EMERGENCY_WAIT_MS);
    await screen.findByText('A vontade passou?');
    expect(mockKeepAwakeHolders).toBe(0);
  });

  it('sair no meio solta a tela', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('Emergência');
    await press('Começar a respiração');
    await screen.findByText('Inspire');
    expect(mockKeepAwakeHolders).toBe(1);
    await press('Sair');
    await expectPath('/');
    await waitFor(() => expect(mockKeepAwakeHolders).toBe(0));
  });
});

describe('Remover animações (spec 03, 5.5)', () => {
  it('com o ajuste ligado, o círculo não anima', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValueOnce(true);
    await open();
    await press('Começar a respiração');
    await screen.findByText('Inspire');
    const timing = jest.spyOn(Animated, 'timing');
    advanceClock(4_000);
    await screen.findByText('Solte o ar');
    expect(timing).not.toHaveBeenCalled();
  });

  it('com o ajuste desligado, o círculo anima a cada fase', async () => {
    await open();
    await press('Começar a respiração');
    await screen.findByText('Inspire');
    const timing = jest.spyOn(Animated, 'timing');
    advanceClock(4_000);
    await screen.findByText('Solte o ar');
    await waitFor(() => expect(timing).toHaveBeenCalled());
  });
});
