import { migrations as bundledMigrations, runMigrations } from './migrations';
import { createRepositories } from './repositories';
import {
  createEmptyDatabase,
  createTestDatabase,
  loadMigrationBundle,
  query,
  type MigrationBundle,
} from './testing';

const TABLES_001 = ['monitored_apps', 'motivation', 'settings', 'triggers', 'user_compulsions'];
const TABLES_002 = ['check_ins', 'day_states', 'relapses'];
/** Migrações do app no índice (drizzle/meta/_journal.json). */
const APP_MIGRATIONS = loadMigrationBundle().journal.entries.length;

type Raw = Parameters<typeof query>[0];

const appliedCount = (raw: Raw) =>
  Number(query(raw, 'SELECT count(*) FROM __drizzle_migrations')[0]?.[0]);

const tableNames = (raw: Raw) =>
  query(raw, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").map(
    ([name]) => name,
  );

const columnNames = (raw: Raw, table: string) =>
  query(raw, `PRAGMA table_info(${table})`).map((column) => column[1]);

/** As primeiras `count` migrações do app (ex.: 1 = banco como na Fase 2). */
function firstMigrations(bundle: MigrationBundle, count: number): MigrationBundle {
  const entries = bundle.journal.entries.slice(0, count);
  return {
    journal: { entries },
    migrations: Object.fromEntries(
      entries.map((entry) => {
        const key = `m${entry.idx.toString().padStart(4, '0')}`;
        return [key, bundle.migrations[key]!];
      }),
    ),
  };
}

/** Acrescenta uma migração de teste depois das do app: só existe aqui. */
function withExtraMigration(bundle: MigrationBundle, sqlText: string): MigrationBundle {
  const last = bundle.journal.entries[bundle.journal.entries.length - 1]!;
  const idx = last.idx + 1;
  const key = idx.toString().padStart(4, '0');
  return {
    journal: {
      entries: [
        ...bundle.journal.entries,
        { idx, when: last.when + 1000, tag: `${key}_test_probe`, breakpoints: true },
      ],
    },
    migrations: { ...bundle.migrations, [`m${key}`]: sqlText },
  };
}

/** Migração extra do cenário V11. Depende de uma tabela da 001: só funciona em ordem. */
function withTestMigration(bundle: MigrationBundle): MigrationBundle {
  return withExtraMigration(
    bundle,
    'ALTER TABLE `motivation` ADD `probe` text;--> statement-breakpoint\n' +
      'CREATE TABLE `migration_probe` (`id` integer PRIMARY KEY NOT NULL);',
  );
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

  it('as migrações criam as tabelas da 001 e as da 002, e a 003 a coluna do início informado', async () => {
    const { raw } = await createTestDatabase();
    expect(tableNames(raw)).toEqual(expect.arrayContaining([...TABLES_001, ...TABLES_002]));
    expect(columnNames(raw, 'user_compulsions')).toContain('initial_streak_days');
    expect(appliedCount(raw)).toBe(APP_MIGRATIONS);
  });

  it('rodar de novo não reaplica nada', async () => {
    const { db, raw } = await createTestDatabase();
    await runMigrations(db, loadMigrationBundle() as never);
    await runMigrations(db, loadMigrationBundle() as never);
    expect(appliedCount(raw)).toBe(APP_MIGRATIONS);
  });

  it('002 sobre um banco da Fase 2 com dados: aplica e preserva tudo (R10)', async () => {
    const { db, raw } = await createEmptyDatabase();
    const bundle = loadMigrationBundle();
    await runMigrations(db, firstMigrations(bundle, 1) as never);
    expect(appliedCount(raw)).toBe(1);
    expect(columnNames(raw, 'settings')).not.toContain('onboarding_step');

    // Dados como a Fase 2 gravaria, em SQL: os repositórios já são os da Fase 3.
    raw.run(
      'INSERT INTO settings (id, onboarding_completed, age_confirmed_at, created_at) VALUES (1, 1, 1000, 500)',
    );
    raw.run(
      "INSERT INTO user_compulsions (id, type, started_at, daily_limit_minutes) VALUES (7, 'short_videos', 2000, 30)",
    );
    raw.run(
      "INSERT INTO monitored_apps (compulsion_id, package_name, role) VALUES (7, 'com.example.clips', 'short_video')",
    );
    raw.run("INSERT INTO triggers (id, compulsion_id, kind, value) VALUES (3, 7, 'weekday', '6')");
    raw.run("INSERT INTO motivation (text, updated_at) VALUES ('Quero ter mais tempo.', 3000)");

    await runMigrations(db, bundle as never);
    expect(appliedCount(raw)).toBe(APP_MIGRATIONS);
    expect(tableNames(raw)).toEqual(expect.arrayContaining(TABLES_002));

    const repositories = createRepositories(db);
    expect(repositories.settings.get()).toEqual({
      id: 1,
      onboardingCompleted: true,
      ageConfirmedAt: new Date(1000),
      proactiveNotificationDailyLimit: 6,
      createdAt: new Date(500),
      onboardingStep: null,
      checkInMinutes: 1260,
    });
    expect(repositories.compulsions.list()).toEqual([
      {
        id: 7,
        type: 'short_videos',
        status: 'active',
        startedAt: new Date(2000),
        dailyLimitMinutes: 30,
        initialStreakDays: null,
      },
    ]);
    expect(repositories.monitoredApps.listByCompulsion(7)).toHaveLength(1);
    expect(repositories.triggers.list()).toEqual([
      { id: 3, compulsionId: 7, kind: 'weekday', value: '6' },
    ]);
    expect(repositories.motivation.get()?.text).toBe('Quero ter mais tempo.');

    // A cascata continua valendo depois de a 002 recriar `triggers`.
    repositories.compulsions.remove(7);
    expect(repositories.triggers.list()).toEqual([]);
  });

  it('002 com falha não deixa o banco pela metade (transação)', async () => {
    const { db, raw } = await createEmptyDatabase();
    const bundle = loadMigrationBundle();
    await runMigrations(db, firstMigrations(bundle, 1) as never);
    // Um gatilho com valor que a 002 passa a recusar faz a cópia de `triggers` falhar.
    raw.run("INSERT INTO triggers (kind, value) VALUES ('weekday', 'saturday')");

    await expect(runMigrations(db, bundle as never)).rejects.toThrow();
    expect(appliedCount(raw)).toBe(1);
    expect(tableNames(raw)).not.toContain('check_ins');
    expect(columnNames(raw, 'settings')).not.toContain('onboarding_step');
    expect(query(raw, 'SELECT value FROM triggers')).toEqual([['saturday']]);
  });

  it('uma migração a mais sobre um banco com dados: aplica só a nova e preserva os dados (V11)', async () => {
    const { db, raw } = await createEmptyDatabase();
    const bundle = loadMigrationBundle();
    await runMigrations(db, bundle as never);

    const repositories = createRepositories(db);
    repositories.settings.setOnboardingCompleted(true);
    repositories.motivation.save('Quero ter mais tempo para mim.');

    await runMigrations(db, withTestMigration(bundle) as never);
    expect(appliedCount(raw)).toBe(APP_MIGRATIONS + 1);
    expect(tableNames(raw)).toContain('migration_probe');
    expect(repositories.settings.get().onboardingCompleted).toBe(true);
    expect(repositories.motivation.get()?.text).toBe('Quero ter mais tempo para mim.');

    await runMigrations(db, withTestMigration(bundle) as never);
    expect(appliedCount(raw)).toBe(APP_MIGRATIONS + 1);
  });

  it('banco novo com todas as migrações de uma vez aplica todas, em ordem', async () => {
    const { db, raw } = await createEmptyDatabase();
    await runMigrations(db, withTestMigration(loadMigrationBundle()) as never);
    expect(appliedCount(raw)).toBe(APP_MIGRATIONS + 1);
    expect(columnNames(raw, 'motivation')).toContain('probe');
  });
});

describe('restrições do esquema', () => {
  // Uma compulsão de cada mecânica, para as linhas filhas.
  const seed = [
    "INSERT INTO user_compulsions (id, type, started_at) VALUES (1, 'pornography', 0)",
    "INSERT INTO user_compulsions (id, type, started_at) VALUES (2, 'short_videos', 0)",
  ];

  async function seededDatabase() {
    const { raw } = await createTestDatabase();
    for (const statement of seed) raw.run(statement);
    return raw;
  }

  it.each([
    ["INSERT INTO user_compulsions (type, started_at) VALUES ('gaming', 0)", 'tipo fora da lista'],
    [
      "INSERT INTO user_compulsions (type, status, started_at) VALUES ('short_videos', 'done', 0)",
      'situação fora da lista',
    ],
    ["INSERT INTO triggers (kind, value) VALUES ('place', 'x')", 'gatilho de localização'],
    ["INSERT INTO triggers (kind, value) VALUES ('time', '22:00-22:00')", 'faixa sem duração'],
    ["INSERT INTO triggers (kind, value) VALUES ('time', '24:00-01:00')", 'hora 24'],
    ["INSERT INTO triggers (kind, value) VALUES ('time', '9:00-10:00')", 'faixa fora do formato'],
    ["INSERT INTO triggers (kind, value) VALUES ('weekday', '7')", 'dia da semana 7'],
    ["INSERT INTO triggers (kind, value) VALUES ('emotion', 'anger')", 'emoção fora da lista'],
    ['INSERT INTO settings (id, created_at) VALUES (2, 0)', 'segunda linha de configurações'],
    [
      "INSERT INTO settings (id, created_at, onboarding_step) VALUES (1, 0, 'intro')",
      'etapa do onboarding fora da lista',
    ],
    [
      'INSERT INTO settings (id, created_at, check_in_minutes) VALUES (1, 0, 1440)',
      'horário do check-in fora do dia',
    ],
    [
      "INSERT INTO monitored_apps (compulsion_id, package_name, role) VALUES (999, 'app.test', 'risk')",
      'app de uma compulsão que não existe',
    ],
    [
      "INSERT INTO check_ins (compulsion_id, day_key, answer, answered_at) VALUES (1, '2026-11-02', 'maybe', 0)",
      'resposta de check-in fora da lista',
    ],
    [
      "INSERT INTO check_ins (compulsion_id, day_key, answer, source, answered_at) VALUES (1, '2026-11-02', 'relapse', 'email', 0)",
      'origem de check-in fora da lista',
    ],
    [
      "INSERT INTO check_ins (compulsion_id, day_key, answer, answered_at) VALUES (1, '02/11/2026', 'relapse', 0)",
      'dia fora do formato',
    ],
    [
      "INSERT INTO check_ins (compulsion_id, day_key, answer, answered_at) VALUES (1, '2026-11-02', 'relapse', 0), (1, '2026-11-02', 'no_relapse', 0)",
      'dois check-ins no mesmo dia',
    ],
    [
      "INSERT INTO relapses (compulsion_id, day_key, recorded_at) VALUES (1, '2026-11-02', 0), (1, '2026-11-02', 0)",
      'duas recaídas no mesmo dia',
    ],
    [
      "INSERT INTO relapses (compulsion_id, day_key, recorded_at) VALUES (999, '2026-11-02', 0)",
      'recaída de compulsão que não existe',
    ],
    [
      "INSERT INTO day_states (compulsion_id, day_key, failed, failed_reason) VALUES (2, '2026-11-02', 1, NULL)",
      'dia reprovado sem motivo',
    ],
    [
      "INSERT INTO day_states (compulsion_id, day_key, failed, failed_reason) VALUES (2, '2026-11-02', 0, 'ignored_limit')",
      'motivo em dia não reprovado',
    ],
    [
      "INSERT INTO day_states (compulsion_id, day_key, interruptions) VALUES (2, '2026-11-02', -1)",
      'contagem negativa',
    ],
    [
      "INSERT INTO day_states (compulsion_id, day_key) VALUES (2, '2026-11-02'), (2, '2026-11-02')",
      'dois estados no mesmo dia',
    ],
  ])('o banco recusa %s (%s)', async (statement) => {
    const raw = await seededDatabase();
    expect(() => raw.run(statement)).toThrow();
  });

  it.each([
    ["INSERT INTO triggers (kind, value) VALUES ('time', '23:30-01:00')", 'faixa pela meia-noite'],
    ["INSERT INTO triggers (kind, value) VALUES ('time', '22:00-00:00')", 'faixa até a meia-noite'],
    ["INSERT INTO triggers (kind, value) VALUES ('weekday', '0')", 'domingo'],
    ["INSERT INTO triggers (kind, value) VALUES ('emotion', 'tiredness')", 'emoção da lista'],
    [
      "INSERT INTO day_states (compulsion_id, day_key, failed, failed_reason) VALUES (2, '2026-11-02', 1, 'third_continue')",
      'dia reprovado com motivo',
    ],
  ])('o banco aceita %s (%s)', async (statement) => {
    const raw = await seededDatabase();
    expect(() => raw.run(statement)).not.toThrow();
  });

  it('apagar a compulsão apaga em cascata check-ins, recaídas e estados do dia', async () => {
    const raw = await seededDatabase();
    raw.run(
      "INSERT INTO check_ins (compulsion_id, day_key, answer, answered_at) VALUES (1, '2026-11-02', 'relapse', 0)",
    );
    raw.run(
      "INSERT INTO relapses (compulsion_id, day_key, recorded_at) VALUES (1, '2026-11-02', 0)",
    );
    raw.run("INSERT INTO day_states (compulsion_id, day_key) VALUES (2, '2026-11-02')");
    raw.run('DELETE FROM user_compulsions');
    for (const table of TABLES_002) {
      expect(query(raw, `SELECT count(*) FROM ${table}`)[0]?.[0]).toBe(0);
    }
  });
});

// Migrações rodam numa transação, onde `PRAGMA foreign_keys=OFF` não tem
// efeito. Se uma migração recriar uma tabela-pai (DROP TABLE + CREATE), o DROP
// apaga em cascata as linhas das tabelas filhas. Este teste popula todas as
// tabelas antes de cada migração e confere que nenhuma linha some
// (NOTAS-APP.md, passo 3 da Fase 3).

/**
 * Linhas válidas por tabela, na ordem de inserção (pais antes dos filhos).
 * Toda tabela com chave estrangeira, e todo pai dela, precisa estar aqui: o
 * teste falha se aparecer uma tabela filha nova sem linhas de teste.
 */
const FIXTURE_ROWS: Record<string, readonly string[]> = {
  user_compulsions: [
    "INSERT INTO user_compulsions (id, type, started_at) VALUES (1, 'pornography', 0)",
    "INSERT INTO user_compulsions (id, type, started_at, daily_limit_minutes) VALUES (2, 'short_videos', 0, 60)",
  ],
  monitored_apps: [
    "INSERT INTO monitored_apps (compulsion_id, package_name, role, declared_consumption) VALUES (1, 'com.example.forum', 'risk', 1)",
    "INSERT INTO monitored_apps (compulsion_id, package_name, role) VALUES (2, 'com.example.clips', 'short_video')",
  ],
  triggers: [
    "INSERT INTO triggers (compulsion_id, kind, value) VALUES (1, 'weekday', '6')",
    "INSERT INTO triggers (compulsion_id, kind, value) VALUES (2, 'emotion', 'stress')",
    "INSERT INTO triggers (compulsion_id, kind, value) VALUES (NULL, 'time', '22:00-00:00')",
  ],
  check_ins: [
    "INSERT INTO check_ins (compulsion_id, day_key, answer, answered_at) VALUES (1, '2026-11-01', 'relapse', 0)",
  ],
  relapses: [
    "INSERT INTO relapses (compulsion_id, day_key, recorded_at) VALUES (1, '2026-11-01', 0)",
  ],
  day_states: [
    "INSERT INTO day_states (compulsion_id, day_key, failed, failed_reason) VALUES (2, '2026-11-01', 1, 'ignored_limit')",
  ],
};

const userTables = (raw: Raw) =>
  tableNames(raw).filter(
    (name): name is string =>
      typeof name === 'string' && name !== '__drizzle_migrations' && !name.startsWith('sqlite_'),
  );

const parentTables = (raw: Raw, table: string) =>
  query(raw, `PRAGMA foreign_key_list(${table})`).map((row) => row[2] as string);

const rowCount = (raw: Raw, table: string) =>
  Number(query(raw, `SELECT count(*) FROM ${table}`)[0]?.[0]);

/** Popula as tabelas com pai e os pais delas; devolve a contagem por tabela. */
function populateRelatedTables(raw: Raw): Record<string, number> {
  const tables = userTables(raw);
  const children = tables.filter((table) => parentTables(raw, table).length > 0);
  const related = new Set([...children, ...children.flatMap((table) => parentTables(raw, table))]);
  for (const table of related) {
    if (!FIXTURE_ROWS[table]) {
      throw new Error(`Tabela sem linhas de teste em FIXTURE_ROWS: ${table}`);
    }
  }
  for (const [table, rows] of Object.entries(FIXTURE_ROWS)) {
    if (related.has(table)) for (const row of rows) raw.run(row);
  }
  return Object.fromEntries([...related].map((table) => [table, rowCount(raw, table)]));
}

const countsOf = (raw: Raw, tables: readonly string[]) =>
  Object.fromEntries(tables.map((table) => [table, rowCount(raw, table)]));

/** Aplica as primeiras `stage` migrações, popula, aplica o resto e devolve antes e depois. */
async function migrateWithChildRows(bundle: MigrationBundle, stage: number) {
  const { db, raw } = await createEmptyDatabase();
  await runMigrations(db, firstMigrations(bundle, stage) as never);
  const before = populateRelatedTables(raw);
  await runMigrations(db, bundle as never);
  return { before, after: countsOf(raw, Object.keys(before)) };
}

describe('migrações não apagam linhas de tabelas filhas', () => {
  const tags = loadMigrationBundle().journal.entries.map((entry) => entry.tag);

  // Cada migração depois da primeira, aplicada sobre um banco com todas as
  // tabelas filhas (e os pais) populadas.
  it.each(tags.slice(1).map((tag, index) => [tag, index + 1] as const))(
    '%s preserva todas as linhas',
    async (_tag, stage) => {
      const bundle = firstMigrations(loadMigrationBundle(), stage + 1);
      const { before, after } = await migrateWithChildRows(bundle, stage);
      expect(Object.values(before).every((count) => count > 0)).toBe(true);
      expect(after).toEqual(before);
    },
  );

  it('controle: uma migração que recria user_compulsions apaga os filhos, apesar do PRAGMA', async () => {
    // Recria a tabela-pai como o drizzle-kit faria: cópia, DROP e CREATE.
    const { raw: model } = await createTestDatabase();
    const objectSql = (type: string, name: string) =>
      query(
        model,
        `SELECT sql FROM sqlite_master WHERE type = '${type}' AND name = '${name}'`,
      )[0]![0];
    const recreateParent = [
      'PRAGMA foreign_keys=OFF;',
      'CREATE TABLE `__copy_user_compulsions` AS SELECT * FROM `user_compulsions`;',
      'DROP TABLE `user_compulsions`;',
      `${objectSql('table', 'user_compulsions')};`,
      `${objectSql('index', 'user_compulsions_type_unique')};`,
      'INSERT INTO `user_compulsions` SELECT * FROM `__copy_user_compulsions`;',
      'DROP TABLE `__copy_user_compulsions`;',
      'PRAGMA foreign_keys=ON;',
    ].join('--> statement-breakpoint\n');

    const current = loadMigrationBundle();
    const bundle = withExtraMigration(current, recreateParent);
    const { before, after } = await migrateWithChildRows(bundle, current.journal.entries.length);
    expect(after.user_compulsions).toBe(before.user_compulsions);
    expect(after.monitored_apps).toBe(0);
    expect(after.check_ins).toBe(0);
    expect(after).not.toEqual(before);
  });
});
