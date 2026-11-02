import type { TextStyle } from 'react-native';

export { colors, type ColorScheme, type ColorTokens } from './colors';

// Espaçamentos em dp, em escala de 4.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

/** Área de toque mínima, em dp (diretriz de acessibilidade do Android). */
export const MIN_TOUCH_TARGET = 48;

// Fonte do sistema. Os tamanhos acompanham a fonte escolhida pelo usuário no
// aparelho (allowFontScaling fica ligado em todo o app).
export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

// Sombras pelo boxShadow (RN 0.76+). No tema escuro a separação vem da cor da
// superfície, então a sombra é mais fraca.
export const shadows = {
  light: { card: '0px 1px 3px rgba(19, 33, 42, 0.12)' },
  dark: { card: '0px 1px 3px rgba(0, 0, 0, 0.4)' },
} as const;
