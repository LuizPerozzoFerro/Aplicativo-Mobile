import { getAbstinenceOverview, getModerationOverview, sumUsageMinutes } from './overview';

// Fuso fixado em America/Sao_Paulo pelo jest.global-setup.js.
const local = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute);

const NOW = local(2026, 3, 15, 10);
const STARTED_LONG_AGO = local(2026, 3, 1, 9);

const abstinence = (input: Partial<Parameters<typeof getAbstinenceOverview>[0]> = {}) =>
  getAbstinenceOverview({
    startedAt: STARTED_LONG_AGO,
    checkIns: [],
    relapses: [],
    now: NOW,
    ...input,
  });

describe('resumo da abstinência', () => {
  it('sem registros: streak desde o início, check-in pendente, hoje e ontem para recaída', () => {
    expect(abstinence()).toEqual({
      streakDays: 14,
      nextMilestone: 30,
      checkIn: { state: 'pending' },
      yesterdayRelapseUndoable: false,
      relapseDays: ['today', 'yesterday'],
      relapseRecordedToday: false,
    });
  });

  it('no dia do início: 0 dias, próximo marco 1 e só "hoje" para recaída', () => {
    const overview = abstinence({ startedAt: local(2026, 3, 15, 8) });
    expect(overview.streakDays).toBe(0);
    expect(overview.nextMilestone).toBe(1);
    expect(overview.relapseDays).toEqual(['today']);
  });

  it('"sem recaída" hoje: respondido, pode desfazer, e "Registrar recaída" ainda oferece hoje', () => {
    const overview = abstinence({
      checkIns: [{ dayKey: '2026-03-15', answer: 'no_relapse', answeredAt: local(2026, 3, 15, 9) }],
    });
    expect(overview.checkIn).toEqual({ state: 'answered', answer: 'no_relapse', canUndo: true });
    expect(overview.relapseDays).toEqual(['today', 'yesterday']);
    expect(overview.streakDays).toBe(14);
  });

  it('recaída hoje: 0 dias, mensagem de apoio e só "ontem" para recaída', () => {
    const overview = abstinence({
      checkIns: [{ dayKey: '2026-03-15', answer: 'relapse', answeredAt: local(2026, 3, 15, 9) }],
      relapses: [{ dayKey: '2026-03-15', recordedAt: local(2026, 3, 15, 9) }],
    });
    expect(overview.streakDays).toBe(0);
    expect(overview.checkIn).toEqual({ state: 'answered', answer: 'relapse', canUndo: true });
    expect(overview.relapseRecordedToday).toBe(true);
    expect(overview.relapseDays).toEqual(['yesterday']);
  });

  it('recaída de ontem registrada hoje: streak 1, pode desfazer, check-in de hoje pendente', () => {
    const overview = abstinence({
      checkIns: [{ dayKey: '2026-03-14', answer: 'relapse', answeredAt: local(2026, 3, 15, 9) }],
      relapses: [{ dayKey: '2026-03-14', recordedAt: local(2026, 3, 15, 9) }],
    });
    expect(overview.streakDays).toBe(1);
    expect(overview.checkIn).toEqual({ state: 'pending' });
    expect(overview.yesterdayRelapseUndoable).toBe(true);
    expect(overview.relapseRecordedToday).toBe(true);
    expect(overview.relapseDays).toEqual(['today']);
  });

  it('recaída de ontem registrada ontem: não se desfaz nem mostra a mensagem hoje', () => {
    const overview = abstinence({
      relapses: [{ dayKey: '2026-03-14', recordedAt: local(2026, 3, 14, 23) }],
    });
    expect(overview.streakDays).toBe(1);
    expect(overview.yesterdayRelapseUndoable).toBe(false);
    expect(overview.relapseRecordedToday).toBe(false);
    expect(overview.relapseDays).toEqual(['today']);
  });

  it('dias sem check-in não mudam a streak', () => {
    const overview = abstinence({
      checkIns: [
        { dayKey: '2026-03-10', answer: 'no_relapse', answeredAt: local(2026, 3, 10, 21) },
      ],
    });
    expect(overview.streakDays).toBe(14);
  });

  it('um registro feito antes da meia-noite deixa de poder ser desfeito no dia seguinte', () => {
    const overview = abstinence({
      checkIns: [
        { dayKey: '2026-03-15', answer: 'no_relapse', answeredAt: local(2026, 3, 15, 23) },
      ],
      now: local(2026, 3, 16, 0, 5),
    });
    // O check-in era de ontem: hoje está pendente.
    expect(overview.checkIn).toEqual({ state: 'pending' });
  });

  it('depois do último marco, nenhum', () => {
    expect(abstinence({ startedAt: local(2025, 1, 1) }).nextMilestone).toBeNull();
  });
});

describe('resumo da moderação', () => {
  it('streak desde o início e próximo marco', () => {
    expect(
      getModerationOverview({ startedAt: local(2026, 3, 12), failedDayKeys: [], now: NOW }),
    ).toEqual({ streakDays: 3, nextMilestone: 7 });
  });

  it('dia reprovado hoje dá 0, igual à abstinência', () => {
    expect(
      getModerationOverview({
        startedAt: STARTED_LONG_AGO,
        failedDayKeys: ['2026-03-15'],
        now: NOW,
      }).streakDays,
    ).toBe(0);
  });
});

describe('uso de hoje somado', () => {
  const MINUTE = 60 * 1000;

  it('soma só os apps escolhidos e arredonda para baixo', () => {
    expect(
      sumUsageMinutes(
        [
          { targetId: 'com.example.clips', milliseconds: 20 * MINUTE + 59 * 1000 },
          { targetId: 'com.example.feed', milliseconds: 21 * MINUTE + 30 * 1000 },
          { targetId: 'com.example.notes', milliseconds: 90 * MINUTE },
        ],
        ['com.example.clips', 'com.example.feed'],
      ),
    ).toBe(42);
  });

  it('sem uso, 0', () => {
    expect(sumUsageMinutes([], ['com.example.clips'])).toBe(0);
  });
});
