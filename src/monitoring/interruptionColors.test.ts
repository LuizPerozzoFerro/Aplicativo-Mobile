import fs from 'node:fs';
import path from 'node:path';

import { colors, type ColorScheme } from '@/ui/tokens/colors';

// A tela de interrupção é nativa: as cores ficam nos recursos do Android e
// precisam ser as mesmas do design system.
const RES = path.resolve(__dirname, '../../modules/monitoring-android/android/src/main/res');

const TOKENS = {
  quedo_interruption_background: 'background',
  quedo_interruption_text: 'text',
  quedo_interruption_text_muted: 'textMuted',
  quedo_interruption_primary: 'primary',
  quedo_interruption_on_primary: 'onPrimary',
  quedo_interruption_outline: 'outline',
  quedo_interruption_danger: 'danger',
} as const;

function readColors(dir: string): Record<string, string> {
  const xml = fs.readFileSync(path.join(RES, dir, 'colors.xml'), 'utf8');
  return Object.fromEntries(
    [...xml.matchAll(/<color name="([^"]+)">([^<]+)<\/color>/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}

it.each([
  ['light', 'values'],
  ['dark', 'values-night'],
] as [ColorScheme, string][])(
  'as cores nativas do tema %s são as do design system',
  (scheme, dir) => {
    const expected = Object.fromEntries(
      Object.entries(TOKENS).map(([name, token]) => [name, colors[scheme][token]]),
    );
    expect(readColors(dir)).toEqual(expected);
  },
);
