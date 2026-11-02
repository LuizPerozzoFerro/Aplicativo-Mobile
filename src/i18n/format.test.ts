import '@/i18n';

import { formatDate, formatNumber, formatTime } from './format';

// 2 de março de 2026, 14:05, no fuso local do processo de teste.
const DATE = new Date(2026, 2, 2, 14, 5);

describe('formatação no idioma ativo (pt-BR)', () => {
  it('formata datas por extenso', () => {
    expect(formatDate(DATE)).toBe('2 de março de 2026');
  });

  it('aceita outras opções de data', () => {
    expect(formatDate(DATE, { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe(
      '02/03/2026',
    );
  });

  it('formata horas no formato de 24 horas', () => {
    expect(formatTime(DATE)).toBe('14:05');
  });

  it('formata números com vírgula decimal e ponto de milhar', () => {
    expect(formatNumber(1234.5)).toBe('1.234,5');
    expect(formatNumber(0.256, { style: 'percent' })).toBe('26%');
  });

  it('respeita um idioma passado explicitamente', () => {
    expect(formatNumber(1234.5, {}, 'en-US')).toBe('1,234.5');
  });
});
