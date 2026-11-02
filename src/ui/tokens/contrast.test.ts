import { colors, type ColorScheme } from './colors';
import { contrastRatio } from './contrast';

const SCHEMES: ColorScheme[] = ['light', 'dark'];

// Pares usados pelos componentes: [frente, fundo, mínimo WCAG].
const TEXT = 4.5;
const UI = 3;
const PAIRS = [
  ['text', 'background', TEXT],
  ['text', 'surface', TEXT],
  ['text', 'surfaceMuted', TEXT],
  ['textMuted', 'background', TEXT],
  ['textMuted', 'surface', TEXT],
  ['textMuted', 'surfaceMuted', TEXT],
  ['danger', 'background', TEXT], // texto de erro
  ['danger', 'surface', TEXT],
  ['primary', 'background', TEXT], // botão de texto
  ['primary', 'surface', TEXT],
  ['onPrimary', 'primary', TEXT], // botão principal
  ['onDanger', 'danger', TEXT],
  ['outline', 'surface', UI], // contorno do botão secundário
  ['outline', 'background', UI],
] as const;

describe('contrastRatio', () => {
  it('dá 21:1 entre preto e branco e 1:1 entre cores iguais', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#3F5A66', '#3F5A66')).toBeCloseTo(1, 5);
  });

  it('é simétrica', () => {
    expect(contrastRatio('#13212A', '#F5F7F8')).toBeCloseTo(contrastRatio('#F5F7F8', '#13212A'));
  });
});

describe.each(SCHEMES)('contraste da paleta no tema %s', (scheme) => {
  it.each(PAIRS)('%s sobre %s tem pelo menos %p:1', (foreground, background, minimum) => {
    const palette = colors[scheme];
    expect(contrastRatio(palette[foreground], palette[background])).toBeGreaterThanOrEqual(minimum);
  });
});
