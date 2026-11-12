import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor, within } from 'expo-router/testing-library';

import type { DatabaseState } from '@/data/bootstrap';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { onboardingProgress } from '@/features/onboarding/onboardingProgress';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { asTargetId, FakeMonitoringModule, type MonitoringTarget } from '@/monitoring';

// A lista de apps com um aparelho parecido com o real: uns 200 apps, com nomes
// acentuados, na ordem em que o sistema entrega (spec 02, 4.4; NOTAS-APP.md).
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
const target = (id: string, label: string): MonitoringTarget => ({ id: asTargetId(id), label });

const SUGGESTED = [
  target('com.instagram.android', 'Instagram'),
  target('com.google.android.youtube', 'YouTube'),
  target('com.twitter.android', 'X'),
  target('com.reddit.frontpage', 'Reddit'),
];
// Fora de ordem de propósito, e com a armadilha do acento: "Câmera" antes de "Chrome".
const ACCENTED = [
  target('com.example.zebra', 'Zebra'),
  target('com.example.correios', 'Correios'),
  target('com.example.camera', 'Câmera'),
  target('com.example.chrome', 'Chrome'),
  target('com.example.agua', 'água limpa'),
  target('com.example.banco', 'Banco'),
  target('com.example.emoji', 'Éter'),
  target('com.example.estudo', 'Estudo'),
];
const FILLER = Array.from({ length: 190 }, (_, index) =>
  target(`com.example.filler${index}`, `Ferramenta ${String(index).padStart(3, '0')}`),
);
const MANY_APPS = [...FILLER, ...ACCENTED, ...SUGGESTED];
const ONLY_OTHERS = [...ACCENTED];

const press = async (name: string) =>
  userEvent.setup().press(await screen.findByRole('button', { name }));
const list = async (id: string) => within(await screen.findByTestId(id));
const pressApp = async (id: string, name: string) =>
  userEvent.setup().press((await list(id)).getByRole('checkbox', { name }));
const chipNames = async (id: string) =>
  (await list(id)).getAllByRole('checkbox').map((chip) => chip.props.accessibilityLabel as string);
const chipNamesNow = (id: string) =>
  within(screen.getByTestId(id))
    .getAllByRole('checkbox')
    .map((chip) => chip.props.accessibilityLabel as string);
const isChecked = async (id: string, name: string) =>
  (await list(id)).getByRole('checkbox', { name }).props.accessibilityState.checked as boolean;

beforeEach(async () => {
  mockRepositories = createRepositories((await createTestDatabase()).db);
  mockMonitoring = new FakeMonitoringModule({ targets: MANY_APPS });
  onboardingStatus.setCompleted(false);
  onboardingProgress.connect({ load: () => null, save: () => undefined });
});
afterEach(() => jest.restoreAllMocks());

function renderOnboardingSetup() {
  mockRepositories.compulsions.add({ type: 'pornography', startedAt: new Date() });
  mockRepositories.compulsions.add({ type: 'short_videos', startedAt: new Date() });
  return renderRouter(APP_DIR, { initialUrl: '/setup' });
}

describe('onboarding, com uns 200 apps', () => {
  const VIDEOS = 'short-video-apps';
  const RISK = 'risk-apps';

  it('recolhida: só os sugeridos de cada lista, no topo e já marcados', async () => {
    await renderOnboardingSetup();
    await screen.findByTestId(VIDEOS);
    expect(await chipNames(VIDEOS)).toEqual(['Instagram', 'YouTube']);
    expect(await chipNames(RISK)).toEqual(['Reddit', 'X']);
    expect(await isChecked(VIDEOS, 'Instagram')).toBe(true);
    expect(await isChecked(RISK, 'X')).toBe(true);
    expect(screen.queryByLabelText('Buscar app')).not.toBeOnTheScreen();
  });

  it('expandida: sugeridos no topo e o resto em ordem alfabética do pt-BR', async () => {
    await renderOnboardingSetup();
    await screen.findByTestId(RISK);
    await userEvent.setup().press(screen.getAllByRole('button', { name: 'Ver outros apps' })[0]!);

    const names = await chipNames(RISK);
    expect(names).toHaveLength(MANY_APPS.length);
    expect(names.slice(0, 2)).toEqual(['Reddit', 'X']);
    const rest = names.slice(2).filter((name) => !name.startsWith('Ferramenta'));
    expect(rest).toEqual([
      'água limpa',
      'Banco',
      'Câmera',
      'Chrome',
      'Correios',
      'Estudo',
      'Éter',
      'Instagram',
      'YouTube',
      'Zebra',
    ]);
  });

  it('marcar um app da lista expandida o mantém à vista depois de recolher', async () => {
    await renderOnboardingSetup();
    await screen.findByTestId(RISK);
    await userEvent.setup().press(screen.getAllByRole('button', { name: 'Ver outros apps' })[0]!);
    await pressApp(RISK, 'Câmera');
    await press('Recolher a lista');

    expect(await chipNames(RISK)).toEqual(['Reddit', 'X', 'Câmera']);
    expect(await isChecked(RISK, 'Câmera')).toBe(true);
    expect(
      await screen.findByText('Você costuma ver esse tipo de conteúdo em Câmera?'),
    ).toBeOnTheScreen();
  });

  it('a busca filtra sem acento e marcar nela não perde o que já estava marcado', async () => {
    await renderOnboardingSetup();
    await screen.findByTestId(RISK);
    await userEvent.setup().press(screen.getAllByRole('button', { name: 'Ver outros apps' })[0]!);
    await userEvent.setup().type(screen.getByLabelText('Buscar app'), 'camera');

    await waitFor(() => expect(chipNamesNow(RISK)).toEqual(['Câmera']));
    await pressApp(RISK, 'Câmera');
    await press('Recolher a lista');

    expect(await chipNames(RISK)).toEqual(['Reddit', 'X', 'Câmera']);
    expect(await isChecked(RISK, 'X')).toBe(true);
    expect(await isChecked(RISK, 'Reddit')).toBe(true);
  });

  it('recolher limpa a busca', async () => {
    await renderOnboardingSetup();
    await screen.findByTestId(RISK);
    const first = () => screen.getAllByRole('button', { name: 'Ver outros apps' })[0]!;
    await userEvent.setup().press(first());
    await userEvent.setup().type(screen.getByLabelText('Buscar app'), 'camera');
    await waitFor(() => expect(chipNamesNow(RISK)).toEqual(['Câmera']));
    await press('Recolher a lista');
    await userEvent.setup().press(first());

    expect(screen.getByLabelText('Buscar app').props.value).toBe('');
    expect(chipNamesNow(RISK)).toHaveLength(MANY_APPS.length);
  });

  it('busca sem resultado diz que não achou', async () => {
    await renderOnboardingSetup();
    await screen.findByTestId(RISK);
    await userEvent.setup().press(screen.getAllByRole('button', { name: 'Ver outros apps' })[0]!);
    await userEvent.setup().type(screen.getByLabelText('Buscar app'), 'zzzz');
    expect(await screen.findByText('Nenhum app encontrado.')).toBeOnTheScreen();
  });

  it('nenhum sugerido instalado: uma frase e o botão, nunca uma área vazia', async () => {
    mockMonitoring = new FakeMonitoringModule({ targets: ONLY_OTHERS });
    await renderOnboardingSetup();
    expect(
      (await screen.findAllByText('Nenhum dos apps mais comuns está neste aparelho.')).length,
    ).toBe(2);
    expect(screen.queryByTestId(VIDEOS)).not.toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Ver outros apps' })).toHaveLength(2);

    await userEvent.setup().press(screen.getAllByRole('button', { name: 'Ver outros apps' })[0]!);
    expect(await list(RISK)).toBeTruthy();
  });

  it('todos à vista: não oferece "Ver outros apps"', async () => {
    mockMonitoring = new FakeMonitoringModule({ targets: SUGGESTED.slice(0, 2) });
    mockRepositories.compulsions.add({ type: 'short_videos', startedAt: new Date() });
    await renderRouter(APP_DIR, { initialUrl: '/setup' });
    await screen.findByTestId(VIDEOS);
    expect(await chipNames(VIDEOS)).toEqual(['Instagram', 'YouTube']);
    expect(screen.queryByRole('button', { name: 'Ver outros apps' })).not.toBeOnTheScreen();
  });

  it('sem nenhum app no aparelho: mantém a mensagem, sem botão', async () => {
    mockMonitoring = new FakeMonitoringModule({ targets: [] });
    await renderOnboardingSetup();
    expect(
      (await screen.findAllByText('Nenhum app encontrado neste aparelho.')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Ver outros apps' })).not.toBeOnTheScreen();
  });
});

describe('Perfil, com uns 200 apps', () => {
  const VIDEOS = 'short-video-apps';

  beforeEach(() => {
    onboardingStatus.setCompleted(true);
    mockRepositories.settings.setOnboardingCompleted(true);
    const { id } = mockRepositories.compulsions.add({
      type: 'short_videos',
      startedAt: new Date(),
      dailyLimitMinutes: 60,
    });
    mockRepositories.monitoredApps.replaceForCompulsion(id, [
      { packageName: 'com.instagram.android', role: 'short_video' },
      { packageName: 'com.example.correios', role: 'short_video' },
    ]);
  });

  it('o app gravado que não é sugerido aparece com a lista recolhida', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/edit/short-videos' });
    await screen.findByTestId(VIDEOS);
    expect(await chipNames(VIDEOS)).toEqual(['Instagram', 'YouTube', 'Correios']);
    expect(await isChecked(VIDEOS, 'Correios')).toBe(true);
    expect(await isChecked(VIDEOS, 'YouTube')).toBe(false);
  });

  it('a busca funciona e salvar grava o app novo junto com os antigos', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/edit/short-videos' });
    await screen.findByTestId(VIDEOS);
    await press('Ver outros apps');
    await userEvent.setup().type(screen.getByLabelText('Buscar app'), 'banco');
    await waitFor(() => expect(chipNamesNow(VIDEOS)).toEqual(['Banco']));
    await pressApp(VIDEOS, 'Banco');
    await press('Salvar');

    const [compulsion] = mockRepositories.compulsions.list();
    await waitFor(() =>
      expect(
        mockRepositories.monitoredApps
          .listByCompulsion(compulsion!.id)
          .map((app) => app.packageName)
          .sort(),
      ).toEqual(['com.example.banco', 'com.example.correios', 'com.instagram.android']),
    );
  });
});
