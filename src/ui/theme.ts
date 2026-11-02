import { useColorScheme } from 'react-native';

import {
  colors,
  MIN_TOUCH_TARGET,
  radii,
  shadows,
  spacing,
  typography,
  type ColorScheme,
} from './tokens';

export type Theme = ReturnType<typeof getTheme>;

/** Tema completo para um esquema de cores; puro, para testes. */
export function getTheme(scheme: ColorScheme) {
  return {
    scheme,
    colors: colors[scheme],
    shadows: shadows[scheme],
    spacing,
    radii,
    typography,
    minTouchTarget: MIN_TOUCH_TARGET,
  };
}

/** Tema que segue o claro/escuro do sistema (spec 01, seção 4.9). */
export function useTheme(): Theme {
  return getTheme(useColorScheme() === 'dark' ? 'dark' : 'light');
}
