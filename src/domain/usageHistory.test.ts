import { buildHourlyRows, interruptionSecondsByHour } from './usageHistory';

// Fuso fixado em America/Sao_Paulo pelo jest.global-setup.js.
const at = (hour: number, minute: number, second = 0) =>
  new Date(2026, 10, 20, hour, minute, second);
const hours = (pairs: Record<number, number>) =>
  Array.from({ length: 24 }, (_, hour) => pairs[hour] ?? 0);

const DAY = {
  dayKey: '2026-11-20',
  apps: {
    'com.example.clips': hours({ 9: 1200, 10: 600 }),
    'com.example.feed': hours({ 22: 300 }),
    'com.example.other': hours({ 8: 900 }),
  },
};

describe('desconto das telas de interrupção', () => {
  it('divide a tela pelas horas locais', () => {
    expect(
      interruptionSecondsByHour('2026-11-20', 'com.example.clips', [
        { appPackage: 'com.example.clips', shownAt: at(9, 59), respondedAt: at(10, 1, 30) },
      ]),
    ).toEqual(hours({ 9: 60, 10: 90 }));
  });

  it('só do app da tela, só com resposta e só no dia', () => {
    expect(
      interruptionSecondsByHour('2026-11-20', 'com.example.clips', [
        { appPackage: 'com.example.feed', shownAt: at(9, 0), respondedAt: at(9, 5) },
        { appPackage: 'com.example.clips', shownAt: at(9, 0), respondedAt: null },
        {
          appPackage: 'com.example.clips',
          shownAt: new Date(2026, 10, 19, 23, 59),
          respondedAt: at(0, 1),
        },
      ]),
    ).toEqual(hours({ 0: 60 }));
  });
});

describe('linhas por hora', () => {
  it('só os apps de cada compulsão, sem horas vazias, e um app em duas compulsões conta nas duas', () => {
    expect(
      buildHourlyRows(
        DAY,
        [
          { compulsionId: 2, appPackages: ['com.example.feed', 'com.example.clips'] },
          { compulsionId: 3, appPackages: ['com.example.feed'] },
        ],
        [],
      ),
    ).toEqual([
      {
        dayKey: '2026-11-20',
        hour: 9,
        compulsionId: 2,
        appPackage: 'com.example.clips',
        seconds: 1200,
      },
      {
        dayKey: '2026-11-20',
        hour: 10,
        compulsionId: 2,
        appPackage: 'com.example.clips',
        seconds: 600,
      },
      {
        dayKey: '2026-11-20',
        hour: 22,
        compulsionId: 2,
        appPackage: 'com.example.feed',
        seconds: 300,
      },
      {
        dayKey: '2026-11-20',
        hour: 22,
        compulsionId: 3,
        appPackage: 'com.example.feed',
        seconds: 300,
      },
    ]);
  });

  it('desconta a tela de interrupção e nunca fica negativo', () => {
    const rows = buildHourlyRows(
      DAY,
      [{ compulsionId: 2, appPackages: ['com.example.clips'] }],
      [
        { appPackage: 'com.example.clips', shownAt: at(9, 10), respondedAt: at(9, 12) },
        // Tela maior que o uso da hora: a hora some, não fica negativa.
        { appPackage: 'com.example.clips', shownAt: at(10, 0), respondedAt: at(10, 30) },
      ],
    );
    expect(rows).toEqual([
      {
        dayKey: '2026-11-20',
        hour: 9,
        compulsionId: 2,
        appPackage: 'com.example.clips',
        seconds: 1080,
      },
    ]);
  });

  it('app sem uso no dia não gera linha', () => {
    expect(
      buildHourlyRows(DAY, [{ compulsionId: 2, appPackages: ['com.example.unused'] }], []),
    ).toEqual([]);
  });
});
