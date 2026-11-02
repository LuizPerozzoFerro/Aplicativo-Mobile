import { renderRouter, screen } from 'expo-router/testing-library';
import '@/i18n';

import AboutScreen from '../app/about';
import { getAppInfo } from '@/config/appInfo';

// O expo-application lê o pacote instalado, que não existe no Jest. Os
// valores vêm deste objeto, que cada teste pode trocar.
const mockApplication = {
  applicationName: 'Quedo Dev' as string | null,
  nativeApplicationVersion: '1.0.0' as string | null,
  nativeBuildVersion: '7' as string | null,
};
jest.mock('expo-application', () => ({
  get applicationName() {
    return mockApplication.applicationName;
  },
  get nativeApplicationVersion() {
    return mockApplication.nativeApplicationVersion;
  },
  get nativeBuildVersion() {
    return mockApplication.nativeBuildVersion;
  },
}));

const renderAbout = () => renderRouter({ about: AboutScreen }, { initialUrl: '/about' });

afterEach(() => {
  mockApplication.applicationName = 'Quedo Dev';
  mockApplication.nativeApplicationVersion = '1.0.0';
  mockApplication.nativeBuildVersion = '7';
});

it('getAppInfo junta os dados do pacote instalado e o ambiente da variante', () => {
  expect(getAppInfo()).toEqual({
    name: 'Quedo Dev',
    version: '1.0.0',
    build: '7',
    environment: 'development',
  });
});

it('mostra nome, versão, build e ambiente (V9)', async () => {
  await renderAbout();
  expect(screen.getByRole('header', { name: 'Sobre o app' })).toBeOnTheScreen();
  for (const [field, value] of [
    ['Nome', 'Quedo Dev'],
    ['Versão', '1.0.0'],
    ['Número do build', '7'],
    ['Ambiente', 'Desenvolvimento'],
  ] as const) {
    expect(screen.getByText(field)).toBeOnTheScreen();
    expect(screen.getByText(value)).toBeOnTheScreen();
  }
});

it('a política de privacidade aparece como marcador, sem ser um link', async () => {
  await renderAbout();
  expect(screen.getByText('Política de privacidade')).toBeOnTheScreen();
  expect(screen.getByText('Disponível em breve')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /Política de privacidade/ })).toBeNull();
});

it('sem um dado do pacote, mostra "Indisponível" em vez de vazio', async () => {
  mockApplication.nativeBuildVersion = null;
  await renderAbout();
  expect(screen.getByText('Indisponível')).toBeOnTheScreen();
  expect(screen.queryByText('7')).toBeNull();
});
