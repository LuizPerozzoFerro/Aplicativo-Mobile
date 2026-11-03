import {
  ALL_DAY,
  MINUTES_PER_DAY,
  PRESET_TIME_RANGES,
  addTimeRange,
  formatMinutes,
  formatTimeRange,
  isPresetTimeRange,
  isWithinTimeRange,
  mergeTimeRanges,
  parseTimeRange,
  type TimeRange,
} from './timeRange';

// Fuso fixado em America/Sao_Paulo pelo jest.global-setup.js.
const at = (hour: number, minute = 0) => new Date(2026, 2, 15, hour, minute);
const range = (value: string): TimeRange => {
  const parsed = parseTimeRange(value);
  if (!parsed) throw new Error(`faixa inválida no teste: ${value}`);
  return parsed;
};
const merged = (...values: string[]) => {
  const result = mergeTimeRanges(values.map(range));
  return result === ALL_DAY ? result : result.map(formatTimeRange);
};

describe('parse e formato', () => {
  it('lê HH:MM-HH:MM, inclusive atravessando a meia-noite', () => {
    expect(parseTimeRange('08:00-10:00')).toEqual({ start: 480, end: 600 });
    expect(parseTimeRange('22:00-00:00')).toEqual({ start: 1320, end: 0 });
    expect(parseTimeRange('23:30-01:00')).toEqual({ start: 1410, end: 60 });
  });

  it.each([
    '',
    '22:00-22:00',
    '24:00-01:00',
    '22:60-23:00',
    '9:00-10:00',
    '22:00 - 23:00',
    '22:00-23:00-01:00',
    '22h-23h',
  ])('recusa %p', (value) => {
    expect(parseTimeRange(value)).toBeNull();
  });

  it('formata de volta no formato do banco', () => {
    for (const value of ['00:00-02:00', '22:00-00:00', '23:30-01:00', '07:05-07:10']) {
      expect(formatTimeRange(range(value))).toBe(value);
    }
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(1439)).toBe('23:59');
  });

  it('não formata faixa inválida', () => {
    expect(() => formatTimeRange({ start: 60, end: 60 })).toThrow(RangeError);
    expect(() => formatTimeRange({ start: 0, end: MINUTES_PER_DAY })).toThrow(RangeError);
  });
});

describe('faixas fixas de 2 horas', () => {
  it('são 12, de 00:00-02:00 a 22:00-00:00', () => {
    expect(PRESET_TIME_RANGES.map(formatTimeRange)).toEqual([
      '00:00-02:00',
      '02:00-04:00',
      '04:00-06:00',
      '06:00-08:00',
      '08:00-10:00',
      '10:00-12:00',
      '12:00-14:00',
      '14:00-16:00',
      '16:00-18:00',
      '18:00-20:00',
      '20:00-22:00',
      '22:00-00:00',
    ]);
  });

  it('cada minuto do dia cai em exatamente uma', () => {
    for (let minute = 0; minute < MINUTES_PER_DAY; minute++) {
      const date = at(Math.floor(minute / 60), minute % 60);
      expect(PRESET_TIME_RANGES.filter((preset) => isWithinTimeRange(preset, date))).toHaveLength(
        1,
      );
    }
  });
});

describe('está dentro da faixa?', () => {
  it('início incluso, fim excluso', () => {
    const morning = range('08:00-10:00');
    expect(isWithinTimeRange(morning, at(8, 0))).toBe(true);
    expect(isWithinTimeRange(morning, at(9, 59))).toBe(true);
    expect(isWithinTimeRange(morning, at(10, 0))).toBe(false);
    expect(isWithinTimeRange(morning, at(7, 59))).toBe(false);
  });

  it('atravessando a meia-noite', () => {
    const night = range('23:30-01:00');
    expect(isWithinTimeRange(night, at(23, 30))).toBe(true);
    expect(isWithinTimeRange(night, at(0, 0))).toBe(true);
    expect(isWithinTimeRange(night, at(0, 59))).toBe(true);
    expect(isWithinTimeRange(night, at(1, 0))).toBe(false);
    expect(isWithinTimeRange(night, at(23, 29))).toBe(false);
    expect(isWithinTimeRange(night, at(12, 0))).toBe(false);
  });

  it('terminando à meia-noite', () => {
    const lastHours = range('22:00-00:00');
    expect(isWithinTimeRange(lastHours, at(23, 59))).toBe(true);
    expect(isWithinTimeRange(lastHours, at(0, 0))).toBe(false);
    expect(isWithinTimeRange(lastHours, at(21, 59))).toBe(false);
  });

  it('no dia que começou à 01:00 (horário de verão), o primeiro instante está em 00:00-02:00', () => {
    const firstInstant = new Date(2018, 10, 4, 0, 0); // vira 01:00: a meia-noite não existiu
    expect(firstInstant.getHours()).toBe(1);
    expect(isWithinTimeRange(range('00:00-02:00'), firstInstant)).toBe(true);
    expect(isWithinTimeRange(range('23:30-01:00'), firstInstant)).toBe(false);
  });
});

describe('seleção sem duplicata', () => {
  it('faixa personalizada igual a uma fixa não entra de novo', () => {
    const selected = [range('22:00-00:00')];
    expect(addTimeRange(selected, { start: 1320, end: 0 })).toEqual(selected);
    expect(isPresetTimeRange(range('22:00-00:00'))).toBe(true);
    expect(isPresetTimeRange(range('23:30-01:00'))).toBe(false);
  });

  it('faixa nova entra no fim', () => {
    expect(addTimeRange([range('20:00-22:00')], range('23:30-01:00')).map(formatTimeRange)).toEqual(
      ['20:00-22:00', '23:30-01:00'],
    );
  });

  it('recusa faixa inválida', () => {
    expect(() => addTimeRange([], { start: 600, end: 600 })).toThrow(RangeError);
  });
});

describe('faixas unidas no resumo', () => {
  it('exemplo da spec: 20h–22h, 22h–24h e 23:30–01:00 viram 20h–01h', () => {
    expect(merged('20:00-22:00', '22:00-00:00', '23:30-01:00')).toEqual(['20:00-01:00']);
  });

  it('vizinhas se juntam; separadas ficam em ordem de início', () => {
    expect(merged('14:00-16:00', '08:00-10:00', '10:00-12:00')).toEqual([
      '08:00-12:00',
      '14:00-16:00',
    ]);
  });

  it('sobrepostas e repetidas viram uma só', () => {
    expect(merged('08:00-10:00', '09:00-09:30', '08:00-10:00', '09:30-11:15')).toEqual([
      '08:00-11:15',
    ]);
  });

  it('a última e a primeira faixa fixas se juntam através da meia-noite', () => {
    expect(merged('00:00-02:00', '22:00-00:00')).toEqual(['22:00-02:00']);
  });

  it('faixa que atravessa a meia-noite sozinha continua igual', () => {
    expect(merged('23:00-01:00')).toEqual(['23:00-01:00']);
    expect(merged('01:00-00:30')).toEqual(['01:00-00:30']);
  });

  it('todas as faixas fixas cobrem o dia todo', () => {
    expect(mergeTimeRanges(PRESET_TIME_RANGES)).toBe(ALL_DAY);
    expect(merged('00:30-01:00', '01:00-00:30')).toBe(ALL_DAY);
  });

  it('todas menos uma viram uma faixa só, atravessando a meia-noite', () => {
    const allButTenToNoon = PRESET_TIME_RANGES.filter((preset) => preset.start !== 600);
    expect(mergeTimeRanges(allButTenToNoon)).toEqual([{ start: 720, end: 600 }]);
  });

  it('sem faixas, resumo vazio', () => {
    expect(mergeTimeRanges([])).toEqual([]);
  });
});
