import { getPreventiveStartMinutes, MAX_PREVENTIVE_NOTIFICATIONS_PER_DAY } from './monitoring';
import { parseTimeRange, type TimeRange } from './timeRange';

const ranges = (...values: string[]): TimeRange[] =>
  values.map((value) => {
    const range = parseTimeRange(value);
    if (!range) throw new Error(`faixa inválida no teste: ${value}`);
    return range;
  });

describe('getPreventiveStartMinutes', () => {
  it('uma preventiva no início de cada faixa', () => {
    expect(getPreventiveStartMinutes(ranges('08:00-10:00', '20:00-22:00'))).toEqual([
      8 * 60,
      20 * 60,
    ]);
  });

  it('faixas vizinhas e sobrepostas viram uma, inclusive pela meia-noite', () => {
    // O exemplo do resumo da Fase 3: tudo vira 20h–01h.
    expect(getPreventiveStartMinutes(ranges('20:00-22:00', '22:00-00:00', '23:30-01:00'))).toEqual([
      20 * 60,
    ]);
  });

  it('ordena pelo horário, não pela ordem em que foram marcadas', () => {
    expect(getPreventiveStartMinutes(ranges('22:00-23:00', '06:00-07:00'))).toEqual([
      6 * 60,
      22 * 60,
    ]);
  });

  it('com mais de 4 faixas, valem as 4 primeiras do dia', () => {
    const result = getPreventiveStartMinutes(
      ranges('18:00-19:00', '06:00-07:00', '10:00-11:00', '14:00-15:00', '08:00-09:00'),
    );
    expect(result).toEqual([6 * 60, 8 * 60, 10 * 60, 14 * 60]);
    expect(result).toHaveLength(MAX_PREVENTIVE_NOTIFICATIONS_PER_DAY);
  });

  it('faixas cobrindo o dia todo não têm início: nenhuma preventiva', () => {
    expect(getPreventiveStartMinutes(ranges('00:00-12:00', '12:00-00:00'))).toEqual([]);
  });

  it('sem faixas, nenhuma preventiva', () => {
    expect(getPreventiveStartMinutes([])).toEqual([]);
  });
});
