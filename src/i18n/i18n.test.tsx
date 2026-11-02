import '@/i18n';

import { render, screen } from '@testing-library/react-native';
import i18n, { t } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

function Days({ count }: { count: number }) {
  const { t } = useTranslation('common');
  return <Text>{t('foundation.days', { count })}</Text>;
}

describe('i18n configurado', () => {
  it('inicia em pt-BR, de forma síncrona', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.language).toBe('pt-BR');
  });

  it('renderiza textos do pt-BR com interpolação', () => {
    expect(t('foundation.environment', { environment: 'preview' })).toBe('Ambiente: preview');
    expect(t('tabs:home')).toBe('Início');
  });

  it('aplica as regras de plural do português num componente', async () => {
    await render(<Days count={1} />);
    expect(screen.getByText('1 dia')).toBeTruthy();
    await render(<Days count={3} />);
    expect(screen.getByText('3 dias')).toBeTruthy();
  });
});
