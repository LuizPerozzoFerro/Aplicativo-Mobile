import { getRestartDayKeys, type RestartInput } from './restart';

// Fuso de São Paulo (jest.global-setup.js). 08/11/2026, 10:00 local.
const NOW = new Date('2026-11-08T13:00:00.000Z');
const LONG_AGO = new Date('2026-10-01T13:00:00.000Z');
const TODAY = '2026-11-08';
const YESTERDAY = '2026-11-07';
const TOMORROW = '2026-11-09';

const sameDay = (dayKey: string) => ({ dayKey, recordedOnDayKey: dayKey });
const input = (...breaks: RestartInput['breaks']): RestartInput => ({
  startedAt: LONG_AGO,
  breaks,
});

describe('getRestartDayKeys', () => {
  it('quebra hoje: recomeço amanhã', () => {
    expect(getRestartDayKeys([input(sameDay(TODAY))], NOW)).toEqual([TOMORROW]);
  });

  it('quebra ontem, registrada ontem: recomeço hoje', () => {
    expect(getRestartDayKeys([input(sameDay(YESTERDAY))], NOW)).toEqual([TODAY]);
  });

  it('recaída registrada hoje para ontem: sem recomeço', () => {
    expect(getRestartDayKeys([input({ dayKey: YESTERDAY, recordedOnDayKey: TODAY })], NOW)).toEqual(
      [],
    );
  });

  it('sem streak a perder (começou no dia da quebra): sem recomeço', () => {
    expect(getRestartDayKeys([{ startedAt: NOW, breaks: [sameDay(TODAY)] }], NOW)).toEqual([]);
  });

  it('quebra anterior na véspera: streak de 1 dia ainda gera recomeço', () => {
    expect(getRestartDayKeys([input(sameDay(YESTERDAY), sameDay(TODAY))], NOW)).toEqual([
      TODAY,
      TOMORROW,
    ]);
  });

  it('quebras antigas não geram nada', () => {
    expect(getRestartDayKeys([input(sameDay('2026-11-01'))], NOW)).toEqual([]);
  });

  it('sem quebra (ou desfeita): nada', () => {
    expect(getRestartDayKeys([input()], NOW)).toEqual([]);
  });

  it('quebra nas duas compulsões no mesmo dia: um dia só', () => {
    expect(getRestartDayKeys([input(sameDay(TODAY)), input(sameDay(TODAY))], NOW)).toEqual([
      TOMORROW,
    ]);
  });
});
