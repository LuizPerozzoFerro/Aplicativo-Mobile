import {
  calendarDaysBetween,
  getDayBounds,
  isSameDay,
  startOfDay,
  startOfNextDay,
  toDayKey,
} from './day';

// Fuso fixado em America/Sao_Paulo pelo jest.global-setup.js. Instantes em UTC
// (sufixo Z) para não depender do fuso ao escrever o teste.
const at = (iso: string) => new Date(iso);
const HOUR = 60 * 60 * 1000;
const lengthInHours = (date: Date) => {
  const { start, end } = getDayBounds(date);
  return (end.getTime() - start.getTime()) / HOUR;
};

it('roda no fuso de São Paulo (se falhar, o global setup do Jest não foi aplicado)', () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Sao_Paulo');
});

describe('dia comum (UTC−3, sem horário de verão)', () => {
  // 15/03/2026, 12:00 em São Paulo.
  const noon = at('2026-03-15T15:00:00.000Z');

  it('começa à meia-noite local e termina na meia-noite seguinte', () => {
    expect(getDayBounds(noon)).toEqual({
      start: at('2026-03-15T03:00:00.000Z'),
      end: at('2026-03-16T03:00:00.000Z'),
    });
    expect(lengthInHours(noon)).toBe(24);
  });

  it('na virada da meia-noite, 23:59:59.999 é um dia e 00:00 já é o seguinte', () => {
    const lastInstant = at('2026-03-16T02:59:59.999Z');
    const midnight = at('2026-03-16T03:00:00.000Z');
    expect(toDayKey(lastInstant)).toBe('2026-03-15');
    expect(toDayKey(midnight)).toBe('2026-03-16');
    expect(isSameDay(lastInstant, midnight)).toBe(false);
    expect(isSameDay(noon, lastInstant)).toBe(true);
    expect(startOfNextDay(lastInstant)).toEqual(midnight);
    expect(startOfDay(midnight)).toEqual(midnight);
    expect(calendarDaysBetween(lastInstant, midnight)).toBe(1);
  });

  it('a meia-noite é o início do próprio dia, não o fim do anterior', () => {
    const midnight = at('2026-03-16T03:00:00.000Z');
    expect(getDayBounds(midnight).start).toEqual(midnight);
  });

  it('vira o mês e o ano', () => {
    const newYearsEve = at('2026-12-31T23:00:00.000Z'); // 31/12, 20:00
    expect(startOfNextDay(newYearsEve)).toEqual(at('2027-01-01T03:00:00.000Z'));
    expect(toDayKey(startOfNextDay(newYearsEve))).toBe('2027-01-01');
    expect(
      calendarDaysBetween(at('2026-02-28T15:00:00.000Z'), at('2026-03-01T15:00:00.000Z')),
    ).toBe(1);
  });
});

describe('início do horário de verão: a meia-noite não existe', () => {
  // 04/11/2018: às 00:00 (UTC−3) o relógio pulou para 01:00 (UTC−2).
  const dstStartDay = at('2018-11-04T15:00:00.000Z');

  it('o dia começa à 01:00 e tem 23 horas', () => {
    const { start, end } = getDayBounds(dstStartDay);
    expect(start).toEqual(at('2018-11-04T03:00:00.000Z'));
    expect(start.getHours()).toBe(1);
    expect(end).toEqual(at('2018-11-05T02:00:00.000Z'));
    expect(lengthInHours(dstStartDay)).toBe(23);
  });

  it('o último instante do dia anterior e o primeiro do dia novo ficam em dias diferentes', () => {
    const lastInstant = at('2018-11-04T02:59:59.999Z'); // 03/11, 23:59:59.999 (UTC−3)
    const firstInstant = at('2018-11-04T03:00:00.000Z'); // 04/11, 01:00 (UTC−2)
    expect(toDayKey(lastInstant)).toBe('2018-11-03');
    expect(toDayKey(firstInstant)).toBe('2018-11-04');
    expect(startOfNextDay(lastInstant)).toEqual(firstInstant);
  });

  it('a véspera termina no primeiro instante do dia novo', () => {
    expect(getDayBounds(at('2018-11-03T15:00:00.000Z')).end).toEqual(
      at('2018-11-04T03:00:00.000Z'),
    );
  });
});

describe('fim do horário de verão: a hora antes da meia-noite se repete', () => {
  // 17/02/2019: às 00:00 (UTC−2) o relógio voltou para 23:00 (UTC−3) do dia 16.
  const dstEndEve = at('2019-02-16T15:00:00.000Z');

  it('o dia 16 tem 25 horas e o dia 17 começa à meia-noite (UTC−3)', () => {
    expect(getDayBounds(dstEndEve)).toEqual({
      start: at('2019-02-16T02:00:00.000Z'),
      end: at('2019-02-17T03:00:00.000Z'),
    });
    expect(lengthInHours(dstEndEve)).toBe(25);
    expect(lengthInHours(at('2019-02-17T15:00:00.000Z'))).toBe(24);
  });

  it('as duas vezes 23:30 pertencem ao dia 16', () => {
    const first = at('2019-02-17T01:30:00.000Z'); // 23:30 (UTC−2)
    const second = at('2019-02-17T02:30:00.000Z'); // 23:30 de novo (UTC−3)
    expect(first.getHours()).toBe(23);
    expect(second.getHours()).toBe(23);
    expect(toDayKey(first)).toBe('2019-02-16');
    expect(toDayKey(second)).toBe('2019-02-16');
    expect(isSameDay(first, second)).toBe(true);
    expect(calendarDaysBetween(second, at('2019-02-17T03:10:00.000Z'))).toBe(1);
  });
});

describe('calendarDaysBetween', () => {
  it('conta dias de calendário mesmo atravessando o horário de verão', () => {
    // De 01/11/2018 a 01/03/2019: 120 dias, com as duas trocas no meio.
    expect(
      calendarDaysBetween(at('2018-11-01T15:00:00.000Z'), at('2019-03-01T15:00:00.000Z')),
    ).toBe(120);
  });

  it('é zero no mesmo dia e negativo para trás', () => {
    const morning = at('2026-03-15T10:00:00.000Z');
    const night = at('2026-03-16T02:00:00.000Z');
    expect(calendarDaysBetween(morning, night)).toBe(0);
    expect(calendarDaysBetween(night, at('2026-03-13T15:00:00.000Z'))).toBe(-2);
  });
});
