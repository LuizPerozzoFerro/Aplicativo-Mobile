import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import * as schema from './schema';

export { schema };

/**
 * Banco tipado pelo esquema, com API síncrona. Serve ao expo-sqlite no app e
 * ao sql.js nos testes; os repositórios só conhecem este tipo.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/** Nome do arquivo do banco no armazenamento privado do app. Neutro de propósito. */
export const DATABASE_NAME = 'app.db';
