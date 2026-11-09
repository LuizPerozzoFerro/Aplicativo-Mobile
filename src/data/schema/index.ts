import { sql, type SQL } from 'drizzle-orm';
import {
  check,
  integer,
  primaryKey,
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
import { CHECK_IN_ANSWERS, CHECK_IN_SOURCES, DEFAULT_CHECK_IN_MINUTES } from '@/domain/checkIn';
import { EMERGENCY_OUTCOMES, EMERGENCY_SOURCES, INTERRUPTION_RESPONSES } from '@/domain/monitoring';
import { ONBOARDING_STEPS } from '@/domain/onboarding';
import { DAY_FAILURE_REASONS } from '@/domain/streak';
import { EMOTIONS, WEEKDAYS } from '@/domain/triggers';

// Esquema local (spec 01, seção 4.6; doc 02, seção 5). Colunas em inglês e
// snake_case; datas em milissegundos (timestamp_ms). Uma mudança aqui só vale
// depois de `npm run db:generate`, que cria a próxima migração em drizzle/.

/** CHECK de enum: o banco também recusa valores fora da lista, não só o TypeScript. */
function oneOf(column: AnySQLiteColumn, values: readonly string[]): SQL {
  return sql`${column} in (${sql.raw(values.map((value) => `'${value}'`).join(', '))})`;
}

// Da migração 002 em diante, os CHECKs citam a coluna sem o nome da tabela.
// Com `${table.coluna}` o Drizzle escreve "tabela"."coluna", e quando o
// drizzle-kit recria uma tabela (CREATE TABLE `__new_tabela` ...) esse nome
// não existe dentro da tabela nova. Os CHECKs da 001 em tabelas que não mudam
// ficam como estão: mudar o texto deles faria o drizzle-kit recriar essas
// tabelas, e recriar `user_compulsions` apagaria em cascata os filhos.

/** Coluna sem o nome da tabela, para CHECK. */
function column(name: string): SQL {
  return sql.raw(`\`${name}\``);
}

/** Lista SQL de textos: ('a', 'b'). */
function textList(values: readonly (string | number)[]): SQL {
  return sql.raw(`(${values.map((value) => `'${value}'`).join(', ')})`);
}

/** Chave de dia AAAA-MM-DD; a data em si é validada no domínio (fromDayKey). */
function isDayKey(name: string): SQL {
  return sql`${column(name)} glob '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'`;
}

/** `HH:MM-HH:MM` com horas de 00 a 23 e início diferente do fim (timeRange.ts). */
function isTimeRange(name: string): SQL {
  const value = column(name);
  return sql`(${value} glob '[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]' and substr(${value}, 1, 2) <= '23' and substr(${value}, 7, 2) <= '23' and substr(${value}, 1, 5) <> substr(${value}, 7, 5))`;
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
    /** Etapa em que o onboarding parou; nula antes de começar e depois de concluído. */
    onboardingStep: text('onboarding_step', { enum: ONBOARDING_STEPS }),
    /** Horário do check-in em minutos desde a meia-noite (padrão 21h). */
    checkInMinutes: integer('check_in_minutes').notNull().default(DEFAULT_CHECK_IN_MINUTES),
    /** Já esteve concedida alguma vez: separa permissão perdida de nunca concedida. */
    usageAccessGrantedOnce: integer('usage_access_granted_once', { mode: 'boolean' })
      .notNull()
      .default(false),
    notificationsGrantedOnce: integer('notifications_granted_once', { mode: 'boolean' })
      .notNull()
      .default(false),
    overlayGrantedOnce: integer('overlay_granted_once', { mode: 'boolean' })
      .notNull()
      .default(false),
    /** Quando o aviso "Ative o acompanhamento" do Início foi adiado pela última vez. */
    protectionNoticeDismissedAt: integer('protection_notice_dismissed_at', {
      mode: 'timestamp_ms',
    }),
  },
  () => [
    // A tabela é recriada na 002: o CHECK da 001 passa a citar a coluna sem a tabela.
    check('settings_single_row', sql`${column('id')} = 1`),
    check(
      'settings_onboarding_step_valid',
      sql`${column('onboarding_step')} is null or ${column('onboarding_step')} in ${textList(ONBOARDING_STEPS)}`,
    ),
    check('settings_check_in_minutes_valid', sql`${column('check_in_minutes')} between 0 and 1439`),
  ],
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
    /**
     * Abstinência: dias sem recair informados no onboarding ("há N dias"; 0 =
     * começando hoje). O início da streak sai dele no "Começar" (spec 02 v0.2,
     * 4.3). Nulo até a etapa de configuração e na moderação. Sem CHECK: um
     * CHECK novo obrigaria a recriar esta tabela-pai (NOTAS-APP.md, passo 3);
     * a validação fica no domínio e no repositório.
     */
    initialStreakDays: integer('initial_streak_days'),
    /**
     * Aumento do limite pelo Perfil: só vale no dia seguinte (src/domain/dailyLimit.ts).
     * Nulos sem aumento pendente. Sem CHECK, pelo mesmo motivo do campo acima.
     */
    previousDailyLimitMinutes: integer('previous_daily_limit_minutes'),
    dailyLimitRaisedOn: text('daily_limit_raised_on'),
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
    /** Formato por `kind` em src/domain/triggers.ts. */
    value: text('value').notNull(),
  },
  () => [
    // A tabela é recriada na 002: o CHECK da 001 passa a citar a coluna sem a tabela.
    check('triggers_kind_valid', sql`${column('kind')} in ${textList(TRIGGER_KINDS)}`),
    check(
      'triggers_value_valid',
      sql`case ${column('kind')} when 'time' then ${isTimeRange('value')} when 'weekday' then ${column('value')} in ${textList(WEEKDAYS)} when 'emotion' then ${column('value')} in ${textList(EMOTIONS)} else 0 end`,
    ),
  ],
);

/** Motivação pessoal escrita pelo usuário. Entidade Motivacao. */
export const motivation = sqliteTable('motivation', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

/**
 * Check-in diário da abstinência (spec 02, seção 4.2). Um por compulsão e
 * dia: responder de novo no mesmo dia substitui. Entidade CheckIn.
 */
export const checkIns = sqliteTable(
  'check_ins',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    compulsionId: integer('compulsion_id')
      .notNull()
      .references(() => userCompulsions.id, { onDelete: 'cascade' }),
    /** AAAA-MM-DD, de `toDayKey`. */
    dayKey: text('day_key').notNull(),
    answer: text('answer', { enum: CHECK_IN_ANSWERS }).notNull(),
    source: text('source', { enum: CHECK_IN_SOURCES }).notNull().default('app'),
    answeredAt: integer('answered_at', { mode: 'timestamp_ms' }).notNull(),
    /**
     * Resposta que uma recaída registrada depois substituiu (ex.: "sem
     * recaída" de ontem), para o "Desfazer" restaurar. As três são nulas ou
     * preenchidas juntas. Sem CHECK: só `ALTER TABLE ADD` (NOTAS-APP.md,
     * passo 5); a validação fica no repositório.
     */
    previousAnswer: text('previous_answer', { enum: CHECK_IN_ANSWERS }),
    previousSource: text('previous_source', { enum: CHECK_IN_SOURCES }),
    previousAnsweredAt: integer('previous_answered_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('check_ins_compulsion_day_unique').on(table.compulsionId, table.dayKey),
    check('check_ins_day_key_valid', isDayKey('day_key')),
    check('check_ins_answer_valid', sql`${column('answer')} in ${textList(CHECK_IN_ANSWERS)}`),
    check('check_ins_source_valid', sql`${column('source')} in ${textList(CHECK_IN_SOURCES)}`),
  ],
);

/** Recaídas informadas pelo usuário, uma por compulsão e dia. Entidade Recaida. */
export const relapses = sqliteTable(
  'relapses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    compulsionId: integer('compulsion_id')
      .notNull()
      .references(() => userCompulsions.id, { onDelete: 'cascade' }),
    /** Dia da recaída (hoje ou ontem), AAAA-MM-DD. */
    dayKey: text('day_key').notNull(),
    /** Quando foi registrada: decide se ainda pode ser desfeita. */
    recordedAt: integer('recorded_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('relapses_compulsion_day_unique').on(table.compulsionId, table.dayKey),
    check('relapses_day_key_valid', isDayKey('day_key')),
  ],
);

/**
 * Estado do dia na moderação: interrupções, "Continuar mesmo assim" e
 * reprovação (doc 01, 6.5.4). Base para a Fase 4. Entidade EstadoDoDia.
 */
export const dayStates = sqliteTable(
  'day_states',
  {
    compulsionId: integer('compulsion_id')
      .notNull()
      .references(() => userCompulsions.id, { onDelete: 'cascade' }),
    dayKey: text('day_key').notNull(),
    interruptions: integer('interruptions').notNull().default(0),
    continues: integer('continues').notNull().default(0),
    failed: integer('failed', { mode: 'boolean' }).notNull().default(false),
    /** Preenchido só em dia reprovado. */
    failedReason: text('failed_reason', { enum: DAY_FAILURE_REASONS }),
  },
  (table) => [
    primaryKey({ columns: [table.compulsionId, table.dayKey] }),
    check('day_states_day_key_valid', isDayKey('day_key')),
    check(
      'day_states_counts_valid',
      sql`${column('interruptions')} >= 0 and ${column('continues')} >= 0`,
    ),
    // 'is not null' explícito: NULL in (...) dá NULL, e o SQLite aceita CHECK que dá NULL.
    check(
      'day_states_failed_reason_valid',
      sql`(${column('failed')} = 0 and ${column('failed_reason')} is null) or (${column('failed')} = 1 and ${column('failed_reason')} is not null and ${column('failed_reason')} in ${textList(DAY_FAILURE_REASONS)})`,
    ),
  ],
);

// Migração 005 (spec 03, seção 5.6): só tabelas novas, sem recriar tabela-pai.

/**
 * Telas de interrupção que de fato apareceram (I-28), importadas dos eventos
 * do nativo. Base das estatísticas da Fase 5. O pacote do app fica só no
 * aparelho (CLAUDE.md, seção 9).
 */
export const interruptionEvents = sqliteTable(
  'interruption_events',
  {
    /** O identificador do evento nativo `interruption_shown`. */
    id: text('id').primaryKey(),
    compulsionId: integer('compulsion_id')
      .notNull()
      .references(() => userCompulsions.id, { onDelete: 'cascade' }),
    dayKey: text('day_key').notNull(),
    shownAt: integer('shown_at', { mode: 'timestamp_ms' }).notNull(),
    /** Nulo se a tela foi fechada de outro jeito (ex.: chamada recebida). */
    response: text('response', { enum: INTERRUPTION_RESPONSES }),
    respondedAt: integer('responded_at', { mode: 'timestamp_ms' }),
    appPackage: text('app_package').notNull(),
  },
  () => [
    check('interruption_events_day_key_valid', isDayKey('day_key')),
    check(
      'interruption_events_response_valid',
      sql`${column('response')} is null or ${column('response')} in ${textList(INTERRUPTION_RESPONSES)}`,
    ),
    check(
      'interruption_events_responded_together',
      sql`(${column('response')} is null) = (${column('responded_at')} is null)`,
    ),
  ],
);

/** Sessões do botão de emergência (spec 03, 5.5). Sem texto digitado. */
export const emergencySessions = sqliteTable(
  'emergency_sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    /** Nulos enquanto a sessão está aberta. */
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    source: text('source', { enum: EMERGENCY_SOURCES }).notNull(),
    outcome: text('outcome', { enum: EMERGENCY_OUTCOMES }),
  },
  () => [
    check(
      'emergency_sessions_source_valid',
      sql`${column('source')} in ${textList(EMERGENCY_SOURCES)}`,
    ),
    check(
      'emergency_sessions_outcome_valid',
      sql`${column('outcome')} is null or ${column('outcome')} in ${textList(EMERGENCY_OUTCOMES)}`,
    ),
    check(
      'emergency_sessions_ended_together',
      sql`(${column('outcome')} is null) = (${column('ended_at')} is null)`,
    ),
  ],
);

/**
 * Eventos do nativo já importados (spec 03, 4.3): importar duas vezes não
 * duplica, mesmo que o nativo não chegue a apagá-los.
 */
export const importedEvents = sqliteTable('imported_events', {
  eventId: text('event_id').primaryKey(),
  importedAt: integer('imported_at', { mode: 'timestamp_ms' }).notNull(),
});
