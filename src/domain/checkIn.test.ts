import {
  DEFAULT_CHECK_IN_MINUTES,
  canUndo,
  getRelapseDayKey,
  getRelapseDayOptions,
  getTodayCheckInStatus,
  isValidCheckInMinutes,
} from './checkIn';

// Fuso fixado em America/Sao_Paulo pelo jest.global-setup.js.
const local = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute);

describe('horário do check-in', () => {
  it('padrão às 21h', () => {
    expect(DEFAULT_CHECK_IN_MINUTES).toBe(1260);
  });

  it('aceita de 0 a 1439 minutos inteiros', () => {
    expect(isValidCheckInMinutes(0)).toBe(true);
    expect(isValidCheckInMinutes(1439)).toBe(true);
    expect(isValidCheckInMinutes(1440)).toBe(false);
    expect(isValidCheckInMinutes(-1)).toBe(false);
    expect(isValidCheckInMinutes(600.5)).toBe(false);
  });
});

describe('check-in de hoje', () => {
  const now = local(2026, 3, 15, 10);

  it('pendente sem check-in de hoje, mesmo antes do horário escolhido', () => {
    expect(getTodayCheckInStatus([], now)).toEqual({ state: 'pending' });
  });

  it('o check-in de ontem não vale para hoje', () => {
    expect(getTodayCheckInStatus([{ dayKey: '2026-03-14', answer: 'no_relapse' }], now)).toEqual({
      state: 'pending',
    });
  });

  it('mostra a resposta de hoje', () => {
    const checkIns = [
      { dayKey: '2026-03-14', answer: 'relapse' as const },
      { dayKey: '2026-03-15', answer: 'no_relapse' as const },
    ];
    expect(getTodayCheckInStatus(checkIns, now)).toEqual({
      state: 'answered',
      answer: 'no_relapse',
    });
  });

  it('à meia-noite o check-in de ontem volta a ser pendente', () => {
    const checkIns = [{ dayKey: '2026-03-15', answer: 'no_relapse' as const }];
    expect(getTodayCheckInStatus(checkIns, local(2026, 3, 15, 23, 59)).state).toBe('answered');
    expect(getTodayCheckInStatus(checkIns, local(2026, 3, 16, 0, 0)).state).toBe('pending');
  });
});

describe('dias oferecidos para registrar recaída', () => {
  const now = local(2026, 3, 15, 10);

  it('começou hoje: só "hoje"', () => {
    expect(getRelapseDayOptions(local(2026, 3, 15, 8), now)).toEqual(['today']);
  });

  it('começou ontem ou antes: "hoje" e "ontem"', () => {
    expect(getRelapseDayOptions(local(2026, 3, 14, 23, 59), now)).toEqual(['today', 'yesterday']);
    expect(getRelapseDayOptions(local(2026, 1, 1), now)).toEqual(['today', 'yesterday']);
  });

  it('logo depois da meia-noite, quem começou ontem já pode marcar "ontem"', () => {
    expect(getRelapseDayOptions(local(2026, 3, 15, 23), local(2026, 3, 16, 0, 1))).toEqual([
      'today',
      'yesterday',
    ]);
  });

  it('início no futuro: só "hoje"', () => {
    expect(getRelapseDayOptions(local(2026, 3, 20), now)).toEqual(['today']);
  });
});

describe('dia da recaída', () => {
  it('hoje e ontem como AAAA-MM-DD', () => {
    const now = local(2026, 3, 15, 10);
    expect(getRelapseDayKey('today', now)).toBe('2026-03-15');
    expect(getRelapseDayKey('yesterday', now)).toBe('2026-03-14');
  });

  it('ontem vira o mês e o ano', () => {
    expect(getRelapseDayKey('yesterday', local(2026, 3, 1, 0, 5))).toBe('2026-02-28');
    expect(getRelapseDayKey('yesterday', local(2027, 1, 1, 9))).toBe('2026-12-31');
  });

  it('no dia que começou à 01:00 (horário de verão), ontem é o dia anterior', () => {
    expect(getRelapseDayKey('today', local(2018, 11, 4, 1, 0))).toBe('2018-11-04');
    expect(getRelapseDayKey('yesterday', local(2018, 11, 4, 1, 0))).toBe('2018-11-03');
    expect(getRelapseDayKey('yesterday', local(2018, 11, 5, 0, 30))).toBe('2018-11-04');
  });
});

describe('desfazer', () => {
  it('vale para o que foi registrado hoje, até 23:59', () => {
    expect(canUndo(local(2026, 3, 15, 0, 0), local(2026, 3, 15, 23, 59))).toBe(true);
  });

  it('vale para uma recaída marcada para ontem, se registrada hoje', () => {
    // O dia da recaída (ontem) não importa: importa quando foi registrada.
    expect(canUndo(local(2026, 3, 15, 9), local(2026, 3, 15, 22))).toBe(true);
  });

  it('não vale para o que foi registrado em outro dia', () => {
    expect(canUndo(local(2026, 3, 14, 23, 59), local(2026, 3, 15, 0, 0))).toBe(false);
  });
});
