import { renderHook, waitFor } from '@testing-library/react-native';

import { onboardingStatus } from '@/features/onboarding/onboardingStatus';

import { getRepositories, useDatabase } from './bootstrap';
import type { AppDatabase } from './database';
import { createEmptyDatabase, loadMigrationBundle, type TestDatabase } from './testing';

// O expo-sqlite nativo não roda no Jest: a abertura é simulada e o Drizzle
// devolve um banco sql.js vazio, onde rodam as migrações reais. O que se testa
// aqui é o tratamento de erro da abertura do app; o SQL tem testes próprios
// (migrations e repositories).
const mockOpenDatabaseSync = jest.fn();
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: (...args: unknown[]) => mockOpenDatabaseSync(...args),
}));

let mockTestDatabase: TestDatabase;
jest.mock('drizzle-orm/expo-sqlite', () => ({ drizzle: () => mockTestDatabase.db }));

const { runMigrations } = jest.requireActual<typeof import('./migrations')>('./migrations');
const mockRunMigrations = jest.fn<Promise<void>, [AppDatabase]>();
jest.mock('./migrations', () => ({
  runMigrations: (db: AppDatabase) => mockRunMigrations(db),
}));

let consoleError: jest.SpyInstance;

beforeEach(async () => {
  mockTestDatabase = await createEmptyDatabase();
  mockOpenDatabaseSync.mockReturnValue({ execSync: jest.fn() });
  mockRunMigrations.mockImplementation((db) => runMigrations(db, loadMigrationBundle() as never));
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => consoleError.mockRestore());

async function renderDatabaseState() {
  const { result } = await renderHook(() => useDatabase());
  return result;
}

describe('useDatabase', () => {
  it('se o arquivo do banco não abrir, mostra o erro em vez de fechar o app', async () => {
    mockOpenDatabaseSync.mockImplementation(() => {
      throw new Error('unable to open database file');
    });
    const result = await renderDatabaseState();
    await waitFor(() => expect(result.current).toEqual({ status: 'error' }));
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('se o PRAGMA falhar, mostra o erro', async () => {
    mockOpenDatabaseSync.mockReturnValue({
      execSync: () => {
        throw new Error('database disk image is malformed');
      },
    });
    const result = await renderDatabaseState();
    await waitFor(() => expect(result.current).toEqual({ status: 'error' }));
  });

  it('se as migrações falharem, mostra o erro e não libera os repositórios', async () => {
    mockRunMigrations.mockRejectedValue(new Error('migration failed'));
    const result = await renderDatabaseState();
    await waitFor(() => expect(result.current).toEqual({ status: 'error' }));
    expect(() => getRepositories()).toThrow();
  });

  // Por último: depois dele os repositórios ficam abertos neste arquivo.
  it('com tudo certo, fica pronto e liga a flag do onboarding ao banco', async () => {
    const result = await renderDatabaseState();
    await waitFor(() => expect(result.current).toEqual({ status: 'ready' }));

    onboardingStatus.setCompleted(true);
    expect(getRepositories().settings.get().onboardingCompleted).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
