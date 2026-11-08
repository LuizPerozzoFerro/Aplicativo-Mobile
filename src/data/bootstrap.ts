import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { onboardingProgress } from '@/features/onboarding/onboardingProgress';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';

import { dataChanges, observeRepositories } from './changes';
import { DATABASE_NAME, schema, type AppDatabase } from './database';
import { runMigrations } from './migrations';
import { createRepositories, type Repositories } from './repositories';

type AppData = { db: AppDatabase; repositories: Repositories };

let appData: AppData | null = null;

/**
 * Abre o banco do app no aparelho. Fica no armazenamento privado do app e fora
 * do backup do sistema (allowBackup: false no app.config.ts).
 */
function openAppDatabase(): AppData {
  const expoDb = openDatabaseSync(DATABASE_NAME);
  // O SQLite só respeita chaves estrangeiras (e a cascata) com este PRAGMA.
  expoDb.execSync('PRAGMA foreign_keys = ON;');
  const db = drizzle(expoDb, { schema });
  // Toda gravação avisa a sincronização com o monitoramento (src/features/monitoring).
  return { db, repositories: observeRepositories(createRepositories(db), dataChanges.notify) };
}

/**
 * Abre o banco, aplica as migrações e liga a flag e a etapa do onboarding ao
 * banco. A abertura fica aqui dentro (e não na importação do módulo) para que
 * uma falha nela caia no mesmo tratamento das migrações, em vez de fechar o app.
 */
export async function initializeDatabase(): Promise<void> {
  const data = openAppDatabase();
  await runMigrations(data.db);
  // Aqui nenhuma tela está aberta: sessão aberta é de um processo que morreu.
  data.repositories.emergencySessions.abandonOpen();
  onboardingStatus.connect({
    load: () => data.repositories.settings.get().onboardingCompleted,
    save: (completed) => data.repositories.settings.setOnboardingCompleted(completed),
  });
  onboardingProgress.connect({
    load: () => data.repositories.settings.get().onboardingStep,
    save: (step) => data.repositories.settings.setOnboardingStep(step),
  });
  appData = data;
}

/** Repositórios do banco aberto. Só existe depois de useDatabase() ficar "ready". */
export function getRepositories(): Repositories {
  if (!appData) {
    throw new Error('O banco ainda não foi aberto');
  }
  return appData.repositories;
}

export type DatabaseState = { status: 'loading' } | { status: 'ready' } | { status: 'error' };

/**
 * Prepara o banco na abertura do app. Só fica "ready" depois disso, para a
 * primeira tela já sair certa (sem piscar o onboarding antes das abas).
 */
export function useDatabase(): DatabaseState {
  const [state, setState] = useState<DatabaseState>({ status: 'loading' });

  useEffect(() => {
    initializeDatabase()
      .then(() => setState({ status: 'ready' }))
      .catch((error: unknown) => {
        // Só a mensagem técnica do SQLite; abertura e migrações não têm dado do usuário.
        console.error('Falha ao abrir o banco ou aplicar as migrações', error);
        setState({ status: 'error' });
      });
  }, []);

  return state;
}
