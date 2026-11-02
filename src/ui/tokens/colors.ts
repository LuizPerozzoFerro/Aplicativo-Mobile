// Paleta provisória e neutra (spec 01, seção 4.9), derivada do azul-acinzentado
// do ícone. Troca-se aqui quando a identidade visual for definida; os
// componentes só usam os nomes semânticos abaixo, nunca um hexadecimal.

export type ColorScheme = 'light' | 'dark';

export type ColorTokens = {
  /** Fundo da tela. */
  background: string;
  /** Fundo de cartões e itens de lista. */
  surface: string;
  /** Fundo do botão secundário e áreas de destaque suave. */
  surfaceMuted: string;
  /** Texto principal. */
  text: string;
  /** Texto de apoio (descrições, legendas). */
  textMuted: string;
  /** Cor de ação: botão principal e texto de botão de texto. */
  primary: string;
  /** Texto sobre `primary`. */
  onPrimary: string;
  /** Divisórias decorativas, sem função de identificar controles. */
  divider: string;
  /** Contorno de controles interativos (precisa de contraste 3:1). */
  outline: string;
  danger: string;
  onDanger: string;
};

export const colors: Record<ColorScheme, ColorTokens> = {
  light: {
    background: '#F5F7F8',
    surface: '#FFFFFF',
    surfaceMuted: '#E6ECEF',
    text: '#13212A',
    textMuted: '#4B5B64',
    primary: '#2E5866',
    onPrimary: '#FFFFFF',
    divider: '#D5DDE1',
    outline: '#6E808A',
    danger: '#A3322B',
    onDanger: '#FFFFFF',
  },
  dark: {
    background: '#0E1518',
    surface: '#172126',
    surfaceMuted: '#22303A',
    text: '#E6EDF0',
    textMuted: '#A3B2B9',
    primary: '#8CC1D1',
    onPrimary: '#0E1518',
    divider: '#2A3A42',
    outline: '#7D929C',
    danger: '#F28B82',
    onDanger: '#0E1518',
  },
};
