import { sql, type SQL } from 'drizzle-orm';
import {
  check,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

import {
  COMPULSION_STATUSES,
  COMPULSION_TYPES,
  DEFAULT_PROACTIVE_NOTIFICATION_DAILY_LIMIT,
  MONITORED_APP_ROLES,
  TRIGGER_KINDS,
} from '@/domain/compulsion';

// Esquema local (spec 01, seção 4.6; doc 02, seção 5). Colunas em inglês e
// snake_case; datas em milissegundos (timestamp_ms). Uma mudança aqui só vale
// depois de `npm run db:generate`, que cria a próxima migração em drizzle/.

/** CHECK de enum: o banco também recusa valores fora da lista, não só o TypeScript. */
function oneOf(column: AnySQLiteColumn, values: readonly string[]): SQL {
  return sql`${column} in (${sql.raw(values.map((value) => `'${value}'`).join(', '))})`;
}

/** Configurações do app: uma linha só (id = 1). Entidade Configuracoes. */
export const settings = sqliteTable(
  'settings',
  {
    id: integer('id').primaryKey(),
    onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' })
      .notNull()
      .default(false),
    /** Nulo até a confirmação de idade no onboarding (Fase 3). */
    ageConfirmedAt: integer('age_confirmed_at', { mode: 'timestamp_ms' }),
    proactiveNotificationDailyLimit: integer('proactive_notification_daily_limit')
      .notNull()
      .default(DEFAULT_PROACTIVE_NOTIFICATION_DAILY_LIMIT),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [check('settings_single_row', sql`${table.id} = 1`)],
);

/** Compulsões escolhidas pelo usuário. Entidade CompulsaoUsuario. */
export const userCompulsions = sqliteTable(
  'user_compulsions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type', { enum: COMPULSION_TYPES }).notNull(),
    status: text('status', { enum: COMPULSION_STATUSES }).notNull().default('active'),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    /** Nulo na mecânica de abstinência. */
    dailyLimitMinutes: integer('daily_limit_minutes'),
  },
  (table) => [
    uniqueIndex('user_compulsions_type_unique').on(table.type),
    check('user_compulsions_type_valid', oneOf(table.type, COMPULSION_TYPES)),
    check('user_compulsions_status_valid', oneOf(table.status, COMPULSION_STATUSES)),
  ],
);

/** Apps monitorados por compulsão. Entidade AppMonitorado. */
export const monitoredApps = sqliteTable(
  'monitored_apps',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    compulsionId: integer('compulsion_id')
      .notNull()
      .references(() => userCompulsions.id, { onDelete: 'cascade' }),
    packageName: text('package_name').notNull(),
    role: text('role', { enum: MONITORED_APP_ROLES }).notNull(),
    /** Só em app de risco: o usuário declarou consumir o conteúdo nele. */
    declaredConsumption: integer('declared_consumption', { mode: 'boolean' }),
  },
  (table) => [
    uniqueIndex('monitored_apps_compulsion_package_unique').on(
      table.compulsionId,
      table.packageName,
    ),
    check('monitored_apps_role_valid', oneOf(table.role, MONITORED_APP_ROLES)),
  ],
);

/** Gatilhos de risco. Entidade Gatilho. */
export const triggers = sqliteTable(
  'triggers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Nulo = vale para todas as compulsões. */
    compulsionId: integer('compulsion_id').references(() => userCompulsions.id, {
      onDelete: 'cascade',
    }),
    kind: text('kind', { enum: TRIGGER_KINDS }).notNull(),
    value: text('value').notNull(),
  },
  (table) => [check('triggers_kind_valid', oneOf(table.kind, TRIGGER_KINDS))],
);

/** Motivação pessoal escrita pelo usuário. Entidade Motivacao. */
export const motivation = sqliteTable('motivation', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});
