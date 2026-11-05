import fs from 'node:fs';
import path from 'node:path';

import { keyExists, pluralsWithoutZero, scanSource, type KeyUsage } from './keys';
import { DEFAULT_LANGUAGE, DEFAULT_NAMESPACE, resources } from './resources';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE_DIRS = ['app', 'src'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.(test|d)\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function scanProject() {
  return SOURCE_DIRS.flatMap((dir) => sourceFiles(path.join(ROOT, dir))).map((file) =>
    scanSource(
      path.relative(ROOT, file).split(path.sep).join('/'),
      fs.readFileSync(file, 'utf8'),
      DEFAULT_NAMESPACE,
    ),
  );
}

const ptBR = resources[DEFAULT_LANGUAGE] as Record<string, unknown>;
const describeUsage = (u: KeyUsage) => `${u.file}: ${u.namespace}:${u.key}`;

describe('chaves de tradução usadas no código', () => {
  const results = scanProject();
  const usages = results.flatMap((r) => r.usages);

  it('encontra chaves no código (a varredura não está vazia)', () => {
    const found = usages.map(describeUsage);
    expect(found).toContain('app/(tabs)/_layout.tsx: tabs:home');
    expect(found).toContain(
      'src/features/onboarding/OnboardingStepScreen.tsx: common:actions.back',
    );
  });

  it('existem todas no pt-BR', () => {
    const missing = usages.filter((u) => !keyExists(ptBR[u.namespace], u.key));
    expect(missing.map(describeUsage)).toEqual([]);
  });

  it('são sempre literais (chave dinâmica não pode ser conferida)', () => {
    expect(results.flatMap((r) => r.dynamic)).toEqual([]);
  });
});

// Plurais cuja contagem nunca chega a zero e que, por isso, dispensam _zero.
// Cada entrada é uma decisão consciente: `namespace:caminho.base`.
const PLURALS_WITHOUT_ZERO: string[] = [
  // Só aparece com 1 a 3650 dias; com zero, o resumo mostra "Começando hoje".
  'onboarding:summary.startDaysAgo',
];

describe('plurais do pt-BR', () => {
  it('têm a forma _zero, salvo os listados em PLURALS_WITHOUT_ZERO', () => {
    expect(pluralsWithoutZero(ptBR).filter((key) => !PLURALS_WITHOUT_ZERO.includes(key))).toEqual(
      [],
    );
  });

  it('pluralsWithoutZero acha o plural sem _zero, inclusive aninhado', () => {
    const tree = {
      ns: {
        a_zero: '0',
        a_one: '1',
        a_other: 'n',
        group: { b_one: '1', b_other: 'n' },
        c_other: 'n',
      },
    };
    expect(pluralsWithoutZero(tree)).toEqual(['ns:c', 'ns:group.b']);
  });
});

describe('scanSource', () => {
  it('usa o namespace do useTranslation e aceita o prefixo explícito', () => {
    const source = `const { t } = useTranslation('onboarding');
      t('welcome.title'); t("common:actions.back"); t(\`summary.title\`);`;
    expect(scanSource('x.tsx', source, 'common').usages).toEqual([
      { file: 'x.tsx', namespace: 'onboarding', key: 'welcome.title' },
      { file: 'x.tsx', namespace: 'common', key: 'actions.back' },
      { file: 'x.tsx', namespace: 'onboarding', key: 'summary.title' },
    ]);
  });

  it('acusa chaves dinâmicas', () => {
    const source = "t(name); t(`step.${n}`); t('ok');";
    expect(scanSource('x.tsx', source, 'common').dynamic).toHaveLength(2);
  });

  it('ignora exemplos em comentários, mas não URLs dentro de textos', () => {
    const source = `// t('em.comentario')
      /* t('em.bloco') */
      const url = 'https://exemplo.test'; t('real.chave');`;
    expect(scanSource('x.tsx', source, 'common').usages).toEqual([
      { file: 'x.tsx', namespace: 'common', key: 'real.chave' },
    ]);
  });

  it('não confunde outras funções terminadas em t', () => {
    const source = "format('a'); i18n.t('b'); setT('c');";
    expect(scanSource('x.tsx', source, 'common').usages).toEqual([]);
  });
});

describe('keyExists', () => {
  it('encontra textos simples e plurais, e recusa o que falta', () => {
    expect(keyExists(ptBR.common, 'actions.back')).toBe(true);
    expect(keyExists(ptBR.common, 'actions.missing')).toBe(false);
    expect(keyExists(ptBR.common, 'actions')).toBe(false);
    const plural = { group: { days_zero: '0', days_one: '1', days_other: 'n' } };
    expect(keyExists(plural, 'group.days')).toBe(true);
  });
});
