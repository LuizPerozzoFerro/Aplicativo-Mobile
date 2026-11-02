import '@/i18n';

import { render, screen } from '@testing-library/react-native';
import i18n, { getFixedT, t } from 'i18next';
import { Text } from 'react-native';

// Textos só do teste, para exercitar plural e interpolação sem pôr chaves
// falsas nos textos do app. Fora da tipagem de chaves de propósito.
const TEST_NS = 'i18nTest';
i18n.addResourceBundle('pt-BR', TEST_NS, {
  greeting: 'Olá, {{name}}',
  days_zero: '{{count}} dias',
  days_one: '{{count}} dia',
  days_other: '{{count}} dias',
});
const testT = getFixedT('pt-BR', TEST_NS as never) as unknown as (
  key: string,
  options?: Record<string, unknown>,
) => string;

function Days({ count }: { count: number }) {
  return <Text>{testT('days', { count })}</Text>;
}

describe('i18n configurado', () => {
  it('inicia em pt-BR, de forma síncrona', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe('pt-BR');
  });

  it('entrega os textos reais do pt-BR, inclusive de outro namespace', () => {
    expect(t('actions.continue')).toBe('Continuar');
    expect(t('tabs:home')).toBe('Início');
    expect(t('onboarding:exit.leave')).toBe('Sair');
  });

  it('interpola valores', () => {
    expect(testT('greeting', { name: 'Ana' })).toBe('Olá, Ana');
  });

  it('aplica as regras de plural do português num componente', async () => {
    await render(<Days count={1} />);
    expect(screen.getByText('1 dia')).toBeTruthy();
    await render(<Days count={3} />);
    expect(screen.getByText('3 dias')).toBeTruthy();
  });

  it('usa o plural no zero pela forma _zero ("0 dias", não "0 dia")', async () => {
    // No pt-BR (CLDR), Intl.PluralRules classifica 0 como "one"; sem _zero sairia "0 dia".
    expect(new Intl.PluralRules('pt-BR').select(0)).toBe('one');
    await render(<Days count={0} />);
    expect(screen.getByText('0 dias')).toBeTruthy();
  });
});
