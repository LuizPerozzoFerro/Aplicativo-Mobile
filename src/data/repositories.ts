import { asc, desc, eq } from 'drizzle-orm';

import type {
  CompulsionStatus,
  CompulsionType,
  MonitoredAppRole,
  TriggerKind,
} from '@/domain/compulsion';

import type { AppDatabase } from './database';
import { monitoredApps, motivation, settings, triggers, userCompulsions } from './schema';

// Acesso ao banco (spec 01, seção 4.6). A UI nunca escreve SQL: tudo passa por
// estas interfaces. Mensagens de erro e logs daqui não citam valores de enum,
// nomes de apps nem textos do usuário (CLAUDE.md, seção 9).

export type Settings = typeof settings.$inferSelect;
export type UserCompulsion = typeof userCompulsions.$inferSelect;
export type MonitoredApp = typeof monitoredApps.$inferSelect;
export type Trigger = typeof triggers.$inferSelect;
export type Motivation = typeof motivation.$inferSelect;

export type SettingsRepository = {
  /** Lê as configurações; cria a linha com os valores padrão na primeira vez. */
  get(): Settings;
  setOnboardingCompleted(completed: boolean): void;
  setAgeConfirmedAt(date: Date | null): void;
};

export type CompulsionRepository = {
  list(): UserCompulsion[];
  add(input: {
    type: CompulsionType;
    startedAt: Date;
    dailyLimitMinutes?: number | null;
  }): UserCompulsion;
  setStatus(id: number, status: CompulsionStatus): void;
  remove(id: number): void;
};

export type MonitoredAppRepository = {
  listByCompulsion(compulsionId: number): MonitoredApp[];
  add(input: {
    compulsionId: number;
    packageName: string;
    role: MonitoredAppRole;
    declaredConsumption?: boolean | null;
  }): MonitoredApp;
  remove(id: number): void;
};

export type TriggerRepository = {
  list(): Trigger[];
  add(input: { kind: TriggerKind; value: string; compulsionId?: number | null }): Trigger;
  remove(id: number): void;
};

export type MotivationRepository = {
  get(): Motivation | null;
  /** Guarda o texto, substituindo o anterior. */
  save(text: string): Motivation;
};

export type Repositories = {
  settings: SettingsRepository;
  compulsions: CompulsionRepository;
  monitoredApps: MonitoredAppRepository;
  triggers: TriggerRepository;
  motivation: MotivationRepository;
  /** Apaga todos os dados do usuário; as configurações voltam ao padrão. */
  deleteAllData(): void;
};

const SETTINGS_ID = 1;

function required<T>(row: T | undefined, what: string): T {
  if (row === undefined) throw new Error(`Falha ao gravar ${what}`);
  return row;
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
  };

  return {
    settings: settingsRepository,

    compulsions: {
      list: () => db.select().from(userCompulsions).orderBy(asc(userCompulsions.id)).all(),
      add: ({ type, startedAt, dailyLimitMinutes = null }) =>
        required(
          db
            .insert(userCompulsions)
            .values({ type, startedAt, dailyLimitMinutes })
            .returning()
            .get(),
          'a compulsão',
        ),
      setStatus: (id, status) => {
        db.update(userCompulsions).set({ status }).where(eq(userCompulsions.id, id)).run();
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
      add: ({ compulsionId, packageName, role, declaredConsumption = null }) =>
        required(
          db
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
        ),
      remove: (id) => {
        db.delete(monitoredApps).where(eq(monitoredApps.id, id)).run();
      },
    },

    triggers: {
      list: () => db.select().from(triggers).orderBy(asc(triggers.id)).all(),
      add: ({ kind, value, compulsionId = null }) =>
        required(
          db.insert(triggers).values({ kind, value, compulsionId }).returning().get(),
          'o gatilho',
        ),
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

    deleteAllData() {
      db.transaction((tx) => {
        // Filhos antes dos pais; a cascata cobriria, mas a ordem explícita não
        // depende do PRAGMA foreign_keys.
        tx.delete(monitoredApps).run();
        tx.delete(triggers).run();
        tx.delete(userCompulsions).run();
        tx.delete(motivation).run();
        tx.delete(settings).run();
      });
    },
  };
}
