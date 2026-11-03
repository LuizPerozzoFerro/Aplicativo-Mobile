import {
  EMOTIONS,
  WEEKDAYS,
  isShortcutSelected,
  isValidTriggerValue,
  toggleWeekdayShortcut,
} from './triggers';

describe('valores dos gatilhos', () => {
  it('as 6 emoções da spec', () => {
    expect(EMOTIONS).toEqual([
      'boredom',
      'loneliness',
      'stress',
      'anxiety',
      'tiredness',
      'sadness',
    ]);
  });

  it('dias da semana seguem Date.getDay(): domingo = 0', () => {
    expect(WEEKDAYS).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(new Date(2026, 2, 15).getDay()).toBe(0); // 15/03/2026 é domingo
  });

  it('valida o value conforme o kind', () => {
    expect(isValidTriggerValue('time', '23:30-01:00')).toBe(true);
    expect(isValidTriggerValue('time', '23:30-23:30')).toBe(false);
    expect(isValidTriggerValue('weekday', '0')).toBe(true);
    expect(isValidTriggerValue('weekday', '6')).toBe(true);
    expect(isValidTriggerValue('weekday', '7')).toBe(false);
    expect(isValidTriggerValue('weekday', '06')).toBe(false);
    expect(isValidTriggerValue('emotion', 'stress')).toBe(true);
    expect(isValidTriggerValue('emotion', 'Stress')).toBe(false);
    expect(isValidTriggerValue('emotion', '')).toBe(false);
  });
});

describe('atalhos de dias', () => {
  it('"Dias úteis" marca segunda a sexta sem mexer no resto', () => {
    expect(toggleWeekdayShortcut([0], 'workdays')).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('"Fim de semana" marca sábado e domingo', () => {
    expect(toggleWeekdayShortcut([3], 'weekend')).toEqual([0, 3, 6]);
  });

  it('completa um atalho marcado pela metade', () => {
    expect(toggleWeekdayShortcut([6], 'weekend')).toEqual([0, 6]);
    expect(isShortcutSelected([6], 'weekend')).toBe(false);
  });

  it('com o atalho todo marcado, o toque desmarca só os dias dele', () => {
    expect(isShortcutSelected([0, 3, 6], 'weekend')).toBe(true);
    expect(toggleWeekdayShortcut([0, 3, 6], 'weekend')).toEqual([3]);
    expect(toggleWeekdayShortcut([0, 1, 2, 3, 4, 5, 6], 'workdays')).toEqual([0, 6]);
  });

  it('não duplica dias', () => {
    expect(toggleWeekdayShortcut([1, 1, 2], 'workdays')).toEqual([1, 2, 3, 4, 5]);
  });
});
