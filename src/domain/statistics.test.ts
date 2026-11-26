import {
  countByHour,
  countDayResults,
  getDailyUsage,
  getHourlyAverage,
  getPeakHour,
  getStreakStats,
  getTriggerHours,
  getWeeklyUsage,
  listUsageApps,
  splitMinutes,
  summarizeCheckIns,
  summarizeEmergency,
  summarizeInterruptions,
  type UsageRow,
} from './statistics';

// Fuso de São Paulo (jest.global-setup.js). Hoje: 26/11/2026, 15:00 local.
const NOW = new Date(2026, 10, 26, 15, 0);
const TODAY = '2026-11-26';

const row = (dayKey: string, hour: number, seconds: number, appPackage = 'a'): UsageRow => ({
  dayKey,
  hour,
  appPackage,
  seconds,
});

describe('uso por dia', () => {
  it('os 7 dias até hoje: dia com dados e sem linhas é zero; dia sem dados é null', () => {
    const days = getDailyUsage({
      rows: [row('2026-11-20', 9, 600), row('2026-11-20', 10, 659), row('2026-11-26', 8, 120)],
      coveredDayKeys: new Set(['2026-11-20', '2026-11-21', '2026-11-26']),
      todayKey: TODAY,
    });
    expect(days).toEqual([
      { dayKey: '2026-11-20', minutes: 20 },
      { dayKey: '2026-11-21', minutes: 0 },
      { dayKey: '2026-11-22', minutes: null },
      { dayKey: '2026-11-23', minutes: null },
      { dayKey: '2026-11-24', minutes: null },
      { dayKey: '2026-11-25', minutes: null },
      // Hoje entra com o que já foi usado.
      { dayKey: '2026-11-26', minutes: 2 },
    ]);
  });

  it('por app: só as linhas do app escolhido', () => {
    const input = {
      rows: [row(TODAY, 8, 600, 'a'), row(TODAY, 8, 300, 'b')],
      coveredDayKeys: new Set([TODAY]),
      todayKey: TODAY,
    };
    expect(getDailyUsage({ ...input, appPackage: 'b' }).at(-1)?.minutes).toBe(5);
    expect(getDailyUsage({ ...input, appPackage: null }).at(-1)?.minutes).toBe(15);
  });

  it('atravessa a mudança de mês', () => {
    const days = getDailyUsage({ rows: [], coveredDayKeys: new Set(), todayKey: '2026-12-02' });
    expect(days.map((day) => day.dayKey)).toEqual([
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
    ]);
  });
});

describe('uso por semana', () => {
  it('8 semanas de 7 dias, a atual terminando hoje; semana sem dados é null', () => {
    const weeks = getWeeklyUsage({
      rows: [row('2026-11-20', 9, 600), row('2026-11-19', 9, 1200), row('2026-11-26', 9, 60)],
      coveredDayKeys: new Set(['2026-11-19', '2026-11-20', '2026-11-26']),
      todayKey: TODAY,
    });
    expect(weeks).toHaveLength(8);
    expect(weeks.at(-1)).toEqual({
      startDayKey: '2026-11-20',
      endDayKey: TODAY,
      minutes: 11,
      coveredDays: 2,
    });
    expect(weeks.at(-2)).toEqual({
      startDayKey: '2026-11-13',
      endDayKey: '2026-11-19',
      minutes: 20,
      coveredDays: 1,
    });
    expect(weeks[0]).toMatchObject({ startDayKey: '2026-10-02', minutes: null, coveredDays: 0 });
  });
});

describe('horários de maior uso', () => {
  it('média por hora dos dias completos com dados, sem hoje nem dias fora dos 30', () => {
    const average = getHourlyAverage({
      rows: [
        row('2026-11-24', 21, 1200),
        row('2026-11-25', 21, 600),
        row('2026-11-25', 8, 300, 'b'),
        // Hoje (pela metade) e um dia de mais de 30 dias atrás ficam de fora.
        row(TODAY, 21, 3600),
        row('2026-10-26', 21, 3600),
      ],
      coveredDayKeys: new Set(['2026-10-26', '2026-11-24', '2026-11-25', TODAY]),
      todayKey: TODAY,
    });
    expect(average.days).toBe(2);
    expect(average.minutesByHour[21]).toBe(15);
    expect(average.minutesByHour[8]).toBe(2.5);
    expect(average.minutesByHour[0]).toBe(0);
    expect(getPeakHour(average.minutesByHour)).toBe(21);
  });

  it('o primeiro dia da janela é 30 dias antes de hoje', () => {
    const average = getHourlyAverage({
      rows: [row('2026-10-27', 1, 600)],
      coveredDayKeys: new Set(['2026-10-27']),
      todayKey: TODAY,
    });
    expect(average).toMatchObject({ days: 1 });
    expect(average.minutesByHour[1]).toBe(10);
  });

  it('sem dia completo com dados: nada para mostrar', () => {
    const average = getHourlyAverage({
      rows: [row(TODAY, 9, 600)],
      coveredDayKeys: new Set([TODAY]),
      todayKey: TODAY,
    });
    expect(average.days).toBe(0);
    expect(getPeakHour(average.minutesByHour)).toBeNull();
  });

  it('apps do filtro, do mais usado ao menos usado, sem os de uso zero', () => {
    expect(
      listUsageApps([row(TODAY, 1, 60, 'b'), row(TODAY, 2, 600, 'a'), row(TODAY, 3, 0, 'c')]),
    ).toEqual(['a', 'b']);
  });
});

describe('faixas de gatilho no gráfico de horários', () => {
  const hours = (flags: boolean[]) => flags.flatMap((flag, hour) => (flag ? [hour] : [])).join(',');

  it('destaca as horas que a faixa toca, inclusive pela metade', () => {
    expect(hours(getTriggerHours([{ start: 21 * 60 + 30, end: 23 * 60 }]))).toBe('21,22');
    expect(hours(getTriggerHours([{ start: 9 * 60, end: 9 * 60 + 15 }]))).toBe('9');
  });

  it('faixa que atravessa a meia-noite e faixa que termina à meia-noite', () => {
    expect(hours(getTriggerHours([{ start: 23 * 60, end: 60 + 30 }]))).toBe('0,1,23');
    expect(hours(getTriggerHours([{ start: 22 * 60, end: 0 }]))).toBe('22,23');
  });

  it('sem faixas, nada destacado', () => {
    expect(hours(getTriggerHours([]))).toBe('');
  });
});

describe('alertas', () => {
  it('conta por hora local', () => {
    const counts = countByHour([
      new Date(2026, 10, 25, 21, 59),
      new Date(2026, 10, 26, 21, 0),
      new Date(2026, 10, 26, 0, 10),
    ]);
    expect(counts[21]).toBe(2);
    expect(counts[0]).toBe(1);
    expect(counts.reduce((sum, value) => sum + value, 0)).toBe(3);
  });

  it('respeitados: tela inicial e emergência; ignorados: continuar e ignorar o limite', () => {
    expect(
      summarizeInterruptions(['home', 'emergency', 'continue', 'ignore_today', 'continue', null]),
    ).toEqual({ total: 6, respected: 2, ignored: 3, unanswered: 1 });
  });
});

describe('dias aprovados e reprovados', () => {
  it('aprovado = dia já terminado e não reprovado; hoje reprovado já conta', () => {
    expect(
      countDayResults({
        startedAt: new Date(2026, 10, 20, 18, 0),
        failedDayKeys: ['2026-11-22', TODAY],
        now: NOW,
      }),
    ).toEqual({ approved: 5, failed: 2 });
  });

  it('começou hoje: nenhum dia terminado ainda', () => {
    expect(countDayResults({ startedAt: NOW, failedDayKeys: [], now: NOW })).toEqual({
      approved: 0,
      failed: 0,
    });
  });

  it('reprovações antes do início ou no futuro não contam', () => {
    expect(
      countDayResults({
        startedAt: new Date(2026, 10, 24),
        failedDayKeys: ['2026-11-01', '2026-11-30', 'inválido'],
        now: NOW,
      }),
    ).toEqual({ approved: 2, failed: 0 });
  });
});

describe('histórico de sequências', () => {
  it('atual, maior e a lista da mais recente à mais antiga', () => {
    const stats = getStreakStats({
      startedAt: new Date(2026, 10, 1, 10, 0),
      eventDayKeys: ['2026-11-11', '2026-11-14'],
      now: NOW,
    });
    expect(stats).toEqual({
      current: 12,
      longest: 12,
      sequences: [
        { startDayKey: '2026-11-14', endDayKey: null, days: 12 },
        { startDayKey: '2026-11-11', endDayKey: '2026-11-14', days: 3 },
        { startDayKey: '2026-11-01', endDayKey: '2026-11-11', days: 10 },
      ],
    });
  });

  it('a maior pode ser uma que já terminou; quebra hoje deixa a atual em 0', () => {
    const stats = getStreakStats({
      startedAt: new Date(2026, 10, 1),
      eventDayKeys: [TODAY],
      now: NOW,
    });
    expect(stats.current).toBe(0);
    expect(stats.longest).toBe(25);
    expect(stats.sequences).toHaveLength(2);
  });

  it('sem quebras: uma sequência só, desde o início', () => {
    expect(
      getStreakStats({ startedAt: new Date(2026, 10, 26, 8), eventDayKeys: [], now: NOW }),
    ).toEqual({
      current: 0,
      longest: 0,
      sequences: [{ startDayKey: TODAY, endDayKey: null, days: 0 }],
    });
  });
});

describe('check-ins e emergência', () => {
  it('check-ins respondidos, por resposta', () => {
    expect(summarizeCheckIns(['no_relapse', 'relapse', 'no_relapse'])).toEqual({
      total: 3,
      noRelapse: 2,
      relapse: 1,
    });
  });

  it('emergência: vezes, de onde e vitórias ("passou")', () => {
    expect(
      summarizeEmergency([
        { source: 'home', outcome: 'passed' },
        { source: 'interruption', outcome: 'not_passed' },
        { source: 'home', outcome: 'abandoned' },
        { source: 'notification', outcome: null },
      ]),
    ).toEqual({
      total: 4,
      bySource: { home: 2, interruption: 1, notification: 1 },
      victories: 1,
    });
  });
});

describe('horas e minutos', () => {
  it('separa e arredonda', () => {
    expect(splitMinutes(125)).toEqual({ hours: 2, minutes: 5 });
    expect(splitMinutes(59.6)).toEqual({ hours: 1, minutes: 0 });
    expect(splitMinutes(-3)).toEqual({ hours: 0, minutes: 0 });
  });
});
