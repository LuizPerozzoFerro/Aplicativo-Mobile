import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from '../../drizzle/migrations';
import type { AppDatabase } from './database';

export { migrations };

type MigrationBundle = Parameters<typeof migrate>[1];

/**
 * Aplica, em ordem e uma única vez, as migrações ainda não aplicadas (a tabela
 * __drizzle_migrations guarda o que já rodou). O migrador do Drizzle para Expo
 * só usa o dialeto e a sessão, então o mesmo código roda no app (expo-sqlite)
 * e nos testes (sql.js).
 */
export function runMigrations(
  db: AppDatabase,
  bundle: MigrationBundle = migrations as MigrationBundle,
): Promise<void> {
  return migrate(db as Parameters<typeof migrate>[0], bundle);
}
