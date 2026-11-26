import { computeBaseline, computeRecovered } from './baseline';

const usage = (minutes: Record<string, number>, extraCovered: string[] = []) => ({
  coveredDayKeys: new Set([...Object.keys(minutes), ...extraCovered]),
  minutesOn: (day: string) => minutes[day] ?? 0,
});

describe('ponto de partida', () => {
  it('com 3 ou mais dias com dados nos 7 antes do início: a média deles (before_start)', () => {
    expect(
      computeBaseline({
        startDayKey: '2026-11-20',
        historySinceDayKey: '2026-11-20',
        todayKey: '2026-11-20',
        ...usage({ '2026-11-13': 60, '2026-11-15': 90, '2026-11-19': 31, '2026-11-10': 500 }),
      }),
    ).toEqual({ status: 'ready', minutesPerDay: 60, source: 'before_start' });
  });

  it('dia com dados e uso zero conta na média', () => {
    expect(
      computeBaseline({
        startDayKey: '2026-11-20',
        historySinceDayKey: '2026-11-20',
        todayKey: '2026-11-20',
        ...usage({ '2026-11-17': 90, '2026-11-18': 90 }, ['2026-11-19']),
      }),
    ).toEqual({ status: 'ready', minutesPerDay: 60, source: 'before_start' });
  });

  it('com menos de 3: espera os 7 primeiros dias completos depois do início', () => {
    expect(
      computeBaseline({
        startDayKey: '2026-11-20',
        historySinceDayKey: '2026-11-20',
        todayKey: '2026-11-22',
        ...usage({ '2026-11-19': 40, '2026-11-21': 30 }),
      }),
    ).toEqual({ status: 'pending', availableFromDayKey: '2026-11-28' });
  });

  it('com os 7 dias completos (o do início fica fora): a média deles (first_week)', () => {
    const days: Record<string, number> = { '2026-11-20': 999 };
    for (let day = 21; day <= 27; day += 1) days[`2026-11-${day}`] = day === 27 ? 37 : 30;
    expect(
      computeBaseline({
        startDayKey: '2026-11-20',
        historySinceDayKey: '2026-11-20',
        todayKey: '2026-11-28',
        ...usage(days),
      }),
    ).toEqual({ status: 'ready', minutesPerDay: 31, source: 'first_week' });
  });

  it('dia sem dados (sem o acesso ao uso) é pulado, e o dia de hoje ainda não conta', () => {
    const days: Record<string, number> = {};
    for (const day of [21, 22, 24, 25, 26, 27, 28]) days[`2026-11-${day}`] = 20;
    expect(
      computeBaseline({
        startDayKey: '2026-11-20',
        historySinceDayKey: '2026-11-20',
        todayKey: '2026-11-28',
        ...usage(days),
      }),
    ).toEqual({ status: 'pending', availableFromDayKey: '2026-11-29' });
  });

  it('quem começou antes da Fase 5: a primeira semana depois da instalação', () => {
    expect(
      computeBaseline({
        startDayKey: '2026-11-01',
        historySinceDayKey: '2026-11-25',
        todayKey: '2026-11-25',
        // Dias de antes da instalação, lidos do Android, não entram na janela.
        ...usage({ '2026-11-20': 50, '2026-11-24': 50 }),
      }),
    ).toEqual({ status: 'pending', availableFromDayKey: '2026-12-03' });
  });
});

describe('tempo recuperado', () => {
  it('soma só os dias completos com histórico abaixo do ponto de partida', () => {
    expect(
      computeRecovered({
        baselineMinutesPerDay: 60,
        startDayKey: '2026-11-10',
        todayKey: '2026-11-25',
        ...usage({
          '2026-11-10': 0, // dia do início: fora
          '2026-11-11': 40, // 20
          '2026-11-12': 90, // acima: não desconta
          '2026-11-19': 30, // 30, na semana
          '2026-11-24': 50, // 10, na semana
          '2026-11-25': 0, // hoje: fora
        }),
      }),
    ).toEqual({ totalMinutes: 60, weekMinutes: 40 });
  });

  it('dia sem histórico não entra, nem como zero', () => {
    expect(
      computeRecovered({
        baselineMinutesPerDay: 60,
        startDayKey: '2026-11-10',
        todayKey: '2026-11-25',
        ...usage({}),
      }),
    ).toEqual({ totalMinutes: 0, weekMinutes: 0 });
  });
});
