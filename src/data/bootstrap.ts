import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { onboardingStatus } from '@/features/onboarding/onboardingStatus';

import { DATABASE_NAME, schema } from './database';
import { runMigrations } from './migrations';
import { createRepositories } from './repositories';

// Banco do app no aparelho. Fica no armazenamento privado do app e fora do
// backup do sistema (allowBackup: false no app.config.ts).
const expoDb = openDatabaseSync(DATABASE_NAME);
// O SQLite só respeita chaves estrangeiras (e a cascata) com este PRAGMA.
expoDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });
export const repositories = createRepositories(db);

export type DatabaseState = { status: 'loading' } | { status: 'ready' } | { status: 'error' };

/**
 * Aplica as migrações na abertura do app e liga a flag do onboarding ao banco.
 * Só fica "ready" depois disso, para a primeira tela já sair certa (sem piscar
 * o onboarding antes das abas).
 */
export function useDatabase(): DatabaseState {
  const [state, setState] = useState<DatabaseState>({ status: 'loading' });

  useEffect(() => {
    runMigrations(db)
      .then(() => {
        onboardingStatus.connect({
          load: () => repositories.settings.get().onboardingCompleted,
          save: (completed) => repositories.settings.setOnboardingCompleted(completed),
        });
        setState({ status: 'ready' });
      })
      .catch((error: unknown) => {
        // Só a mensagem técnica do SQLite; as migrações não têm dado do usuário.
        console.error('Falha ao aplicar as migrações do banco', error);
        setState({ status: 'error' });
      });
  }, []);

  return state;
}
