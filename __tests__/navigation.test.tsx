import { act, userEvent } from '@testing-library/react-native';
import { renderRouter, screen, testRouter, waitFor } from 'expo-router/testing-library';
import { Alert, BackHandler } from 'react-native';

import type { DatabaseState } from '@/data/bootstrap';
import { onboardingProgress } from '@/features/onboarding/onboardingProgress';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { ONBOARDING_STEPS, type OnboardingStep } from '@/features/onboarding/steps';

// O banco nativo (expo-sqlite) não roda no Jest; a camada de dados tem testes
// próprios com sql.js. Aqui o banco é simulado e a flag fica em memória.
const mockDatabaseState = jest.fn<DatabaseState, []>(() => ({ status: 'ready' }));
jest.mock('@/data/bootstrap', () => ({ useDatabase: () => mockDatabaseState() }));

// Navegação inicial (spec 01, seções 4.4 e 4.10) sobre as rotas reais de app/.
const APP_DIR = './app';

// A navegação é assíncrona: espera o caminho em vez de conferir na hora.
const expectPath = (path: string) => waitFor(() => expect(screen).toHavePathname(path));

const pressButton = async (name: string) =>
  userEvent.setup().press(await screen.findByRole('button', { name }));

// Voltar do Android: o mock do BackHandler do React Native não simula o botão;
// os listeners ficam aqui e o último registrado responde primeiro, como no aparelho.
type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
let backListeners: BackListener[] = [];
const pressAndroidBack = () =>
  act(() => {
    [...backListeners].reverse().some((listener) => listener({} as never));
  });

afterEach(() => jest.restoreAllMocks());

// Entre testes não há tela montada, então o estado muda fora de act().
beforeEach(() => {
  backListeners = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
    backListeners.push(listener);
    return { remove: () => (backListeners = backListeners.filter((item) => item !== listener)) };
  });
  onboardingStatus.setCompleted(false);
  // Cada teste começa como uma abertura do app sem etapa gravada.
  onboardingProgress.connect({ load: () => null, save: () => undefined });
});

describe('sem onboarding concluído', () => {
  it('abre no onboarding, na tela de boas-vindas', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await expectPath('/welcome');
    expect(screen.getByRole('header', { name: 'Boas-vindas' })).toBeOnTheScreen();
  });

  it('não deixa abrir as abas nem o "Sobre" por link direto', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/stats' });
    await expectPath('/welcome');
  });

  it('percorre as 7 telas na ordem, volta duas e avança de novo (V3)', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    for (const step of ONBOARDING_STEPS.slice(1)) {
      await pressButton('Continuar');
      await expectPath(`/${step}`);
    }
    await pressButton('Voltar');
    await pressButton('Voltar');
    await expectPath('/motivation');
    await pressButton('Continuar');
    await pressButton('Continuar');
    await expectPath('/summary');
  });

  it('a última tela conclui o onboarding e leva às abas, sem volta ao onboarding', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/summary' });
    await pressButton('Continuar');
    expect(onboardingStatus.isCompleted()).toBe(true);
    await expectPath('/');
    expect(await screen.findByRole('header', { name: 'Início' })).toBeOnTheScreen();
    expect(testRouter.canGoBack()).toBe(false);
  });

  it('a primeira tela não tem "Voltar"; o Voltar do Android pede confirmação antes de sair', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await screen.findByRole('button', { name: 'Continuar' });
    expect(screen.queryByRole('button', { name: 'Voltar' })).toBeNull();
    await pressAndroidBack();
    expect(alert).toHaveBeenCalledWith('Sair do app?', expect.any(String), expect.any(Array));
    await expectPath('/welcome');
    alert.mockRestore();
  });
});

describe('progresso do onboarding salvo (spec 02, seção 4.4)', () => {
  const saved = jest.fn<void, [OnboardingStep | null]>();
  /** Simula abrir o app com esta etapa gravada no banco. */
  const openAppWithStep = (step: OnboardingStep | null) =>
    onboardingProgress.connect({ load: () => step, save: saved });

  it('cada "Continuar" grava a etapa seguinte; concluir limpa a etapa', async () => {
    openAppWithStep(null);
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await pressButton('Continuar');
    await expectPath('/compulsions');
    expect(saved).toHaveBeenLastCalledWith('compulsions');
    await pressButton('Continuar');
    await expectPath('/setup');
    expect(onboardingProgress.getStep()).toBe('setup');
  });

  it('a última tela grava a etapa como nula ao concluir', async () => {
    openAppWithStep('summary');
    await renderRouter(APP_DIR, { initialUrl: '/summary' });
    await pressButton('Continuar');
    expect(saved).toHaveBeenLastCalledWith(null);
    expect(onboardingStatus.isCompleted()).toBe(true);
  });

  it('ao abrir com uma etapa gravada, vai direto para ela (R3)', async () => {
    openAppWithStep('triggers');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await expectPath('/triggers');
    expect(await screen.findByRole('header', { name: 'Gatilhos' })).toBeOnTheScreen();
  });

  it('depois de retomar, o Voltar volta etapa por etapa até as boas-vindas, sem pular de novo', async () => {
    openAppWithStep('setup');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await expectPath('/setup');
    await pressButton('Voltar');
    await expectPath('/compulsions');
    await pressButton('Voltar');
    await expectPath('/welcome');
    expect(await screen.findByRole('header', { name: 'Boas-vindas' })).toBeOnTheScreen();
  });

  it('depois de retomar, o Voltar do Android também volta à etapa anterior', async () => {
    openAppWithStep('motivation');
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await expectPath('/motivation');
    await pressAndroidBack();
    await expectPath('/triggers');
    await pressAndroidBack();
    await expectPath('/setup');
  });

  it('sem etapa gravada (ou nas boas-vindas), abre nas boas-vindas', async () => {
    for (const step of [null, 'welcome'] as const) {
      openAppWithStep(step);
      const view = await renderRouter(APP_DIR, { initialUrl: '/' });
      await expectPath('/welcome');
      expect(await screen.findByRole('header', { name: 'Boas-vindas' })).toBeOnTheScreen();
      await view.unmount();
    }
  });
});

describe('com onboarding concluído', () => {
  beforeEach(() => {
    onboardingStatus.setCompleted(true);
  });

  it('abre direto no Início e não deixa voltar ao onboarding por link', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/welcome' });
    await expectPath('/');
  });

  it('troca entre as 4 abas, na ordem Início, Estatísticas, Progresso, Perfil (V5)', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    const tabs = await screen.findAllByRole('tab');
    expect(tabs).toHaveLength(4);
    ['Início', 'Estatísticas', 'Progresso', 'Perfil'].forEach((name, index) =>
      expect(tabs[index]).toHaveAccessibleName(name),
    );
    for (const [name, path] of [
      ['Estatísticas', '/stats'],
      ['Progresso', '/progress'],
      ['Perfil', '/profile'],
    ] as const) {
      await userEvent.setup().press(screen.getByRole('tab', { name }));
      await expectPath(path);
    }
  });

  it('Perfil leva ao "Sobre o app"', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/profile' });
    await pressButton('Sobre o app, Versão e informações');
    await expectPath('/about');
  });

  it('"Refazer onboarding" (development) zera a flag e volta às boas-vindas (V6)', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/profile' });
    await pressButton('Refazer onboarding, Só no ambiente de desenvolvimento');
    expect(onboardingStatus.isCompleted()).toBe(false);
    await expectPath('/welcome');
  });
});

describe('abertura do banco', () => {
  afterEach(() => mockDatabaseState.mockReturnValue({ status: 'ready' }));

  it('enquanto as migrações rodam, não mostra nenhuma tela', async () => {
    mockDatabaseState.mockReturnValue({ status: 'loading' });
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(screen.queryByRole('header')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('se as migrações falharem, mostra o erro em vez do app', async () => {
    mockDatabaseState.mockReturnValue({ status: 'error' });
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(
      await screen.findByRole('header', { name: 'Não foi possível abrir seus dados' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Boas-vindas')).toBeNull();
  });
});
