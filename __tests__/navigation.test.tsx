import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, testRouter, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import type { DatabaseState } from '@/data/bootstrap';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { ONBOARDING_STEPS } from '@/features/onboarding/steps';

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

// Entre testes não há tela montada, então o estado muda fora de act().
beforeEach(() => {
  onboardingStatus.setCompleted(false);
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

  it('"Voltar" na primeira tela pede confirmação antes de sair', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await pressButton('Voltar');
    expect(alert).toHaveBeenCalledWith('Sair do app?', expect.any(String), expect.any(Array));
    await expectPath('/welcome');
    alert.mockRestore();
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
