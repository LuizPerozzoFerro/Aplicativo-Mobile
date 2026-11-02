import { createOnboardingStatus } from '@/features/onboarding/onboardingStatus';

import { createRepositories, type Repositories } from './repositories';
import { createTestDatabase, query, type TestDatabase } from './testing';

const NOW = new Date('2026-11-02T12:00:00.000Z');

let database: TestDatabase;
let repositories: Repositories;

beforeEach(async () => {
  database = await createTestDatabase();
  repositories = createRepositories(database.db, () => NOW);
});

describe('settings', () => {
  it('cria a linha com os valores padrão na primeira leitura', () => {
    expect(repositories.settings.get()).toEqual({
      id: 1,
      onboardingCompleted: false,
      ageConfirmedAt: null,
      proactiveNotificationDailyLimit: 6,
      createdAt: NOW,
    });
    repositories.settings.get();
    expect(query(database.raw, 'SELECT count(*) FROM settings')[0]?.[0]).toBe(1);
  });

  it('grava a flag do onboarding e a confirmação de idade', () => {
    repositories.settings.setOnboardingCompleted(true);
    repositories.settings.setAgeConfirmedAt(NOW);
    expect(repositories.settings.get()).toMatchObject({
      onboardingCompleted: true,
      ageConfirmedAt: NOW,
    });
  });
});

describe('compulsões, apps e gatilhos', () => {
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

  it('só guarda "consumo declarado" em app de risco', () => {
    const { id } = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    const shortVideo = repositories.monitoredApps.add({
      compulsionId: id,
      packageName: 'com.example.videos',
      role: 'short_video',
      declaredConsumption: true,
    });
    const risk = repositories.monitoredApps.add({
      compulsionId: id,
      packageName: 'com.example.social',
      role: 'risk',
      declaredConsumption: true,
    });
    expect(shortVideo.declaredConsumption).toBeNull();
    expect(risk.declaredConsumption).toBe(true);
    expect(repositories.monitoredApps.listByCompulsion(id)).toHaveLength(2);
  });

  it('apagar a compulsão apaga em cascata os apps e gatilhos dela', () => {
    const { id } = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    repositories.monitoredApps.add({
      compulsionId: id,
      packageName: 'com.example.videos',
      role: 'short_video',
    });
    repositories.triggers.add({ kind: 'time', value: '22:00', compulsionId: id });
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
    expect(query(database.raw, 'SELECT count(*) FROM motivation')[0]?.[0]).toBe(1);
  });
});

describe('deleteAllData', () => {
  it('apaga tudo e as configurações voltam ao padrão', () => {
    const { id } = repositories.compulsions.add({ type: 'short_videos', startedAt: NOW });
    repositories.monitoredApps.add({
      compulsionId: id,
      packageName: 'com.example.videos',
      role: 'short_video',
    });
    repositories.triggers.add({ kind: 'weekday', value: 'saturday' });
    repositories.motivation.save('Texto');
    repositories.settings.setOnboardingCompleted(true);

    repositories.deleteAllData();

    for (const table of [
      'user_compulsions',
      'monitored_apps',
      'triggers',
      'motivation',
      'settings',
    ]) {
      expect(query(database.raw, `SELECT count(*) FROM ${table}`)[0]?.[0]).toBe(0);
    }
    expect(repositories.settings.get().onboardingCompleted).toBe(false);
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
