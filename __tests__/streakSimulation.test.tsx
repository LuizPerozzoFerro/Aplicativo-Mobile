import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { AppState } from 'react-native';

import type { DatabaseState } from '@/data/bootstrap';
import { dataChanges, observeRepositories } from '@/data/changes';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { addCalendarDays, toDayKey } from '@/domain/day';
import { simulationStore } from '@/features/milestones/simulationStore';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { FakeMonitoringModule } from '@/monitoring';

// "Simular uma streak" (spec 04, 5.12) na tela de conferência, sobre as rotas
// reais: simular, ver a celebração ao voltar às abas e desfazer. O
// armazenamento chave-valor do expo-sqlite vira um mapa em memória.
jest.mock('expo-sqlite/kv-store', () => {
  const items = new Map<string, string>();
  return {
    SQLiteStorage: class {
      getItemSync(key: string) {
        return items.get(key) ?? null;
      }
      setItemSync(key: string, value: string) {
        items.set(key, value);
      }
      removeItemSync(key: string) {
        return items.delete(key);
      }
    },
  };
});
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
jest.mock('../modules/monitoring-android', () => ({
  ...jest.requireActual('../modules/monitoring-android'),
  getQuedoMonitoring: () => null,
}));

const APP_DIR = './app';
const daysAgo = (days: number) => addCalendarDays(new Date(), -days);
const press = async (name: string | RegExp) =>
  userEvent.setup().press(await screen.findByRole('button', { name }));

beforeEach(async () => {
  mockRepositories = observeRepositories(
    createRepositories((await createTestDatabase()).db),
    dataChanges.notify,
  );
  mockMonitoring = new FakeMonitoringModule();
  onboardingStatus.setCompleted(true);
  simulationStore.clear();
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
});
afterEach(() => jest.restoreAllMocks());

it('simula 7 dias, celebra ao voltar às abas e desfaz tudo', async () => {
  const adult = mockRepositories.compulsions.add({
    type: 'pornography',
    startedAt: daysAgo(20),
  });
  mockRepositories.compulsions.setInitialStreakDays(adult.id, 0);
  mockRepositories.relapses.record({ compulsionId: adult.id, dayKey: toDayKey(daysAgo(2)) });
  // A conferência de hoje já foi feita (não é a primeira abertura da Fase 5).
  mockRepositories.settings.setMilestonesCheckedOn(toDayKey(new Date()));
  const original = mockRepositories.compulsions.list()[0];

  // Pelo caminho do app: Perfil → "Monitoramento (base)".
  await renderRouter(APP_DIR, { initialUrl: '/profile' });
  await press(/^Monitoramento \(base\)/);
  // Ao abrir as abas, o app já gravou os alcances da história real (o 7 da sequência antiga).
  const reachesBefore = mockRepositories.milestoneReaches.listByCompulsion(adult.id);
  expect(reachesBefore.map((reach) => reach.milestoneDay).sort((a, b) => a - b)).toEqual([
    1, 1, 3, 7, 14,
  ]);
  await userEvent.setup().press(await screen.findByRole('radio', { name: '7 dias' }));
  await press('Simular streak de 7 dias');
  expect(await screen.findByTestId('dev-simulation-active')).toHaveTextContent(
    /Simulação ativa: Conteúdo adulto, 7 dias/,
  );
  expect(mockRepositories.relapses.listByCompulsion(adult.id)).toEqual([]);
  // Uma simulação por vez: só o "Desfazer" aparece.
  expect(screen.queryByRole('button', { name: /Simular streak/ })).toBeNull();

  await press('Voltar');
  // Nas abas, o 7 da sequência simulada abre a celebração "de novo"; o 1 e o 3 entram sem tela.
  expect(await screen.findByText('Você chegou de novo a 7 dias')).toBeOnTheScreen();
  expect(
    mockRepositories.milestoneReaches
      .listByCompulsion(adult.id)
      .filter((reach) => reach.streakBaseDay === toDayKey(daysAgo(7)))
      .map((reach) => reach.milestoneDay),
  ).toEqual([1, 3, 7]);
  await press('Fechar');

  // O registro continua: abrir a tela de novo ainda mostra a simulação.
  await press(/^Monitoramento \(base\)/);
  expect(await screen.findByTestId('dev-simulation-active')).toBeOnTheScreen();
  await press('Desfazer a simulação');
  expect(await screen.findByText(/Simulação desfeita/)).toBeOnTheScreen();
  expect(mockRepositories.compulsions.list()[0]).toEqual(original);
  expect(mockRepositories.relapses.listByCompulsion(adult.id)).toHaveLength(1);
  // Os alcances de antes ficam; só os da simulação saem.
  expect(mockRepositories.milestoneReaches.listByCompulsion(adult.id)).toEqual(reachesBefore);
  expect(simulationStore.read()).toBeNull();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Simular streak de 7 dias' })).toBeOnTheScreen(),
  );
});

it('com duas compulsões, escolhe qual simular', async () => {
  mockRepositories.compulsions.add({
    type: 'short_videos',
    startedAt: daysAgo(2),
    dailyLimitMinutes: 30,
  });
  const adult = mockRepositories.compulsions.add({ type: 'pornography', startedAt: daysAgo(2) });
  mockRepositories.compulsions.setInitialStreakDays(adult.id, 0);
  await renderRouter(APP_DIR, { initialUrl: '/dev-monitoring' });

  const compulsion = within(await screen.findByTestId('dev-simulation-compulsion'));
  await userEvent.setup().press(compulsion.getByRole('radio', { name: 'Conteúdo adulto' }));
  await userEvent.setup().press(screen.getByRole('radio', { name: '6 dias' }));
  await press('Simular streak de 6 dias');
  expect(await screen.findByTestId('dev-simulation-active')).toHaveTextContent(
    /Conteúdo adulto, 6 dias/,
  );
  expect(simulationStore.read()).toMatchObject({ compulsionId: adult.id, days: 6 });
});
