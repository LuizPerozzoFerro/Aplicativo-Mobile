import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

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
import { applyDailyLimitChange } from '@/domain/dailyLimit';
import { fromDayKey, toDayKey } from '@/domain/day';
import type { EmergencyOutcome, EmergencySource } from '@/domain/monitoring';
import { isValidDailyLimit, type OnboardingStep } from '@/domain/onboarding';
import type { ProtectionPermission } from '@/domain/protection';
import { isValidDaysAlreadyWithoutRelapse, type DayFailureReason } from '@/domain/streak';
import { isValidTriggerValue } from '@/domain/triggers';
import type { MonitoringEvent } from '@/monitoring/types';

import type { AppDatabase } from './database';
import {
  checkIns,
  dayStates,
  emergencySessions,
  importedEvents,
  interruptionEvents,
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
export type InterruptionEvent = typeof interruptionEvents.$inferSelect;
export type EmergencySession = typeof emergencySessions.$inferSelect;

const GRANTED_ONCE_COLUMN = {
  usageAccess: 'usageAccessGrantedOnce',
  notifications: 'notificationsGrantedOnce',
  overlay: 'overlayGrantedOnce',
} as const satisfies Record<ProtectionPermission, keyof Settings>;

export type SettingsRepository = {
  /** Lê as configurações; cria a linha com os valores padrão na primeira vez. */
  get(): Settings;
  setOnboardingCompleted(completed: boolean): void;
  setAgeConfirmedAt(date: Date | null): void;
  /** Etapa em que o onboarding está; null antes de começar e depois de concluído. */
  setOnboardingStep(step: OnboardingStep | null): void;
  setCheckInMinutes(minutes: number): void;
  /** Registra para sempre que estas permissões já estiveram concedidas. */
  markPermissionsGranted(permissions: readonly ProtectionPermission[]): void;
  setProtectionNoticeDismissedAt(date: Date | null): void;
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
  /** Mudança pelo Perfil: aumentar só vale no dia seguinte; diminuir vale na hora. */
  changeDailyLimit(id: number, minutes: number): void;
  /** Abstinência: dias sem recair informados no onboarding (0 = começando hoje). */
  setInitialStreakDays(id: number, days: number): void;
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
   * também grava a recaída do dia e guarda a resposta substituída, para o
   * "Desfazer"; "sem recaída" apaga a recaída do dia, se houver. Tudo numa
   * transação.
   */
  answer(input: CompulsionDay & { answer: CheckInAnswer; source?: CheckInSource }): CheckIn;
  /**
   * Desfaz o dia: apaga a recaída e volta o check-in à resposta que a recaída
   * substituiu, ou o apaga se não havia nenhuma.
   */
  undo(day: CompulsionDay): void;
};

export type RelapseRepository = {
  listByCompulsion(compulsionId: number): Relapse[];
  /**
   * Registra a recaída do dia e grava o check-in desse dia como "recaída",
   * guardando a resposta que já existia (ex.: "sem recaída"), numa transação.
   */
  record(day: CompulsionDay): Relapse;
  /** Igual a `checkIns.undo`: apaga a recaída e restaura a resposta anterior, se houver. */
  undo(day: CompulsionDay): void;
};

export type DayStateRepository = {
  listByCompulsion(compulsionId: number): DayState[];
  /** Dias reprovados (base da streak da moderação). */
  listFailedDayKeys(compulsionId: number): string[];
  /** Reprova o dia (Fase 4: "Ignorar o limite por hoje" ou terceiro "Continuar"). */
  markFailed(day: CompulsionDay, reason: DayFailureReason): void;
  /** Só para as ferramentas de teste: apaga as contagens, reprovações e telas do dia. */
  clearDay(dayKey: string): void;
};

export type MonitoringEventRepository = {
  /**
   * Importa os eventos do nativo (spec 03, 4.3), cada um na sua transação e
   * uma vez só: um evento já importado é pulado. Devolve os ids que o nativo
   * já pode apagar, que são todos os recebidos, inclusive os que não se
   * aplicam mais (compulsão apagada) e os que falharam (`failed`), para não
   * travarem a fila.
   */
  importEvents(events: readonly MonitoringEvent[]): { handledIds: string[]; failed: number };
  listInterruptions(compulsionId: number): InterruptionEvent[];
};

export type EmergencySessionRepository = {
  /** Abre uma sessão. Uma que tenha ficado aberta antes é encerrada como abandonada. */
  start(source: EmergencySource): EmergencySession;
  /** Encerra a sessão, uma vez só: uma sessão já encerrada não muda. */
  finish(id: number, outcome: EmergencyOutcome): void;
  /**
   * Encerra como abandonadas as que ficaram abertas (o processo morreu no meio
   * do fluxo). Roda na abertura do app, quando nenhuma tela tem sessão em curso.
   */
  abandonOpen(): void;
  list(): EmergencySession[];
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
  monitoringEvents: MonitoringEventRepository;
  emergencySessions: EmergencySessionRepository;
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

const NO_PREVIOUS_RESPONSE = {
  previousAnswer: null,
  previousSource: null,
  previousAnsweredAt: null,
} as const;

/** Resposta guardada num check-in de recaída, ou null. As três colunas andam juntas. */
function previousResponse(
  checkIn: CheckIn,
): { answer: CheckInAnswer; source: CheckInSource; answeredAt: Date } | null {
  const { previousAnswer, previousSource, previousAnsweredAt } = checkIn;
  if (previousAnswer === null && previousSource === null && previousAnsweredAt === null) {
    return null;
  }
  if (previousAnswer === null || previousSource === null || previousAnsweredAt === null) {
    throw new Error('Resposta anterior do check-in incompleta');
  }
  return { answer: previousAnswer, source: previousSource, answeredAt: previousAnsweredAt };
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
    markPermissionsGranted(permissions) {
      settingsRepository.get();
      db.update(settings)
        .set(Object.fromEntries(permissions.map((name) => [GRANTED_ONCE_COLUMN[name], true])))
        .where(eq(settings.id, SETTINGS_ID))
        .run();
    },
    setProtectionNoticeDismissedAt(date) {
      settingsRepository.get();
      db.update(settings)
        .set({ protectionNoticeDismissedAt: date })
        .where(eq(settings.id, SETTINGS_ID))
        .run();
    },
  };

  /**
   * Desfaz o dia: apaga a recaída e, se o check-in guardou a resposta que a
   * recaída substituiu, restaura essa resposta; senão, apaga o check-in.
   */
  function clearAbstinenceDay(executor: Executor, day: CompulsionDay) {
    const checkIn = executor.select().from(checkIns).where(sameDay(checkIns, day)).get();
    const previous = checkIn ? previousResponse(checkIn) : null;
    executor.delete(relapses).where(sameDay(relapses, day)).run();
    if (previous) {
      executor
        .update(checkIns)
        .set({ ...previous, ...NO_PREVIOUS_RESPONSE })
        .where(sameDay(checkIns, day))
        .run();
    } else {
      executor.delete(checkIns).where(sameDay(checkIns, day)).run();
    }
  }

  function upsertCheckIn(
    executor: Executor,
    day: CompulsionDay,
    answer: CheckInAnswer,
    source: CheckInSource,
    answeredAt: Date = now(),
  ): CheckIn {
    const existing = executor.select().from(checkIns).where(sameDay(checkIns, day)).get();
    // Uma recaída sobre outra resposta guarda essa resposta para o "Desfazer"
    // restaurar; sobre outra recaída, mantém o que já estava guardado.
    let previous: Pick<CheckIn, 'previousAnswer' | 'previousSource' | 'previousAnsweredAt'> =
      NO_PREVIOUS_RESPONSE;
    if (answer === 'relapse' && existing) {
      const kept = existing.answer === 'relapse' ? previousResponse(existing) : existing;
      if (kept) {
        previous = {
          previousAnswer: kept.answer,
          previousSource: kept.source,
          previousAnsweredAt: kept.answeredAt,
        };
      }
    }
    const values = { answer, source, answeredAt, ...previous };
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

  function upsertRelapse(
    executor: Executor,
    day: CompulsionDay,
    recordedAt: Date = now(),
  ): Relapse {
    return required(
      executor
        .insert(relapses)
        .values({ ...day, recordedAt })
        .onConflictDoUpdate({
          target: [relapses.compulsionId, relapses.dayKey],
          set: { recordedAt },
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

  function answerCheckIn(
    executor: Executor,
    day: CompulsionDay,
    answer: CheckInAnswer,
    source: CheckInSource,
    at: Date = now(),
  ): CheckIn {
    requireAbstinenceDay(executor, day);
    if (answer === 'relapse') upsertRelapse(executor, day, at);
    else executor.delete(relapses).where(sameDay(relapses, day)).run();
    return upsertCheckIn(executor, day, answer, source, at);
  }

  function markDayFailed(executor: Executor, day: CompulsionDay, reason: DayFailureReason) {
    requireDayKey(day.dayKey);
    requireMechanic(executor, day.compulsionId, 'moderation');
    const values = { failed: true, failedReason: reason };
    executor
      .insert(dayStates)
      .values({ ...day, ...values })
      .onConflictDoUpdate({ target: [dayStates.compulsionId, dayStates.dayKey], set: values })
      .run();
  }

  /** Soma às contagens do dia (spec 03, 5.2: por compulsão, nas duas mecânicas). */
  function addToDayCounts(
    executor: Executor,
    day: CompulsionDay,
    counts: { interruptions?: number; continues?: number },
  ) {
    requireDayKey(day.dayKey);
    const interruptions = counts.interruptions ?? 0;
    const continues = counts.continues ?? 0;
    executor
      .insert(dayStates)
      .values({ ...day, interruptions, continues })
      .onConflictDoUpdate({
        target: [dayStates.compulsionId, dayStates.dayKey],
        set: {
          interruptions: sql`${dayStates.interruptions} + ${interruptions}`,
          continues: sql`${dayStates.continues} + ${continues}`,
        },
      })
      .run();
  }

  function compulsionExists(executor: Executor, compulsionId: number): boolean {
    const row = executor
      .select({ id: userCompulsions.id })
      .from(userCompulsions)
      .where(eq(userCompulsions.id, compulsionId))
      .get();
    return row !== undefined;
  }

  /** Aplica um evento ao banco. Eventos de uma compulsão que não existe mais não fazem nada. */
  function applyEvent(executor: Executor, event: MonitoringEvent) {
    const at = new Date(event.at);
    switch (event.type) {
      case 'check_in_answered': {
        if (!compulsionExists(executor, event.compulsionId)) return;
        // Pela notificação, como pelo app: "Tive uma recaída" grava a recaída
        // e o check-in do dia (spec 03, 4.3).
        const day = { compulsionId: event.compulsionId, dayKey: event.dayKey };
        answerCheckIn(executor, day, event.answer, 'notification', at);
        return;
      }
      case 'day_failed': {
        if (!compulsionExists(executor, event.compulsionId)) return;
        const day = { compulsionId: event.compulsionId, dayKey: event.dayKey };
        markDayFailed(executor, day, event.reason);
        return;
      }
      case 'interruption_shown': {
        if (!compulsionExists(executor, event.compulsionId)) return;
        const day = { compulsionId: event.compulsionId, dayKey: event.dayKey };
        executor
          .insert(interruptionEvents)
          .values({ id: event.id, ...day, shownAt: at, appPackage: event.targetId })
          .run();
        addToDayCounts(executor, day, { interruptions: 1 });
        return;
      }
      case 'interruption_response': {
        // Só a primeira resposta vale, e só de uma tela já importada.
        const shown = executor
          .select()
          .from(interruptionEvents)
          .where(
            and(
              eq(interruptionEvents.id, event.interruptionId),
              isNull(interruptionEvents.response),
            ),
          )
          .get();
        if (!shown) return;
        executor
          .update(interruptionEvents)
          .set({ response: event.response, respondedAt: at })
          .where(eq(interruptionEvents.id, shown.id))
          .run();
        if (event.response === 'continue') {
          const day = { compulsionId: shown.compulsionId, dayKey: shown.dayKey };
          addToDayCounts(executor, day, { continues: 1 });
        }
        return;
      }
      // Sem tabela própria: ficam só como importados. A sessão de emergência é
      // criada pela tela, com a origem vinda do endereço; limites, notificações,
      // permissões e o serviço servem à tela de estado e às ferramentas de teste.
      case 'service_started':
      case 'limit_reached':
      case 'notification_sent':
      case 'emergency_requested':
      case 'permission_lost':
        return;
    }
  }

  function abandonOpenEmergencySessions(executor: Executor) {
    executor
      .update(emergencySessions)
      .set({ endedAt: now(), outcome: 'abandoned' })
      .where(isNull(emergencySessions.endedAt))
      .run();
  }

  function isImported(executor: Executor, eventId: string): boolean {
    const row = executor
      .select({ eventId: importedEvents.eventId })
      .from(importedEvents)
      .where(eq(importedEvents.eventId, eventId))
      .get();
    return row !== undefined;
  }

  function markImported(executor: Executor, eventId: string) {
    executor
      .insert(importedEvents)
      .values({ eventId, importedAt: now() })
      .onConflictDoNothing()
      .run();
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
          .set({
            dailyLimitMinutes: minutes,
            previousDailyLimitMinutes: null,
            dailyLimitRaisedOn: null,
          })
          .where(eq(userCompulsions.id, id))
          .run();
      },
      changeDailyLimit: (id, minutes) => {
        requireDailyLimit(requireCompulsionType(db, id), minutes);
        db.transaction((tx) => {
          const current = tx.select().from(userCompulsions).where(eq(userCompulsions.id, id)).get();
          if (!current) throw new Error('Compulsão não encontrada');
          tx.update(userCompulsions)
            .set(applyDailyLimitChange(current, minutes, toDayKey(now())))
            .where(eq(userCompulsions.id, id))
            .run();
        });
      },
      setInitialStreakDays: (id, days) => {
        if (getCompulsionDefinition(requireCompulsionType(db, id)).mechanic !== 'abstinence') {
          throw new Error('Dias sem recair só existem na abstinência');
        }
        if (days !== 0 && !isValidDaysAlreadyWithoutRelapse(days)) {
          throw new RangeError('Dias sem recair fora do intervalo aceito');
        }
        db.update(userCompulsions)
          .set({ initialStreakDays: days })
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
        db.transaction((tx) => answerCheckIn(tx, day, answer, source)),
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
        db.transaction((tx) => markDayFailed(tx, day, reason));
      },
      clearDay: (dayKey) => {
        requireDayKey(dayKey);
        db.transaction((tx) => {
          tx.delete(interruptionEvents).where(eq(interruptionEvents.dayKey, dayKey)).run();
          tx.delete(dayStates).where(eq(dayStates.dayKey, dayKey)).run();
        });
      },
    },

    monitoringEvents: {
      importEvents: (events) => {
        let failed = 0;
        for (const event of events) {
          try {
            db.transaction((tx) => {
              if (isImported(tx, event.id)) return;
              applyEvent(tx, event);
              markImported(tx, event.id);
            });
          } catch {
            // Não trava a fila: o evento fica marcado como importado, sem efeito.
            // Quem chama registra só a contagem, sem dados (CLAUDE.md, seção 9).
            failed += 1;
            markImported(db, event.id);
          }
        }
        return { handledIds: events.map((event) => event.id), failed };
      },
      listInterruptions: (compulsionId) =>
        db
          .select()
          .from(interruptionEvents)
          .where(eq(interruptionEvents.compulsionId, compulsionId))
          .orderBy(asc(interruptionEvents.shownAt))
          .all(),
    },

    emergencySessions: {
      start: (source) =>
        db.transaction((tx) => {
          abandonOpenEmergencySessions(tx);
          return required(
            tx.insert(emergencySessions).values({ startedAt: now(), source }).returning().get(),
            'a sessão de emergência',
          );
        }),
      finish: (id, outcome) => {
        db.update(emergencySessions)
          .set({ endedAt: now(), outcome })
          .where(and(eq(emergencySessions.id, id), isNull(emergencySessions.endedAt)))
          .run();
      },
      abandonOpen: () => abandonOpenEmergencySessions(db),
      list: () => db.select().from(emergencySessions).orderBy(asc(emergencySessions.id)).all(),
    },

    deleteAllData() {
      db.transaction((tx) => {
        // Filhos antes dos pais; a cascata cobriria, mas a ordem explícita não
        // depende do PRAGMA foreign_keys.
        tx.delete(interruptionEvents).run();
        tx.delete(emergencySessions).run();
        tx.delete(importedEvents).run();
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
