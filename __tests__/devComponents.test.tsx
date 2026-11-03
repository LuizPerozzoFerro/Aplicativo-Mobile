import { renderRouter, screen } from 'expo-router/testing-library';
import '@/i18n';

import DevComponentsScreen from '../app/dev-components';
import type { Environment } from '@/config/variant';

// O ambiente vem deste objeto, que cada teste pode trocar.
const mockVariant = { environment: 'development' as Environment };
jest.mock('@/config/variant', () => ({
  get variant() {
    return { environment: mockVariant.environment, features: { domainMonitoring: false } };
  },
}));

const renderScreen = () =>
  renderRouter(
    { index: () => null, 'dev-components': DevComponentsScreen },
    { initialUrl: '/dev-components' },
  );

afterEach(() => {
  mockVariant.environment = 'development';
});

it('em development, mostra os componentes do passo 3', async () => {
  await renderScreen();
  expect(screen.getByRole('header', { name: 'Componentes' })).toBeOnTheScreen();
  expect(screen.getByRole('adjustable', { name: 'Horário de exemplo, Hora' })).toBeOnTheScreen();
  expect(screen.getByRole('adjustable', { name: 'Início, Minutos' })).toBeOnTheScreen();
  expect(screen.getByRole('radio', { name: 'Opção B' })).toBeChecked();
  expect(screen.getByLabelText('Campo de exemplo')).toBeOnTheScreen();
});

it.each(['preview', 'production'] as const)('em %s, volta ao início', async (environment) => {
  mockVariant.environment = environment;
  await renderScreen();
  expect(screen).toHavePathname('/');
  expect(screen.queryByText('Componentes')).toBeNull();
});
