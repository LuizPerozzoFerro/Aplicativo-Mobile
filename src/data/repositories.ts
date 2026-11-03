import { and, asc, desc, eq } from 'drizzle-orm';

import {
  getCompulsionDefinition,
  isAppRoleAllowed,
  type CompulsionStatus,
  type CompulsionType,
  type Mechanic,
  type MonitoredAppRole,
  type TriggerKind,
} from '@/domain/compulsion';
import { isValidCheckInMinutes, type CheckInAnswer, type CheckInSource } from '@/domain/checkIn';
import { fromDayKey } from '@/domain/day';
import { isValidDailyLimit, type OnboardingStep } from '@/domain/onboarding';
import type { DayFailureReason } from '@/domain/streak';
import { isValidTriggerValue } from '@/domain/triggers';

import type { AppDatabase } from './database';
import {
  checkIns,
  dayStates,
  monitoredApps,
  motivation,
  relapses,
  settings,
  triggers,
  userCompulsions,
} from './schema';

// Acesso ao banco (spec 01, seção 4.6; spec 02, seção 4.2). A UI nunca escreve
// SQL: tudo passa por estas interfaces. Mensagens de erro e logs daqui não
// citam valores de enum, nomes de apps nem textos do usuário (CLAUDE.md,
// seção 9).

export type Settings = typeof settings.$inferSelect;
export type UserCompulsion = typeof userCompulsions.$inferSelect;
export type MonitoredApp = typeof monitoredApps.$inferSelect;
export type Trigger = typeof triggers.$inferSelect;
export type Motivation = typeof motivation.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
export type Relapse = typeof relapses.$inferSelect;
export type DayState = typeof dayStates.$inferSelect;

export type SettingsRepository = {
  /** Lê as configurações; cria a linha com os valores padrão na primeira vez. */
  get(): Settings;
  setOnboardingCompleted(completed: boolean): void;
  setAgeConfirmedAt(date: Date | null): void;
  /** Etapa em que o onboarding está; null antes de começar e depois de concluído. */
  setOnboardingStep(step: OnboardingStep | null): void;
  setCheckInMinutes(minutes: number): void;
};

export type CompulsionRepository = {
  list(): UserCompulsion[];
  add(input: {
    type: CompulsionType;
    startedAt: Date;
    dailyLimitMinutes?: number | null;
  }): UserCompulsion;
  setStatus(id: number, status: CompulsionStatus): void;
  /** Início da streak: o dia do "Começar" ou o da compulsão adicionada pelo Perfil. */
  setStartedAt(id: number, startedAt: Date): void;
  /** Limite diário da moderação, somado entre os apps. */
  setDailyLimit(id: number, minutes: number): void;
  /** Apaga a compulsão e, em cascata, apps, gatilhos, check-ins, recaídas e dias. */
  remove(id: number): void;
};

export type NewMonitoredApp = {
  packageName: string;
  role: MonitoredAppRole;
  declaredConsumption?: boolean | null;
};

export type MonitoredAppRepository = {
  listByCompulsion(compulsionId: number): MonitoredApp[];
  add(input: NewMonitoredApp & { compulsionId: number }): MonitoredApp;
  /** Troca todos os apps da compulsão de uma vez (onboarding e Perfil). */
  replaceForCompulsion(compulsionId: number, apps: readonly NewMonitoredApp[]): MonitoredApp[];
  remove(id: number): void;
};

export type NewTrigger = { kind: TriggerKind; value: string; compulsionId?: number | null };

export type TriggerRepository = {
  list(): Trigger[];
  add(input: NewTrigger): Trigger;
  /** Troca todos os gatilhos de uma vez (etapa de gatilhos e Perfil). */
  replaceAll(items: readonly NewTrigger[]): Trigger[];
  remove(id: number): void;
};

export type MotivationRepository = {
  get(): Motivation | null;
  /** Guarda o texto, substituindo o anterior. */
  save(text: string): Motivation;
};

/** Um dia de uma compulsão: o par que identifica check-in, recaída e estado do dia. */
export type CompulsionDay = { compulsionId: number; dayKey: string };

export type CheckInRepository = {
  listByCompulsion(compulsionId: number): CheckIn[];
  /**
   * Responde o check-in do dia, substituindo uma resposta anterior. "Recaída"
   * também grava a recaída do dia; "sem recaída" apaga a recaída do dia, se
   * houver. Tudo numa transação.
   */
  answer(input: CompulsionDay & { answer: CheckInAnswer; source?: CheckInSource }): CheckIn;
  /** Desfaz o check-in do dia e a recaída do mesmo dia, se houver. */
  undo(day: CompulsionDay): void;
};

export type RelapseRepository = {
  listByCompulsion(compulsionId: number): Relapse[];
  /** Registra a recaída do dia e grava o check-in desse dia como "recaída", numa transação. */
  record(day: CompulsionDay): Relapse;
  /** Desfaz a recaída do dia e o check-in do mesmo dia. */
  undo(day: CompulsionDay): void;
};

export type DayStateRepository = {
  listByCompulsion(compulsionId: number): DayState[];
  /** Dias reprovados (base da streak da moderação). */
  listFailedDayKeys(compulsionId: number): string[];
  /** Reprova o dia (Fase 4: "Ignorar o limite por hoje" ou terceiro "Continuar"). */
  markFailed(day: CompulsionDay, reason: DayFailureReason): void;
};

export type Repositories = {
  settings: SettingsRepository;
  compulsions: CompulsionRepository;
  monitoredApps: MonitoredAppRepository;
  triggers: TriggerRepository;
  motivation: MotivationRepository;
  checkIns: CheckInRepository;
  relapses: RelapseRepository;
  dayStates: DayStateRepository;
  /** Apaga todos os dados do usuário; as configurações voltam ao padrão. */
  deleteAllData(): void;
};

type Transaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0];
/** O banco ou uma transação aberta nele. */
type Executor = AppDatabase | Transaction;

const SETTINGS_ID = 1;

function required<T>(row: T | undefined, what: string): T {
  if (row === undefined) throw new Error(`Falha ao gravar ${what}`);
  return row;
}

function requireDayKey(dayKey: string): void {
  if (fromDayKey(dayKey) === null) throw new RangeError('Dia inválido');
}

function requireCompulsionType(executor: Executor, compulsionId: number): CompulsionType {
  const row = executor
    .select({ type: userCompulsions.type })
    .from(userCompulsions)
    .where(eq(userCompulsions.id, compulsionId))
    .get();
  if (!row) throw new Error('Compulsão não encontrada');
  return row.type;
}

function requireMechanic(executor: Executor, compulsionId: number, mechanic: Mechanic): void {
  const type = requireCompulsionType(executor, compulsionId);
  if (getCompulsionDefinition(type).mechanic !== mechanic) {
    throw new Error('Registro não se aplica à mecânica desta compulsão');
  }
}

function requireDailyLimit(type: CompulsionType, minutes: number | null): void {
  const moderation = getCompulsionDefinition(type).mechanic === 'moderation';
  if (minutes === null) return;
  if (!moderation) throw new Error('Limite diário só existe na moderação');
  if (!isValidDailyLimit(minutes)) throw new RangeError('Limite diário fora do intervalo aceito');
}

function insertMonitoredApp(
  executor: Executor,
  compulsionId: number,
  { packageName, role, declaredConsumption = null }: NewMonitoredApp,
): MonitoredApp {
  // Pendência herdada da Fase 2: o papel do app tem de valer para a compulsão.
  if (!isAppRoleAllowed(requireCompulsionType(executor, compulsionId), role)) {
    throw new Error('Papel do app não permitido para esta compulsão');
  }
  return required(
    executor
      .insert(monitoredApps)
      .values({
        compulsionId,
        packageName,
        role,
        // Só faz sentido em app de risco (doc 02, seção 5).
        declaredConsumption: role === 'risk' ? declaredConsumption : null,
      })
      .returning()
      .get(),
    'o app monitorado',
  );
}

function insertTrigger(executor: Executor, { kind, value, compulsionId = null }: NewTrigger) {
  if (!isValidTriggerValue(kind, value)) throw new RangeError('Gatilho inválido');
  return required(
    executor.insert(triggers).values({ kind, value, compulsionId }).returning().get(),
    'o gatilho',
  );
}

function sameDay<T extends typeof checkIns | typeof relapses | typeof dayStates>(
  table: T,
  { compulsionId, dayKey }: CompulsionDay,
) {
  return and(eq(table.compulsionId, compulsionId), eq(table.dayKey, dayKey));
}

export function createRepositories(
  db: AppDatabase,
  now: () => Date = () => new Date(),
): Repositories {
  const settingsRepository: SettingsRepository = {
    get() {
      const current = db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).get();
      if (current) return current;
      db.insert(settings).values({ id: SETTINGS_ID, createdAt: now() }).onConflictDoNothing().run();
      return required(
        db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).get(),
        'as configurações',
      );
    },
    setOnboardingCompleted(completed) {
      settingsRepository.get();
      db.update(settings)
        .set({ onboardingCompleted: completed })
        .where(eq(settings.id, SETTINGS_ID))
        .run();
    },
    setAgeConfirmedAt(date) {
      settingsRepository.get();
      db.update(settings).set({ ageConfirmedAt: date }).where(eq(settings.id, SETTINGS_ID)).run();
    },
    setOnboardingStep(step) {
      settingsRepository.get();
      db.update(settings).set({ onboardingStep: step }).where(eq(settings.id, SETTINGS_ID)).run();
    },
    setCheckInMinutes(minutes) {
      if (!isValidCheckInMinutes(minutes)) throw new RangeError('Horário do check-in inválido');
      settingsRepository.get();
      db.update(settings)
        .set({ checkInMinutes: minutes })
        .where(eq(settings.id, SETTINGS_ID))
        .run();
    },
  };

  /** Apaga o check-in e a recaída de um dia. */
  function clearAbstinenceDay(executor: Executor, day: CompulsionDay) {
    executor.delete(checkIns).where(sameDay(checkIns, day)).run();
    executor.delete(relapses).where(sameDay(relapses, day)).run();
  }

  function upsertCheckIn(
    executor: Executor,
    day: CompulsionDay,
    answer: CheckInAnswer,
    source: CheckInSource,
  ): CheckIn {
    const values = { answer, source, answeredAt: now() };
    return required(
      executor
        .insert(checkIns)
        .values({ ...day, ...values })
        .onConflictDoUpdate({ target: [checkIns.compulsionId, checkIns.dayKey], set: values })
        .returning()
        .get(),
      'o check-in',
    );
  }

  function upsertRelapse(executor: Executor, day: CompulsionDay): Relapse {
    return required(
      executor
        .insert(relapses)
        .values({ ...day, recordedAt: now() })
        .onConflictDoUpdate({
          target: [relapses.compulsionId, relapses.dayKey],
          set: { recordedAt: now() },
        })
        .returning()
        .get(),
      'a recaída',
    );
  }

  function requireAbstinenceDay(executor: Executor, day: CompulsionDay) {
    requireDayKey(day.dayKey);
    requireMechanic(executor, day.compulsionId, 'abstinence');
  }

  return {
    settings: settingsRepository,

    compulsions: {
      list: () => db.select().from(userCompulsions).orderBy(asc(userCompulsions.id)).all(),
      add: ({ type, startedAt, dailyLimitMinutes = null }) => {
        requireDailyLimit(type, dailyLimitMinutes);
        return required(
          db
            .insert(userCompulsions)
            .values({ type, startedAt, dailyLimitMinutes })
            .returning()
            .get(),
          'a compulsão',
        );
      },
      setStatus: (id, status) => {
        db.update(userCompulsions).set({ status }).where(eq(userCompulsions.id, id)).run();
      },
      setStartedAt: (id, startedAt) => {
        db.update(userCompulsions).set({ startedAt }).where(eq(userCompulsions.id, id)).run();
      },
      setDailyLimit: (id, minutes) => {
        requireDailyLimit(requireCompulsionType(db, id), minutes);
        db.update(userCompulsions)
          .set({ dailyLimitMinutes: minutes })
          .where(eq(userCompulsions.id, id))
          .run();
      },
      remove: (id) => {
        db.delete(userCompulsions).where(eq(userCompulsions.id, id)).run();
      },
    },

    monitoredApps: {
      listByCompulsion: (compulsionId) =>
        db
          .select()
          .from(monitoredApps)
          .where(eq(monitoredApps.compulsionId, compulsionId))
          .orderBy(asc(monitoredApps.id))
          .all(),
      add: ({ compulsionId, ...app }) => insertMonitoredApp(db, compulsionId, app),
      replaceForCompulsion: (compulsionId, apps) =>
        db.transaction((tx) => {
          tx.delete(monitoredApps).where(eq(monitoredApps.compulsionId, compulsionId)).run();
          return apps.map((app) => insertMonitoredApp(tx, compulsionId, app));
        }),
      remove: (id) => {
        db.delete(monitoredApps).where(eq(monitoredApps.id, id)).run();
      },
    },

    triggers: {
      list: () => db.select().from(triggers).orderBy(asc(triggers.id)).all(),
      add: (input) => insertTrigger(db, input),
      replaceAll: (items) =>
        db.transaction((tx) => {
          tx.delete(triggers).run();
          return items.map((item) => insertTrigger(tx, item));
        }),
      remove: (id) => {
        db.delete(triggers).where(eq(triggers.id, id)).run();
      },
    },

    motivation: {
      get: () => db.select().from(motivation).orderBy(desc(motivation.id)).get() ?? null,
      save: (text) =>
        db.transaction((tx) => {
          tx.delete(motivation).run();
          return required(
            tx.insert(motivation).values({ text, updatedAt: now() }).returning().get(),
            'a motivação',
          );
        }),
    },

    checkIns: {
      listByCompulsion: (compulsionId) =>
        db
          .select()
          .from(checkIns)
          .where(eq(checkIns.compulsionId, compulsionId))
          .orderBy(asc(checkIns.dayKey))
          .all(),
      answer: ({ answer, source = 'app', ...day }) =>
        db.transaction((tx) => {
          requireAbstinenceDay(tx, day);
          if (answer === 'relapse') upsertRelapse(tx, day);
          else tx.delete(relapses).where(sameDay(relapses, day)).run();
          return upsertCheckIn(tx, day, answer, source);
        }),
      undo: (day) => db.transaction((tx) => clearAbstinenceDay(tx, day)),
    },

    relapses: {
      listByCompulsion: (compulsionId) =>
        db
          .select()
          .from(relapses)
          .where(eq(relapses.compulsionId, compulsionId))
          .orderBy(asc(relapses.dayKey))
          .all(),
      record: (day) =>
        db.transaction((tx) => {
          requireAbstinenceDay(tx, day);
          upsertCheckIn(tx, day, 'relapse', 'app');
          return upsertRelapse(tx, day);
        }),
      undo: (day) => db.transaction((tx) => clearAbstinenceDay(tx, day)),
    },

    dayStates: {
      listByCompulsion: (compulsionId) =>
        db
          .select()
          .from(dayStates)
          .where(eq(dayStates.compulsionId, compulsionId))
          .orderBy(asc(dayStates.dayKey))
          .all(),
      listFailedDayKeys: (compulsionId) =>
        db
          .select({ dayKey: dayStates.dayKey })
          .from(dayStates)
          .where(and(eq(dayStates.compulsionId, compulsionId), eq(dayStates.failed, true)))
          .orderBy(asc(dayStates.dayKey))
          .all()
          .map((row) => row.dayKey),
      markFailed: (day, reason) => {
        db.transaction((tx) => {
          requireDayKey(day.dayKey);
          requireMechanic(tx, day.compulsionId, 'moderation');
          const values = { failed: true, failedReason: reason };
          tx.insert(dayStates)
            .values({ ...day, ...values })
            .onConflictDoUpdate({ target: [dayStates.compulsionId, dayStates.dayKey], set: values })
            .run();
        });
      },
    },

    deleteAllData() {
      db.transaction((tx) => {
        // Filhos antes dos pais; a cascata cobriria, mas a ordem explícita não
        // depende do PRAGMA foreign_keys.
        tx.delete(checkIns).run();
        tx.delete(relapses).run();
        tx.delete(dayStates).run();
        tx.delete(monitoredApps).run();
        tx.delete(triggers).run();
        tx.delete(userCompulsions).run();
        tx.delete(motivation).run();
        tx.delete(settings).run();
      });
    },
  };
}
