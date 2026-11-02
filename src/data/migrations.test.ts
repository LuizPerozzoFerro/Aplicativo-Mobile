import { migrations as bundledMigrations, runMigrations } from './migrations';
import { createRepositories } from './repositories';
import {
  createEmptyDatabase,
  createTestDatabase,
  loadMigrationBundle,
  query,
  type MigrationBundle,
} from './testing';

const TABLES = ['monitored_apps', 'motivation', 'settings', 'triggers', 'user_compulsions'];

const appliedCount = (raw: Parameters<typeof query>[0]) =>
  Number(query(raw, 'SELECT count(*) FROM __drizzle_migrations')[0]?.[0]);

const tableNames = (raw: Parameters<typeof query>[0]) =>
  query(raw, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").map(
    ([name]) => name,
  );

/** Migração 002 de teste: só existe aqui, para o cenário de duas migrações (V11). */
function withTestMigration002(bundle: MigrationBundle): MigrationBundle {
  const last = bundle.journal.entries[bundle.journal.entries.length - 1]!;
  return {
    journal: {
      entries: [
        ...bundle.journal.entries,
        { idx: last.idx + 1, when: last.when + 1000, tag: '0001_test_probe', breakpoints: true },
      ],
    },
    migrations: {
      ...bundle.migrations,
      // Depende de uma tabela da 001: só funciona se a ordem for respeitada.
      [`m${(last.idx + 1).toString().padStart(4, '0')}`]:
        'ALTER TABLE `motivation` ADD `probe` text;--> statement-breakpoint\n' +
        'CREATE TABLE `migration_probe` (`id` integer PRIMARY KEY NOT NULL);',
    },
  };
}

describe('migrações', () => {
  it('o drizzle/migrations.js embutido no app tem todas as migrações do índice', () => {
    const fromDisk = loadMigrationBundle();
    expect(Object.keys(bundledMigrations.migrations).sort()).toEqual(
      Object.keys(fromDisk.migrations).sort(),
    );
    expect(bundledMigrations.journal.entries.map((entry) => entry.tag)).toEqual(
      fromDisk.journal.entries.map((entry) => entry.tag),
    );
  });

  it('a 001 cria as cinco tabelas da Fase 3', async () => {
    const { raw } = await createTestDatabase();
    expect(tableNames(raw)).toEqual(expect.arrayContaining(TABLES));
    expect(appliedCount(raw)).toBe(1);
  });

  it('rodar de novo não reaplica nada', async () => {
    const { db, raw } = await createTestDatabase();
    await runMigrations(db, loadMigrationBundle() as never);
    await runMigrations(db, loadMigrationBundle() as never);
    expect(appliedCount(raw)).toBe(1);
  });

  it('duas migrações sobre um banco com dados: aplica só a nova e preserva os dados (V11)', async () => {
    const { db, raw } = await createEmptyDatabase();
    const bundle = loadMigrationBundle();
    await runMigrations(db, bundle as never);

    const repositories = createRepositories(db);
    repositories.settings.setOnboardingCompleted(true);
    repositories.motivation.save('Quero ter mais tempo para mim.');

    await runMigrations(db, withTestMigration002(bundle) as never);
    expect(appliedCount(raw)).toBe(2);
    expect(tableNames(raw)).toContain('migration_probe');
    expect(repositories.settings.get().onboardingCompleted).toBe(true);
    expect(repositories.motivation.get()?.text).toBe('Quero ter mais tempo para mim.');

    await runMigrations(db, withTestMigration002(bundle) as never);
    expect(appliedCount(raw)).toBe(2);
  });

  it('banco novo com as duas migrações de uma vez aplica as duas, em ordem', async () => {
    const { db, raw } = await createEmptyDatabase();
    await runMigrations(db, withTestMigration002(loadMigrationBundle()) as never);
    expect(appliedCount(raw)).toBe(2);
    expect(query(raw, 'PRAGMA table_info(motivation)').map((column) => column[1])).toContain(
      'probe',
    );
  });
});

describe('restrições do esquema', () => {
  it.each([
    ["INSERT INTO user_compulsions (type, started_at) VALUES ('gaming', 0)", 'tipo fora da lista'],
    [
      "INSERT INTO user_compulsions (type, status, started_at) VALUES ('short_videos', 'done', 0)",
      'situação fora da lista',
    ],
    ["INSERT INTO triggers (kind, value) VALUES ('place', 'x')", 'gatilho de localização'],
    ['INSERT INTO settings (id, created_at) VALUES (2, 0)', 'segunda linha de configurações'],
    [
      "INSERT INTO monitored_apps (compulsion_id, package_name, role) VALUES (999, 'app.test', 'risk')",
      'app de uma compulsão que não existe',
    ],
  ])('o banco recusa %s (%s)', async (statement) => {
    const { raw } = await createTestDatabase();
    expect(() => raw.run(statement)).toThrow();
  });
});
