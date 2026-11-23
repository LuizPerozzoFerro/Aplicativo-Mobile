import { act, userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { AppState, type AppStateStatus } from 'react-native';

import type { DatabaseState } from '@/data/bootstrap';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { addCalendarDays } from '@/domain/day';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { FakeMonitoringModule } from '@/monitoring';

// Player do vídeo do marco (spec 04, 5.6) sobre as rotas reais. O expo-video é
// nativo: aqui um player falso guarda as chamadas e muda o status como o real.
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
jest.mock('@/features/milestones/useMilestoneCelebrations', () => ({
  useMilestoneCelebrations: () => undefined,
}));
jest.mock('@/config/variant', () => ({
  variant: {
    environment: 'development',
    features: { domainMonitoring: false },
    contentBaseUrl: 'https://conteudo.example.com',
  },
}));

type Listener = (payload: { status: string }) => void;
class MockPlayer {
  status = 'idle';
  loop = true;
  calls: string[] = [];
  sources: unknown[] = [];
  private listeners = new Set<Listener>();
  addListener(event: string, listener: Listener) {
    if (event === 'statusChange') this.listeners.add(listener);
    return { remove: () => this.listeners.delete(listener) };
  }
  setStatus(status: string) {
    this.status = status;
    for (const listener of this.listeners) listener({ status });
  }
  async replaceAsync(source: unknown) {
    this.sources.push(source);
    this.calls.push('replace');
    this.setStatus('loading');
  }
  play() {
    this.calls.push('play');
  }
  pause() {
    this.calls.push('pause');
  }
}
let mockPlayer: MockPlayer;
jest.mock('expo-video', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useVideoPlayer: (_source: unknown, setup?: (player: MockPlayer) => void) => {
      setup?.(mockPlayer);
      return mockPlayer;
    },
    VideoView: (props: { testID?: string }) => <View testID={props.testID} />,
  };
});

const APP_DIR = './app';
const press = async (name: string | RegExp) =>
  userEvent.setup().press(await screen.findByRole('button', { name }));
// Conteúdo de teste (content/): o vídeo de 3 dias da moderação é o marcado como IA.
const IDS = { adult3: 'ffd3727362', videos3: '697857b80e' };

// Quem ouve a mudança de estado do app (o mock do React Native não dispara nada).
const appStateListeners = new Set<(state: AppStateStatus) => void>();
const setAppState = (state: AppStateStatus) => {
  for (const listener of [...appStateListeners]) listener(state);
};

beforeEach(async () => {
  mockRepositories = createRepositories((await createTestDatabase()).db);
  mockMonitoring = new FakeMonitoringModule();
  mockPlayer = new MockPlayer();
  onboardingStatus.setCompleted(true);
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  // O catálogo tenta a atualização remota ao abrir: sem rede no teste.
  global.fetch = jest.fn(() => Promise.reject(new Error('sem rede'))) as typeof fetch;
  appStateListeners.clear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((type, listener) => {
    const typed = listener as (state: AppStateStatus) => void;
    if (type === 'change') appStateListeners.add(typed);
    return { remove: () => appStateListeners.delete(typed) } as ReturnType<
      typeof AppState.addEventListener
    >;
  });
});
afterEach(() => jest.restoreAllMocks());

function addCompulsion(type: 'pornography' | 'short_videos', startedDaysAgo: number) {
  const startedAt = addCalendarDays(new Date(), -startedDaysAgo);
  return type === 'pornography'
    ? mockRepositories.compulsions.add({ type, startedAt })
    : mockRepositories.compulsions.add({ type, startedAt, dailyLimitMinutes: 60 });
}

describe('vídeo do marco', () => {
  it('desbloqueado: o detalhe tem "Assistir ao vídeo", que abre o player', async () => {
    addCompulsion('pornography', 5);
    await renderRouter(APP_DIR, { initialUrl: '/milestone?compulsion=pornography&day=3' });
    await press('Assistir ao vídeo');
    await waitFor(() => expect(screen).toHavePathname('/video'));
    expect(await screen.findByTestId('video-screen')).toBeOnTheScreen();
  });

  it('não toca sozinho: nada é carregado antes do toque; depois, carrega com cache e toca', async () => {
    addCompulsion('pornography', 5);
    await renderRouter(APP_DIR, { initialUrl: '/video?compulsion=pornography&day=3' });

    expect(await screen.findByTestId('video-play')).toBeOnTheScreen();
    expect(mockPlayer.calls).toEqual([]);
    expect(mockPlayer.loop).toBe(false);

    await press('Tocar o vídeo');
    expect(mockPlayer.sources).toEqual([
      { uri: `https://conteudo.example.com/videos/${IDS.adult3}.mp4`, useCaching: true },
    ]);
    expect(mockPlayer.calls).toEqual(['replace', 'play']);
    expect(screen.getByTestId('video-view')).toBeOnTheScreen();
    expect(screen.getByTestId('video-loading')).toBeOnTheScreen();

    await act(async () => mockPlayer.setStatus('readyToPlay'));
    await waitFor(() => expect(screen.queryByTestId('video-loading')).toBeNull());
  });

  it('selo de IA no vídeo marcado como gerado com IA', async () => {
    addCompulsion('short_videos', 5);
    await renderRouter(APP_DIR, { initialUrl: '/video?compulsion=short_videos&day=3' });
    expect(await screen.findByText('Conteúdo gerado com IA')).toBeOnTheScreen();
  });

  it('sem selo no vídeo que não é gerado com IA', async () => {
    addCompulsion('pornography', 5);
    await renderRouter(APP_DIR, { initialUrl: '/video?compulsion=pornography&day=3' });
    expect(await screen.findByTestId('video-play')).toBeOnTheScreen();
    expect(screen.queryByTestId('video-ai-badge')).toBeNull();
  });

  it('erro ou sem internet: mensagem neutra e "Tentar de novo" carrega de novo', async () => {
    addCompulsion('pornography', 5);
    await renderRouter(APP_DIR, { initialUrl: '/video?compulsion=pornography&day=3' });
    await press('Tocar o vídeo');
    await act(async () => mockPlayer.setStatus('error'));

    expect(await screen.findByText(/Não foi possível carregar o vídeo/)).toBeOnTheScreen();
    await press('Tentar de novo');
    expect(mockPlayer.calls).toEqual(['replace', 'play', 'replace', 'play']);
    expect(screen.queryByText(/Não foi possível carregar o vídeo/)).toBeNull();
  });

  it('para quando o app vai para o segundo plano e ao sair da tela', async () => {
    addCompulsion('pornography', 5);
    await renderRouter(APP_DIR, { initialUrl: '/milestone?compulsion=pornography&day=3' });
    await press('Assistir ao vídeo');
    await press('Tocar o vídeo');

    await waitFor(() => expect(mockPlayer.calls).toContain('play'));
    await act(async () => setAppState('background'));
    expect(mockPlayer.calls.at(-1)).toBe('pause');

    mockPlayer.calls = [];
    // O detalhe, por baixo, também tem "Voltar": o da tela do vídeo.
    await userEvent
      .setup()
      .press(within(screen.getByTestId('video-screen')).getByRole('button', { name: 'Voltar' }));
    await waitFor(() => expect(screen).toHavePathname('/milestone'));
    expect(mockPlayer.calls).toContain('pause');
  });

  it('marco ainda não alcançado: o player não toca nada', async () => {
    addCompulsion('pornography', 2);
    await renderRouter(APP_DIR, { initialUrl: '/video?compulsion=pornography&day=7' });
    expect(await screen.findByTestId('video-unavailable')).toBeOnTheScreen();
    expect(mockPlayer.calls).toEqual([]);
  });

  it('marco sem vídeo: o player não toca nada', async () => {
    addCompulsion('pornography', 70);
    await renderRouter(APP_DIR, { initialUrl: '/video?compulsion=pornography&day=60' });
    expect(await screen.findByTestId('video-unavailable')).toBeOnTheScreen();
  });
});
