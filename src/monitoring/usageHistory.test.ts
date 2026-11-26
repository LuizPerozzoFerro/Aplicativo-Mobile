import { parseUsageHistory } from './usageHistory';

const hours = (hour: number, seconds: number) =>
  Array.from({ length: 24 }, (_, index) => (index === hour ? seconds : 0));

describe('parseUsageHistory', () => {
  it('lê os dias, em ordem, com os segundos por hora de cada app', () => {
    const json = JSON.stringify({
      today: '2026-11-25',
      days: [
        { dayKey: '2026-11-25', covered: true, apps: { 'com.example.clips': hours(9, 600) } },
        { dayKey: '2026-11-24', covered: false, apps: {} },
      ],
    });
    expect(parseUsageHistory(json)).toEqual({
      today: '2026-11-25',
      days: [
        { dayKey: '2026-11-24', covered: false, apps: {} },
        { dayKey: '2026-11-25', covered: true, apps: { 'com.example.clips': hours(9, 600) } },
      ],
    });
  });

  it('descarta o dia malformado e segue com os outros', () => {
    const json = JSON.stringify({
      today: '2026-11-25',
      days: [
        { dayKey: '2026-02-30', covered: true, apps: {} },
        { dayKey: '2026-11-23', covered: 'sim', apps: {} },
        { dayKey: '2026-11-22', covered: true, apps: { a: [1, 2, 3] } },
        { dayKey: '2026-11-21', covered: true, apps: { a: hours(1, 3601) } },
        { dayKey: '2026-11-20', covered: true, apps: {} },
      ],
    });
    expect(parseUsageHistory(json)?.days.map((day) => day.dayKey)).toEqual(['2026-11-20']);
  });

  it.each(['não é JSON', '[]', '{"today":"ontem","days":[]}', '{"today":"2026-11-25"}'])(
    'formato geral inválido (%s): nulo',
    (json) => {
      expect(parseUsageHistory(json)).toBeNull();
    },
  );
});
