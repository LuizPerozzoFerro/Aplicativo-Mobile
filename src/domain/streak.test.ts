import { addCalendarDays } from './day';
import {
  MAX_DAYS_ALREADY_WITHOUT_RELAPSE,
  MILESTONE_DAYS,
  getAbstinenceStart,
  getNextMilestone,
  getStreakBase,
  getStreakDays,
  isValidDaysAlreadyWithoutRelapse,
} from './streak';

// Fuso fixado em America/Sao_Paulo pelo jest.global-setup.js. Datas em horário
// local: `local(2026, 3, 15, 21)` é 15/03/2026 às 21:00 em São Paulo.
const local = (year: number, month: number, day: number, hour = 12, minute = 0, second = 0) =>
  new Date(year, month - 1, day, hour, minute, second);

const now = local(2026, 3, 15, 21);
const abstinence = (startedAt: Date, eventDayKeys: string[] = [], at = now) =>
  getStreakDays('abstinence', { startedAt, eventDayKeys, now: at });
const moderation = (startedAt: Date, eventDayKeys: string[] = [], at = now) =>
  getStreakDays('moderation', { startedAt, eventDayKeys, now: at });

describe('abstinência', () => {
  it('"Estou começando hoje": 0 dias no dia do início, 1 no dia seguinte', () => {
    const start = getAbstinenceStart(local(2026, 3, 15, 9), 0);
    expect(abstinence(start)).toBe(0);
    expect(abstinence(start, [], local(2026, 3, 16, 0, 0))).toBe(1);
  });

  it('"Estou sem recair há N dias": começa com N', () => {
    const start = getAbstinenceStart(now, 12);
    expect(start).toEqual(local(2026, 3, 3, 0));
    expect(abstinence(start)).toBe(12);
  });

  it('o horário do início não importa, só o dia', () => {
    expect(abstinence(local(2026, 3, 10, 23, 59))).toBe(5);
    expect(abstinence(local(2026, 3, 10, 0, 0))).toBe(5);
  });

  it('dias sem check-in não mudam a streak', () => {
    expect(abstinence(local(2026, 2, 13))).toBe(30);
  });

  it('recaída hoje zera; recaída ontem deixa 1', () => {
    const start = local(2026, 3, 1);
    expect(abstinence(start, ['2026-03-15'])).toBe(0);
    expect(abstinence(start, ['2026-03-14'])).toBe(1);
  });

  it('conta a partir da recaída mais recente, em qualquer ordem', () => {
    expect(abstinence(local(2026, 1, 1), ['2026-03-10', '2026-02-01', '2026-03-12'])).toBe(3);
  });

  it('desfazer a recaída de hoje devolve a streak anterior', () => {
    const start = local(2026, 3, 1);
    expect(abstinence(start, ['2026-03-05', '2026-03-15'])).toBe(0);
    expect(abstinence(start, ['2026-03-05'])).toBe(10);
  });

  it('recaída antes do início não conta', () => {
    expect(abstinence(local(2026, 3, 10), ['2026-03-01'])).toBe(5);
  });

  it('ignora recaída no futuro e chave inválida', () => {
    expect(abstinence(local(2026, 3, 10), ['2026-03-16', '2026-02-30', 'ontem'])).toBe(5);
  });

  it('início no futuro dá 0, nunca negativo', () => {
    expect(abstinence(local(2026, 3, 20))).toBe(0);
  });

  it('a base é o dia da recaída', () => {
    expect(
      getStreakBase('abstinence', {
        startedAt: local(2026, 3, 1),
        eventDayKeys: ['2026-03-14'],
        now,
      }),
    ).toEqual(local(2026, 3, 14, 0));
  });
});

describe('moderação', () => {
  it('sem dia reprovado, conta desde o início', () => {
    expect(moderation(local(2026, 3, 15, 8))).toBe(0);
    expect(moderation(local(2026, 3, 8))).toBe(7);
  });

  it('hoje reprovado: 0', () => {
    expect(moderation(local(2026, 3, 1), ['2026-03-15'])).toBe(0);
  });

  it('ontem reprovado: a streak recomeça hoje, com 0', () => {
    expect(moderation(local(2026, 3, 1), ['2026-03-14'])).toBe(0);
    expect(
      getStreakBase('moderation', {
        startedAt: local(2026, 3, 1),
        eventDayKeys: ['2026-03-14'],
        now,
      }),
    ).toEqual(local(2026, 3, 15, 0));
  });

  it('reprovado há 3 dias: 2 dias aprovados desde então', () => {
    expect(moderation(local(2026, 3, 1), ['2026-03-12'])).toBe(2);
  });

  it('dia reprovado antes do início não conta', () => {
    expect(moderation(local(2026, 3, 10), ['2026-03-01'])).toBe(5);
  });

  it('dia reprovado no futuro é ignorado', () => {
    expect(moderation(local(2026, 3, 10), ['2026-03-20'])).toBe(5);
  });
});

describe('virada do dia', () => {
  it('23:59:59 ainda é o dia do início; 00:00 já é o dia 1', () => {
    const start = local(2026, 3, 15, 8);
    expect(abstinence(start, [], local(2026, 3, 15, 23, 59, 59))).toBe(0);
    expect(abstinence(start, [], local(2026, 3, 16, 0, 0, 0))).toBe(1);
  });

  it('vira o mês e o ano', () => {
    expect(abstinence(local(2026, 12, 31, 22), [], local(2027, 1, 1, 0, 30))).toBe(1);
    expect(moderation(local(2026, 2, 27), ['2026-02-28'], local(2026, 3, 2))).toBe(1);
  });
});

describe('horário de verão (São Paulo, troca à meia-noite)', () => {
  it('atravessa o dia de 23 horas (04/11/2018) sem perder um dia', () => {
    expect(abstinence(local(2018, 11, 3, 20), [], local(2018, 11, 5, 10))).toBe(2);
  });

  it('recaída no dia que começou à 01:00 conta a partir desse dia', () => {
    // Em 04/11/2018 a meia-noite não existiu: o primeiro instante é 01:00.
    const start = local(2018, 10, 1);
    expect(abstinence(start, ['2018-11-04'], local(2018, 11, 4, 1, 0))).toBe(0);
    expect(abstinence(start, ['2018-11-04'], local(2018, 11, 4, 23, 59))).toBe(0);
    expect(abstinence(start, ['2018-11-04'], local(2018, 11, 5, 0, 0))).toBe(1);
  });

  it('atravessa o dia de 25 horas (16/02/2019) sem contar um dia a mais', () => {
    expect(moderation(local(2019, 2, 16, 8), [], local(2019, 2, 16, 23, 30))).toBe(0);
    expect(moderation(local(2019, 2, 16, 8), [], local(2019, 2, 17, 0, 10))).toBe(1);
  });

  it('"há N dias" atravessando só o início do horário de verão não cai um dia antes', () => {
    // Com "N × 24 h" a partir de 10/11/2018, a hora que faltou em 04/11 levaria a 30/10.
    const start = getAbstinenceStart(local(2018, 11, 10, 9), 10);
    expect(start).toEqual(local(2018, 10, 31, 0));
    expect(abstinence(start, [], local(2018, 11, 10, 9))).toBe(10);
  });

  it('"há N dias" atravessando as duas trocas dá o dia de calendário certo', () => {
    // De 01/03/2019 voltando 120 dias: 01/11/2018.
    const start = getAbstinenceStart(local(2019, 3, 1, 9), 120);
    expect(start).toEqual(local(2018, 11, 1, 0));
    expect(abstinence(start, [], local(2019, 3, 1, 9))).toBe(120);
  });
});

describe('próximo marco', () => {
  it('é o primeiro marco maior que a streak', () => {
    expect(getNextMilestone(0)).toBe(1);
    expect(getNextMilestone(1)).toBe(3);
    expect(getNextMilestone(2)).toBe(3);
    expect(getNextMilestone(12)).toBe(14);
    expect(getNextMilestone(364)).toBe(365);
  });

  it('depois de 365 dias não há próximo', () => {
    expect(getNextMilestone(365)).toBeNull();
    expect(getNextMilestone(1000)).toBeNull();
  });

  it('a lista provisória está em ordem crescente', () => {
    expect(MILESTONE_DAYS).toEqual([1, 3, 7, 14, 30, 60, 90, 180, 365]);
  });
});

describe('início da abstinência no onboarding', () => {
  it('aceita N inteiro de 1 a 3650', () => {
    expect(isValidDaysAlreadyWithoutRelapse(1)).toBe(true);
    expect(isValidDaysAlreadyWithoutRelapse(MAX_DAYS_ALREADY_WITHOUT_RELAPSE)).toBe(true);
    expect(isValidDaysAlreadyWithoutRelapse(0)).toBe(false);
    expect(isValidDaysAlreadyWithoutRelapse(3651)).toBe(false);
    expect(isValidDaysAlreadyWithoutRelapse(2.5)).toBe(false);
    expect(isValidDaysAlreadyWithoutRelapse(Number.NaN)).toBe(false);
  });

  it('recusa N fora do intervalo', () => {
    expect(() => getAbstinenceStart(now, 3651)).toThrow(RangeError);
    expect(() => getAbstinenceStart(now, -1)).toThrow(RangeError);
    expect(() => getAbstinenceStart(now, 1.5)).toThrow(RangeError);
  });

  it('conta do dia do "Começar", não do dia em que a etapa foi respondida', () => {
    // Respondeu "há 5 dias" em 13/03 e tocou em "Começar" em 15/03.
    const start = getAbstinenceStart(local(2026, 3, 15, 10), 5);
    expect(start).toEqual(addCalendarDays(local(2026, 3, 15), -5));
    expect(abstinence(start)).toBe(5);
  });
});
