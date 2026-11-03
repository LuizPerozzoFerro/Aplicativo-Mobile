import { createOnboardingStatus } from '@/features/onboarding/onboardingStatus';

import { createRepositories, type Repositories } from './repositories';
import { createTestDatabase, query, type TestDatabase } from './testing';

const NOW = new Date('2026-11-02T12:00:00.000Z');
const LATER = new Date('2026-11-02T20:00:00.000Z');

let database: TestDatabase;
let repositories: Repositories;
let clock: Date;

const count = (table: string) =>
  query(database.raw, `SELECT count(*) FROM ${table}`)[0]?.[0] as number;

beforeEach(async () => {
  database = await createTestDatabase();
  clock = NOW;
  repositories = createRepositories(database.db, () => clock);
});

describe('settings', () => {
  it('cria a linha com os valores padrão na primeira leitura', () => {
    expect(repositories.settings.get()).toEqual({
      id: 1,
      onboardingCompleted: false,
      ageConfirmedAt: null,
      proactiveNotificationDailyLimit: 6,
      createdAt: NOW,
      onboardingStep: null,
      checkInMinutes: 1260,
    });
    repositories.settings.get();
    expect(count('settings')).toBe(1);
  });

  it('grava a flag do onboarding e a confirmação de idade', () => {
    repositories.settings.setOnboardingCompleted(true);
    repositories.settings.setAgeConfirmedAt(NOW);
    expect(repositories.settings.get()).toMatchObject({
      onboardingCompleted: true,
      ageConfirmedAt: NOW,
    });
  });

  it('grava e limpa a etapa do onboarding', () => {
    repositories.settings.setOnboardingStep('triggers');
    expect(repositories.settings.get().onboardingStep).toBe('triggers');
    repositories.settings.setOnboardingStep(null);
    expect(repositories.settings.get().onboardingStep).toBeNull();
  });

  it('grava o horário do check-in e recusa valor fora do dia', () => {
    repositories.settings.setCheckInMinutes(22 * 60 + 30);
    expect(repositories.settings.get().checkInMinutes).toBe(1350);
    expect(() => repositories.settings.setCheckInMinutes(1440)).toThrow(RangeError);
    expect(repositories.settings.get().checkInMinutes).toBe(1350);
  });
});

describe('compulsões', () => {
  it('adiciona e lista compulsões, com limite nulo na abstinência', () => {
    const abstinence = repositories.compulsions.add({ type: 'pornography', startedAt: NOW });
    const moderation = repositories.compulsions.add({
      type: 'short_videos',
      startedAt: NOW,
      dailyLimitMinutes: 30,
    });
    expect(abstinence).toMatchObject({ status: 'active', dailyLimitMinutes: null });
    expect(repositories.compulsions.list().map((item) => item.id)).toEqual([
      abstinence.id,
      moderation.id,
    ]);
    repositories.compulsions.setStatus(moderation.id, 'paused');
    expect(repositories.compulsions.list()[1]?.status).toBe('paused');
  });

  it('não aceita a mesma compulsão duas vezes', () => {
    repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    expect(() => repositories.compulsions.add({ type: 'short_videos', startedAt: NOW })).toThrow();
  });

  it('limite diário: só na moderação e de 5 a 600 minutos', () => {
    const { id } = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    repositories.compulsions.setDailyLimit(id, 45);
    expect(repositories.compulsions.list()[0]?.dailyLimitMinutes).toBe(45);
    expect(() => repositories.compulsions.setDailyLimit(id, 4)).toThrow(RangeError);
    expect(() =>
      repositories.compulsions.add({ type: 'pornography', startedAt: NOW, dailyLimitMinutes: 30 }),
    ).toThrow('Limite diário só existe na moderação');
  });

  it('dias sem recair informados: só na abstinência, 0 ou de 1 a 3650', () => {
    const adult = repositories.compulsions.add({ type: 'pornography', startedAt: NOW });
    expect(adult.initialStreakDays).toBeNull();
    repositories.compulsions.setInitialStreakDays(adult.id, 12);
    expect(repositories.compulsions.list()[0]?.initialStreakDays).toBe(12);
    repositories.compulsions.setInitialStreakDays(adult.id, 0);
    expect(repositories.compulsions.list()[0]?.initialStreakDays).toBe(0);
    expect(() => repositories.compulsions.setInitialStreakDays(adult.id, 3651)).toThrow(RangeError);
    expect(() => repositories.compulsions.setInitialStreakDays(adult.id, -1)).toThrow(RangeError);
    const videos = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    expect(() => repositories.compulsions.setInitialStreakDays(videos.id, 3)).toThrow(
      'Dias sem recair só existem na abstinência',
    );
  });

  it('muda o início (dia do "Começar")', () => {
    const { id } = repositories.compulsions.add({ type: 'pornography', startedAt: NOW });
    repositories.compulsions.setStartedAt(id, LATER);
    expect(repositories.compulsions.list()[0]?.startedAt).toEqual(LATER);
  });
});

describe('apps monitorados', () => {
  it('só guarda "consumo declarado" em app de risco', () => {
    const videos = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    const adult = repositories.compulsions.add({ type: 'pornography', startedAt: NOW });
    const shortVideo = repositories.monitoredApps.add({
      compulsionId: videos.id,
      packageName: 'com.example.clips',
      role: 'short_video',
      declaredConsumption: true,
    });
    const risk = repositories.monitoredApps.add({
      compulsionId: adult.id,
      packageName: 'com.example.forum',
      role: 'risk',
      declaredConsumption: true,
    });
    expect(shortVideo.declaredConsumption).toBeNull();
    expect(risk.declaredConsumption).toBe(true);
  });

  it('recusa um papel que não vale para a compulsão (isAppRoleAllowed)', () => {
    const videos = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    const adult = repositories.compulsions.add({ type: 'pornography', startedAt: NOW });
    expect(() =>
      repositories.monitoredApps.add({
        compulsionId: videos.id,
        packageName: 'com.example.forum',
        role: 'risk',
      }),
    ).toThrow('Papel do app não permitido para esta compulsão');
    expect(() =>
      repositories.monitoredApps.replaceForCompulsion(adult.id, [
        { packageName: 'com.example.clips', role: 'short_video' },
      ]),
    ).toThrow('Papel do app não permitido para esta compulsão');
    expect(count('monitored_apps')).toBe(0);
  });

  it('recusa app de compulsão que não existe', () => {
    expect(() =>
      repositories.monitoredApps.add({
        compulsionId: 999,
        packageName: 'com.example.clips',
        role: 'short_video',
      }),
    ).toThrow('Compulsão não encontrada');
  });

  it('o mesmo app pode estar nas duas compulsões', () => {
    const videos = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    const adult = repositories.compulsions.add({ type: 'pornography', startedAt: NOW });
    repositories.monitoredApps.add({
      compulsionId: videos.id,
      packageName: 'com.example.feed',
      role: 'short_video',
    });
    repositories.monitoredApps.add({
      compulsionId: adult.id,
      packageName: 'com.example.feed',
      role: 'risk',
      declaredConsumption: false,
    });
    expect(count('monitored_apps')).toBe(2);
  });

  it('troca a lista inteira; se um app falhar, a lista anterior fica', () => {
    const { id } = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    repositories.monitoredApps.replaceForCompulsion(id, [
      { packageName: 'com.example.clips', role: 'short_video' },
      { packageName: 'com.example.feed', role: 'short_video' },
    ]);
    repositories.monitoredApps.replaceForCompulsion(id, [
      { packageName: 'com.example.notes', role: 'short_video' },
    ]);
    expect(repositories.monitoredApps.listByCompulsion(id).map((app) => app.packageName)).toEqual([
      'com.example.notes',
    ]);

    expect(() =>
      repositories.monitoredApps.replaceForCompulsion(id, [
        { packageName: 'com.example.clips', role: 'short_video' },
        { packageName: 'com.example.clips', role: 'short_video' },
      ]),
    ).toThrow();
    expect(repositories.monitoredApps.listByCompulsion(id).map((app) => app.packageName)).toEqual([
      'com.example.notes',
    ]);
  });
});

describe('gatilhos', () => {
  it('valida o value pelo kind antes de gravar', () => {
    repositories.triggers.add({ kind: 'time', value: '23:30-01:00' });
    repositories.triggers.add({ kind: 'weekday', value: '6' });
    repositories.triggers.add({ kind: 'emotion', value: 'stress' });
    expect(() => repositories.triggers.add({ kind: 'time', value: '22:00' })).toThrow(RangeError);
    expect(() => repositories.triggers.add({ kind: 'weekday', value: 'saturday' })).toThrow(
      RangeError,
    );
    expect(count('triggers')).toBe(3);
  });

  it('troca todos de uma vez; se um falhar, os anteriores ficam', () => {
    repositories.triggers.replaceAll([{ kind: 'emotion', value: 'boredom' }]);
    const saved = repositories.triggers.replaceAll([
      { kind: 'time', value: '20:00-22:00' },
      { kind: 'weekday', value: '0' },
    ]);
    expect(repositories.triggers.list()).toEqual(saved);
    expect(() =>
      repositories.triggers.replaceAll([
        { kind: 'weekday', value: '1' },
        { kind: 'emotion', value: 'unknown' },
      ]),
    ).toThrow(RangeError);
    expect(repositories.triggers.list()).toEqual(saved);
  });

  it('apagar a compulsão apaga em cascata os apps e gatilhos dela', () => {
    const { id } = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    repositories.monitoredApps.add({
      compulsionId: id,
      packageName: 'com.example.clips',
      role: 'short_video',
    });
    repositories.triggers.add({ kind: 'time', value: '22:00-00:00', compulsionId: id });
    const global = repositories.triggers.add({ kind: 'emotion', value: 'boredom' });

    repositories.compulsions.remove(id);
    expect(repositories.monitoredApps.listByCompulsion(id)).toEqual([]);
    expect(repositories.triggers.list()).toEqual([global]);
  });
});

describe('motivação', () => {
  it('começa vazia e cada gravação substitui a anterior', () => {
    expect(repositories.motivation.get()).toBeNull();
    repositories.motivation.save('Primeira versão');
    const saved = repositories.motivation.save('Versão final');
    expect(repositories.motivation.get()).toEqual(saved);
    expect(count('motivation')).toBe(1);
  });
});

describe('check-in e recaída', () => {
  let adultId: number;
  const today = '2026-11-02';
  const yesterday = '2026-11-01';

  beforeEach(() => {
    adultId = repositories.compulsions.add({ type: 'pornography', startedAt: NOW }).id;
  });

  const checkIns = () =>
    repositories.checkIns
      .listByCompulsion(adultId)
      .map(({ dayKey, answer, source }) => ({ dayKey, answer, source }));
  const relapseDays = () =>
    repositories.relapses.listByCompulsion(adultId).map((relapse) => relapse.dayKey);

  it('"Sem recaída" grava só o check-in', () => {
    const checkIn = repositories.checkIns.answer({
      compulsionId: adultId,
      dayKey: today,
      answer: 'no_relapse',
    });
    expect(checkIn).toMatchObject({ answer: 'no_relapse', source: 'app', answeredAt: NOW });
    expect(relapseDays()).toEqual([]);
  });

  it('"Tive uma recaída" no check-in também grava a recaída', () => {
    repositories.checkIns.answer({ compulsionId: adultId, dayKey: today, answer: 'relapse' });
    expect(relapseDays()).toEqual([today]);
  });

  it('responder de novo no mesmo dia substitui, e a recaída acompanha', () => {
    repositories.checkIns.answer({ compulsionId: adultId, dayKey: today, answer: 'relapse' });
    clock = LATER;
    const replaced = repositories.checkIns.answer({
      compulsionId: adultId,
      dayKey: today,
      answer: 'no_relapse',
      source: 'notification',
    });
    expect(replaced.answeredAt).toEqual(LATER);
    expect(checkIns()).toEqual([{ dayKey: today, answer: 'no_relapse', source: 'notification' }]);
    expect(relapseDays()).toEqual([]);
  });

  it('"Registrar recaída" substitui um "Sem recaída" do mesmo dia', () => {
    repositories.checkIns.answer({ compulsionId: adultId, dayKey: today, answer: 'no_relapse' });
    clock = LATER;
    const relapse = repositories.relapses.record({ compulsionId: adultId, dayKey: today });
    expect(relapse.recordedAt).toEqual(LATER);
    expect(checkIns()).toEqual([{ dayKey: today, answer: 'relapse', source: 'app' }]);
  });

  it('recaída de ontem grava o check-in de ontem e não mexe no de hoje', () => {
    repositories.checkIns.answer({ compulsionId: adultId, dayKey: today, answer: 'no_relapse' });
    repositories.relapses.record({ compulsionId: adultId, dayKey: yesterday });
    expect(checkIns()).toEqual([
      { dayKey: yesterday, answer: 'relapse', source: 'app' },
      { dayKey: today, answer: 'no_relapse', source: 'app' },
    ]);
    expect(relapseDays()).toEqual([yesterday]);
  });

  it('desfazer apaga o check-in e a recaída do dia, pelos dois caminhos', () => {
    repositories.relapses.record({ compulsionId: adultId, dayKey: yesterday });
    repositories.checkIns.answer({ compulsionId: adultId, dayKey: today, answer: 'relapse' });

    repositories.relapses.undo({ compulsionId: adultId, dayKey: yesterday });
    expect(relapseDays()).toEqual([today]);
    repositories.checkIns.undo({ compulsionId: adultId, dayKey: today });
    expect(checkIns()).toEqual([]);
    expect(relapseDays()).toEqual([]);
  });

  it('check-in e recaída só na abstinência, com dia válido', () => {
    const videos = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    expect(() => repositories.relapses.record({ compulsionId: videos.id, dayKey: today })).toThrow(
      'Registro não se aplica à mecânica desta compulsão',
    );
    expect(() =>
      repositories.checkIns.answer({
        compulsionId: adultId,
        dayKey: '2026-02-30',
        answer: 'relapse',
      }),
    ).toThrow(RangeError);
    expect(count('check_ins')).toBe(0);
    expect(count('relapses')).toBe(0);
  });

  it('se a recaída falhar, o check-in do dia não fica gravado (transação)', () => {
    // O check-in é gravado antes da recaída; um gatilho SQL faz a recaída falhar.
    database.raw.run(
      "CREATE TRIGGER fail_relapse BEFORE INSERT ON relapses BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;",
    );
    expect(() => repositories.relapses.record({ compulsionId: adultId, dayKey: today })).toThrow();
    expect(() =>
      repositories.checkIns.answer({ compulsionId: adultId, dayKey: today, answer: 'relapse' }),
    ).toThrow();
    expect(count('check_ins')).toBe(0);
    expect(count('relapses')).toBe(0);
  });
});

describe('estado do dia (moderação)', () => {
  it('reprova o dia e lista os dias reprovados', () => {
    const { id } = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    repositories.dayStates.markFailed({ compulsionId: id, dayKey: '2026-11-01' }, 'ignored_limit');
    repositories.dayStates.markFailed({ compulsionId: id, dayKey: '2026-10-30' }, 'third_continue');
    repositories.dayStates.markFailed({ compulsionId: id, dayKey: '2026-11-01' }, 'third_continue');
    expect(repositories.dayStates.listFailedDayKeys(id)).toEqual(['2026-10-30', '2026-11-01']);
    expect(repositories.dayStates.listByCompulsion(id)[1]).toEqual({
      compulsionId: id,
      dayKey: '2026-11-01',
      interruptions: 0,
      continues: 0,
      failed: true,
      failedReason: 'third_continue',
    });
  });

  it('só na moderação', () => {
    const { id } = repositories.compulsions.add({ type: 'pornography', startedAt: NOW });
    expect(() =>
      repositories.dayStates.markFailed(
        { compulsionId: id, dayKey: '2026-11-01' },
        'ignored_limit',
      ),
    ).toThrow('Registro não se aplica à mecânica desta compulsão');
  });
});

describe('deleteAllData', () => {
  it('apaga tudo, inclusive as tabelas da Fase 3, e as configurações voltam ao padrão', () => {
    const videos = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    const adult = repositories.compulsions.add({ type: 'pornography', startedAt: NOW });
    repositories.monitoredApps.add({
      compulsionId: videos.id,
      packageName: 'com.example.clips',
      role: 'short_video',
    });
    repositories.triggers.add({ kind: 'weekday', value: '6' });
    repositories.motivation.save('Texto');
    repositories.checkIns.answer({
      compulsionId: adult.id,
      dayKey: '2026-11-02',
      answer: 'relapse',
    });
    repositories.dayStates.markFailed(
      { compulsionId: videos.id, dayKey: '2026-11-01' },
      'ignored_limit',
    );
    repositories.settings.setOnboardingCompleted(true);
    repositories.settings.setOnboardingStep('summary');
    repositories.settings.setCheckInMinutes(600);

    repositories.deleteAllData();

    for (const table of [
      'user_compulsions',
      'monitored_apps',
      'triggers',
      'motivation',
      'check_ins',
      'relapses',
      'day_states',
      'settings',
    ]) {
      expect(count(table)).toBe(0);
    }
    expect(repositories.settings.get()).toMatchObject({
      onboardingCompleted: false,
      onboardingStep: null,
      checkInMinutes: 1260,
    });
  });
});

describe('flag do onboarding ligada ao banco', () => {
  it('carrega do banco ao conectar e grava a cada mudança', () => {
    repositories.settings.setOnboardingCompleted(true);
    const status = createOnboardingStatus();
    const listener = jest.fn();
    status.subscribe(listener);

    status.connect({
      load: () => repositories.settings.get().onboardingCompleted,
      save: (completed) => repositories.settings.setOnboardingCompleted(completed),
    });
    expect(status.isCompleted()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    status.setCompleted(false);
    expect(repositories.settings.get().onboardingCompleted).toBe(false);
  });

  it('se a gravação falhar, o estado (e a navegação) não muda', () => {
    const status = createOnboardingStatus();
    status.connect({
      load: () => false,
      save: () => {
        throw new Error('disco cheio');
      },
    });
    expect(() => status.setCompleted(true)).toThrow('disco cheio');
    expect(status.isCompleted()).toBe(false);
  });
});
