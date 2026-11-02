import fs from 'node:fs';
import path from 'node:path';

import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs, { type Database } from 'sql.js';

import { schema, type AppDatabase } from './database';
import { runMigrations } from './migrations';

// Só para testes em Jest: o mesmo esquema e as mesmas migrações do app, sobre
// SQLite em WebAssembly (sql.js), sem código nativo.

export type MigrationBundle = {
  journal: { entries: { idx: number; when: number; tag: string; breakpoints: boolean }[] };
  migrations: Record<string, string>;
};

const DRIZZLE_DIR = path.resolve(__dirname, '../../drizzle');

/**
 * Lê as migrações do disco no mesmo formato do drizzle/migrations.js. Ler do
 * disco evita que o cache do Jest use um SQL antigo embutido pelo Babel.
 */
export function loadMigrationBundle(): MigrationBundle {
  const journal = JSON.parse(
    fs.readFileSync(path.join(DRIZZLE_DIR, 'meta', '_journal.json'), 'utf8'),
  ) as MigrationBundle['journal'];
  const migrations = Object.fromEntries(
    journal.entries.map((entry) => [
      `m${entry.idx.toString().padStart(4, '0')}`,
      fs.readFileSync(path.join(DRIZZLE_DIR, `${entry.tag}.sql`), 'utf8'),
    ]),
  );
  return { journal, migrations };
}

export type TestDatabase = { db: AppDatabase; raw: Database };

/** Banco vazio em memória, com chaves estrangeiras ligadas, sem migrações. */
export async function createEmptyDatabase(): Promise<TestDatabase> {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();
  raw.run('PRAGMA foreign_keys = ON;');
  return { db: drizzle(raw, { schema }) as unknown as AppDatabase, raw };
}

/** Banco em memória já com todas as migrações do app aplicadas. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const database = await createEmptyDatabase();
  await runMigrations(database.db, loadMigrationBundle() as never);
  return database;
}

/** Valores de uma consulta SQL direta (para conferir o banco por fora do Drizzle). */
export function query(raw: Database, sqlText: string): unknown[][] {
  return raw.exec(sqlText)[0]?.values ?? [];
}
