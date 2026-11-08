import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import type { MonitoringTexts } from '@/monitoring';

import { buildMonitoringConfig } from './config';

// Fuso de São Paulo (jest.global-setup.js). 07/11/2026, 10:00 local.
const NOW = new Date('2026-11-07T13:00:00.000Z');
const STARTED = new Date('2026-11-01T13:00:00.000Z');

const TEXTS: MonitoringTexts = {
  channels: { tracking: 'Acompanhamento', alerts: 'Avisos', reminders: 'Lembretes' },
  ongoing: { title: 'Quedo', text: 'Proteção ativa.' },
  notifications: {
    public: { title: 'a', text: 'b' },
    emergencyAction: 'c',
    limit: { title: 'd', text: 'e' },
    riskApp: { title: 'd', text: 'e' },
    checkIn: { title: 'd', text: 'e', noRelapse: 'f', relapse: 'g' },
    preventive: {
      title: 'd',
      generic: 'e',
      withMotivation: 'f',
      byEmotion: {
        boredom: 'a',
        loneliness: 'b',
        stress: 'c',
        anxiety: 'd',
        tiredness: 'e',
        sadness: 'f',
      },
    },
    restart: { title: 'd', text: 'e' },
    protectionPaused: { title: 'd', text: 'e' },
  },
  interruption: {
    brand: 'a',
    title: 'b',
    phrases: ['c'],
    motivationLabel: 'd',
    emergency: 'e',
    home: 'f',
    continue: 'g',
    ignoreToday: 'h',
    endOfDayWarning: 'i',
  },
};

let repositories: Repositories;

beforeEach(async () => {
  const { db } = await createTestDatabase();
  repositories = createRepositories(db, () => NOW);
});

const LINKS = {
  permissions: 'quedo-dev://permission-status',
  emergencyFromNotification: 'quedo-dev://emergency?source=notification',
  emergencyFromInterruption: 'quedo-dev://emergency?source=interruption',
};
const build = (now = NOW) => buildMonitoringConfig(repositories, TEXTS, now, LINKS);

function addAdult() {
  const { id } = repositories.compulsions.add({ type: 'pornography', startedAt: STARTED });
  repositories.monitoredApps.add({
    compulsionId: id,
    packageName: 'com.example.forum',
    role: 'risk',
    declaredConsumption: true,
  });
  repositories.monitoredApps.add({
    compulsionId: id,
    packageName: 'com.example.feed',
    role: 'risk',
    declaredConsumption: false,
  });
  return id;
}

function addVideos(dailyLimitMinutes = 45) {
  const { id } = repositories.compulsions.add({
    type: 'short_videos',
    startedAt: STARTED,
    dailyLimitMinutes,
  });
  repositories.monitoredApps.add({
    compulsionId: id,
    packageName: 'com.example.clips',
    role: 'short_video',
  });
  repositories.monitoredApps.add({
    compulsionId: id,
    packageName: 'com.example.feed',
    role: 'short_video',
  });
  return id;
}

describe('buildMonitoringConfig', () => {
  it('sem compulsão: configuração vazia, com os textos', () => {
    expect(build()).toEqual({
      version: 1,
      compulsions: [],
      moderationRules: [],
      riskAppRules: [],
      checkInMinutes: null,
      checkInCompulsionId: null,
      restartDayKeys: [],
      links: LINKS,
      preventive: { weekdays: [0, 1, 2, 3, 4, 5, 6], startMinutes: [], emotions: [] },
      motivation: null,
      texts: TEXTS,
    });
  });

  it('moderação: um limite somado com os apps de vídeo; risco: um por app, com a tela só onde declarado', () => {
    const adult = addAdult();
    const videos = addVideos();
    const config = build();
    expect(config.moderationRules).toEqual([
      {
        compulsionId: videos,
        targetIds: ['com.example.clips', 'com.example.feed'],
        dailyLimitMinutes: 45,
        limitToday: null,
      },
    ]);
    expect(config.riskAppRules).toEqual([
      {
        compulsionId: adult,
        targetId: 'com.example.forum',
        dailyLimitMinutes: 10,
        interruption: true,
      },
      {
        compulsionId: adult,
        targetId: 'com.example.feed',
        dailyLimitMinutes: 10,
        interruption: false,
      },
    ]);
  });

  it('no dia de um aumento, leva também o limite que continua valendo', () => {
    const videos = addVideos();
    repositories.compulsions.changeDailyLimit(videos, 90);
    expect(build().moderationRules[0]).toMatchObject({
      dailyLimitMinutes: 90,
      limitToday: { dayKey: '2026-11-07', minutes: 45 },
    });
    // No dia seguinte, só o novo.
    const tomorrow = new Date('2026-11-08T13:00:00.000Z');
    expect(build(tomorrow).moderationRules[0]).toMatchObject({
      dailyLimitMinutes: 90,
      limitToday: null,
    });
  });

  it('dia-base da streak e último check-in por compulsão', () => {
    const adult = addAdult();
    const videos = addVideos();
    repositories.relapses.record({ compulsionId: adult, dayKey: '2026-11-03' });
    repositories.checkIns.answer({
      compulsionId: adult,
      dayKey: '2026-11-07',
      answer: 'no_relapse',
    });
    repositories.dayStates.markFailed(
      { compulsionId: videos, dayKey: '2026-11-05' },
      'ignored_limit',
    );

    expect(build().compulsions).toEqual([
      {
        id: adult,
        type: 'pornography',
        streakBaseDayKey: '2026-11-03',
        checkInAnsweredDayKey: '2026-11-07',
      },
      {
        id: videos,
        type: 'short_videos',
        streakBaseDayKey: '2026-11-05',
        checkInAnsweredDayKey: null,
      },
    ]);
  });

  it('sem quebra, o dia-base é o do início', () => {
    addVideos();
    expect(build().compulsions[0]?.streakBaseDayKey).toBe('2026-11-01');
  });

  it('check-in só com abstinência ativa, no horário escolhido', () => {
    addVideos();
    expect(build().checkInMinutes).toBeNull();
    addAdult();
    repositories.settings.setCheckInMinutes(22 * 60);
    expect(build().checkInMinutes).toBe(22 * 60);
  });

  it('compulsão pausada fica de fora', () => {
    const videos = addVideos();
    repositories.compulsions.setStatus(videos, 'paused');
    const config = build();
    expect(config.compulsions).toEqual([]);
    expect(config.moderationRules).toEqual([]);
  });

  it('preventivas: dias marcados, horários unidos e emoções', () => {
    repositories.triggers.replaceAll([
      { kind: 'time', value: '22:00-00:00' },
      { kind: 'time', value: '20:00-22:00' },
      { kind: 'time', value: '07:00-08:00' },
      { kind: 'weekday', value: '6' },
      { kind: 'weekday', value: '0' },
      { kind: 'emotion', value: 'stress' },
    ]);
    expect(build().preventive).toEqual({
      weekdays: [0, 6],
      startMinutes: [7 * 60, 20 * 60],
      emotions: ['stress'],
    });
  });

  it('check-in aponta a compulsão de abstinência', () => {
    const adult = addAdult();
    expect(build().checkInCompulsionId).toBe(adult);
  });

  it('recomeço: quebra de hoje com streak dá amanhã, e desfazer cancela', () => {
    const adult = addAdult();
    const day = { compulsionId: adult, dayKey: '2026-11-07' };
    repositories.relapses.record(day);
    expect(build().restartDayKeys).toEqual(['2026-11-08']);
    repositories.relapses.undo(day);
    expect(build().restartDayKeys).toEqual([]);
  });

  it('recomeço: dia reprovado também conta', () => {
    const videos = addVideos();
    repositories.dayStates.markFailed(
      { compulsionId: videos, dayKey: '2026-11-07' },
      'ignored_limit',
    );
    expect(build().restartDayKeys).toEqual(['2026-11-08']);
  });

  it('leva a motivação', () => {
    repositories.motivation.save('Dormir melhor');
    expect(build().motivation).toBe('Dormir melhor');
  });
});
