import {
  BREATH_EXHALE_MS,
  BREATH_INHALE_MS,
  EMERGENCY_BREATHING_MS,
  EMERGENCY_WAIT_MS,
  formatCountdown,
  getBreathingPhase,
  getRemainingSeconds,
  parseEmergencySource,
} from './emergency';

describe('tempos da emergência (doc 01, 6.7)', () => {
  it('1 minuto de respiração e 5 minutos de cronômetro', () => {
    expect(EMERGENCY_BREATHING_MS).toBe(60_000);
    expect(EMERGENCY_WAIT_MS).toBe(300_000);
  });

  it('o minuto da respiração fecha em ciclos completos', () => {
    expect(EMERGENCY_BREATHING_MS % (BREATH_INHALE_MS + BREATH_EXHALE_MS)).toBe(0);
  });
});

describe('getBreathingPhase', () => {
  it('começa inspirando', () => {
    expect(getBreathingPhase(0)).toEqual({ kind: 'inhale', cycle: 0, remainingMs: 4_000 });
  });

  it('troca para soltar o ar exatamente ao fim da inspiração', () => {
    expect(getBreathingPhase(3_999).kind).toBe('inhale');
    expect(getBreathingPhase(4_000)).toEqual({ kind: 'exhale', cycle: 0, remainingMs: 6_000 });
  });

  it('recomeça no ciclo seguinte', () => {
    expect(getBreathingPhase(9_999)).toEqual({ kind: 'exhale', cycle: 0, remainingMs: 1 });
    expect(getBreathingPhase(10_000)).toEqual({ kind: 'inhale', cycle: 1, remainingMs: 4_000 });
    expect(getBreathingPhase(55_000)).toEqual({ kind: 'exhale', cycle: 5, remainingMs: 5_000 });
  });

  it('relógio que andou para trás não dá fase negativa', () => {
    expect(getBreathingPhase(-5_000)).toEqual({ kind: 'inhale', cycle: 0, remainingMs: 4_000 });
  });
});

describe('getRemainingSeconds', () => {
  it('arredonda para cima, para o zero só aparecer no fim', () => {
    expect(getRemainingSeconds(EMERGENCY_WAIT_MS, 0)).toBe(300);
    expect(getRemainingSeconds(EMERGENCY_WAIT_MS, 1)).toBe(300);
    expect(getRemainingSeconds(EMERGENCY_WAIT_MS, 299_001)).toBe(1);
    expect(getRemainingSeconds(EMERGENCY_WAIT_MS, 300_000)).toBe(0);
  });

  it('depois do fim e com o relógio para trás, fica dentro do intervalo', () => {
    expect(getRemainingSeconds(EMERGENCY_WAIT_MS, 900_000)).toBe(0);
    expect(getRemainingSeconds(EMERGENCY_WAIT_MS, -1_000)).toBe(300);
  });
});

describe('formatCountdown', () => {
  it.each([
    [300, '5:00'],
    [299, '4:59'],
    [65, '1:05'],
    [9, '0:09'],
    [0, '0:00'],
  ])('%i segundos vira %s', (seconds, text) => {
    expect(formatCountdown(seconds)).toBe(text);
  });
});

describe('parseEmergencySource', () => {
  it.each(['home', 'interruption', 'notification'])('aceita %s', (source) => {
    expect(parseEmergencySource(source)).toBe(source);
  });

  it.each([undefined, null, '', 'widget', ['notification'], 1])(
    'valor desconhecido (%j) conta como Início',
    (value) => {
      expect(parseEmergencySource(value)).toBe('home');
    },
  );
});
