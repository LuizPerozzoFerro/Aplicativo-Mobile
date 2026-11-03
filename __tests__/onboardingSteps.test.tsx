import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import type { DatabaseState } from '@/data/bootstrap';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { onboardingProgress } from '@/features/onboarding/onboardingProgress';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';

// Etapas 1 a 3 do onboarding (spec 02, seção 4.4) sobre as rotas reais, com um
// banco sql.js novo a cada teste. Os apps vêm do FakeMonitoringModule, que
// tem os seis sugeridos (Instagram, TikTok, YouTube, Kwai, X, Reddit).
const mockDatabaseState = jest.fn<DatabaseState, []>(() => ({ status: 'ready' }));
let mockRepositories: Repositories;
jest.mock('@/data/bootstrap', () => ({
  useDatabase: () => mockDatabaseState(),
  getRepositories: () => mockRepositories,
}));

const APP_DIR = './app';
const expectPath = (path: string) => waitFor(() => expect(screen).toHavePathname(path));
const press = async (role: 'button' | 'checkbox' | 'radio', name: string | RegExp) =>
  userEvent.setup().press(await screen.findByRole(role, { name }));
const continueButton = () => screen.getByRole('button', { name: 'Continuar' });
/** Toca num app de uma das listas (os mesmos apps aparecem nas duas). */
const pressApp = async (list: 'short-video-apps' | 'risk-apps', name: string) =>
  userEvent.setup().press(within(screen.getByTestId(list)).getByRole('checkbox', { name }));

beforeEach(async () => {
  mockRepositories = createRepositories((await createTestDatabase()).db);
  onboardingStatus.setCompleted(false);
  onboardingProgress.connect({ load: () => null, save: () => undefined });
});
afterEach(() => jest.restoreAllMocks());

describe('etapa 1: boas-vindas e idade', () => {
  it('"Sim" grava a confirmação de idade e avança', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    expect(await screen.findByText('Você tem 18 anos ou mais?')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull();
    await press('button', 'Sim, tenho 18 anos ou mais');
    await expectPath('/compulsions');
    expect(mockRepositories.settings.get().ageConfirmedAt).toBeInstanceOf(Date);
    expect(onboardingProgress.getStep()).toBe('compulsions');
  });

  it('"Não" leva à tela de bloqueio sem gravar nada, e o Voltar corrige (R1)', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/' });
    await press('button', 'Não, tenho menos de 18');
    await expectPath('/underage');
    expect(
      await screen.findByRole('header', { name: 'O Quedo é só para adultos' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull();
    expect(mockRepositories.settings.get().ageConfirmedAt).toBeNull();
    expect(onboardingProgress.getStep()).toBeNull();
    await press('button', 'Voltar e corrigir a resposta');
    await expectPath('/welcome');
  });
});

describe('etapa 2: o que você quer mudar', () => {
  const adult = /^Conteúdo adulto/;
  const shortVideos = /^Vídeos curtos e redes sociais/;

  it('sem escolha, o "Continuar" fica desabilitado e mostra o motivo', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/compulsions' });
    await screen.findByRole('checkbox', { name: adult });
    expect(continueButton()).toBeDisabled();
    expect(screen.getByText('Escolha pelo menos uma opção para continuar.')).toBeOnTheScreen();
  });

  it('grava as compulsões na ordem em que foram escolhidas', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/compulsions' });
    await press('checkbox', shortVideos);
    await press('checkbox', adult);
    expect(screen.getByRole('checkbox', { name: adult })).toBeChecked();
    await press('button', 'Continuar');
    await expectPath('/setup');
    expect(mockRepositories.compulsions.list().map((item) => item.type)).toEqual([
      'short_videos',
      'pornography',
    ]);
  });

  it('tirar uma compulsão já gravada pede confirmação e, ao avançar, apaga as respostas dela', async () => {
    const saved = mockRepositories.compulsions.add({ type: 'pornography', startedAt: new Date() });
    mockRepositories.monitoredApps.add({
      compulsionId: saved.id,
      packageName: 'com.reddit.frontpage',
      role: 'risk',
      declaredConsumption: true,
    });
    mockRepositories.compulsions.add({ type: 'short_videos', startedAt: new Date() });
    const alert = jest.spyOn(Alert, 'alert');

    await renderRouter(APP_DIR, { initialUrl: '/compulsions' });
    // Cancelar mantém a escolha.
    alert.mockImplementationOnce((_title, _message, buttons) => buttons?.[0]?.onPress?.());
    await press('checkbox', adult);
    expect(screen.getByRole('checkbox', { name: adult })).toBeChecked();
    // Confirmar tira.
    alert.mockImplementationOnce((_title, _message, buttons) => buttons?.[1]?.onPress?.());
    await press('checkbox', adult);
    await waitFor(() => expect(screen.getByRole('checkbox', { name: adult })).not.toBeChecked());
    expect(alert).toHaveBeenLastCalledWith(
      'Tirar esta escolha?',
      'As respostas que você já deu sobre ela serão apagadas.',
      expect.any(Array),
      expect.any(Object),
    );

    await press('button', 'Continuar');
    await expectPath('/setup');
    expect(mockRepositories.compulsions.list().map((item) => item.type)).toEqual(['short_videos']);
    expect(mockRepositories.monitoredApps.listByCompulsion(saved.id)).toEqual([]);
  });
});

describe('etapa 3: configuração', () => {
  const setupBoth = () => {
    const videos = mockRepositories.compulsions.add({
      type: 'short_videos',
      startedAt: new Date(),
    });
    const adult = mockRepositories.compulsions.add({ type: 'pornography', startedAt: new Date() });
    return { videos, adult };
  };
  const checkedIn = (testID: string) =>
    within(screen.getByTestId(testID))
      .getAllByRole('checkbox')
      .filter((chip) => chip.props.accessibilityState?.checked)
      .map((chip) => chip.props.accessibilityLabel);

  it('pré-marca os sugeridos instalados e o limite padrão de 60 min', async () => {
    setupBoth();
    await renderRouter(APP_DIR, { initialUrl: '/setup' });
    await waitFor(() =>
      expect(checkedIn('short-video-apps')).toEqual(['Instagram', 'TikTok', 'YouTube', 'Kwai']),
    );
    expect(checkedIn('risk-apps')).toEqual(['X', 'Reddit']);
    expect(screen.getByRole('radio', { name: '60 min' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Estou começando hoje' })).toBeChecked();
  });

  it('cada app de risco marcado precisa da resposta, sem resposta pré-marcada', async () => {
    setupBoth();
    await renderRouter(APP_DIR, { initialUrl: '/setup' });
    await screen.findByText('Você costuma ver esse tipo de conteúdo em X?');
    expect(continueButton()).toBeDisabled();
    expect(screen.getByText('Responda à pergunta de cada app de risco marcado.')).toBeOnTheScreen();
    const answers = screen.getAllByRole('radio', { name: 'Sim' });
    expect(answers).toHaveLength(2);
    for (const answer of answers) expect(answer).not.toBeChecked();
    await userEvent.setup().press(answers[0]!);
    await userEvent.setup().press(screen.getAllByRole('radio', { name: 'Não' })[1]!);
    await waitFor(() => expect(continueButton()).toBeEnabled());
  });

  it('valida o limite livre e os dias sem recair, com o motivo à vista', async () => {
    setupBoth();
    await renderRouter(APP_DIR, { initialUrl: '/setup' });
    await screen.findByText('Você costuma ver esse tipo de conteúdo em X?');
    // Tira os apps de risco: são opcionais.
    await pressApp('risk-apps', 'X');
    await pressApp('risk-apps', 'Reddit');
    await waitFor(() => expect(continueButton()).toBeEnabled());

    await press('radio', 'Outro');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Limite em minutos'), '4');
    expect(continueButton()).toBeDisabled();
    expect(screen.getAllByText('Use um limite de 5 a 600 minutos.').length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText('Limite em minutos'), '5');
    await waitFor(() => expect(continueButton()).toBeEnabled());

    await press('radio', 'Já estou sem recair há alguns dias');
    expect(continueButton()).toBeDisabled();
    await user.type(screen.getByLabelText('Há quantos dias?'), '0');
    expect(screen.getAllByText('Use um número de 1 a 3650.').length).toBeGreaterThan(0);
    await user.clear(screen.getByLabelText('Há quantos dias?'));
    await user.type(screen.getByLabelText('Há quantos dias?'), '12');
    await waitFor(() => expect(continueButton()).toBeEnabled());
  });

  it('grava apps, limite, declarações, dias e horário do check-in; voltar mostra o gravado', async () => {
    const { videos, adult } = setupBoth();
    await renderRouter(APP_DIR, { initialUrl: '/setup' });
    await screen.findByText('Você costuma ver esse tipo de conteúdo em X?');
    const user = userEvent.setup();
    await pressApp('short-video-apps', 'Kwai'); // tira o Kwai
    await press('radio', '90 min');
    await user.press(screen.getAllByRole('radio', { name: 'Sim' })[0]!); // X: sim
    await user.press(screen.getAllByRole('radio', { name: 'Não' })[1]!); // Reddit: não
    await press('radio', 'Já estou sem recair há alguns dias');
    await user.type(screen.getByLabelText('Há quantos dias?'), '12');
    await user.press(screen.getByTestId('check-in-time-hour-increase')); // 21h → 22h
    await press('button', 'Continuar');
    await expectPath('/triggers');

    const apps = (id: number) =>
      mockRepositories.monitoredApps
        .listByCompulsion(id)
        .map(({ packageName, declaredConsumption }) => [packageName, declaredConsumption]);
    expect(apps(videos.id)).toEqual([
      ['com.instagram.android', null],
      ['com.zhiliaoapp.musically', null],
      ['com.google.android.youtube', null],
    ]);
    expect(apps(adult.id)).toEqual([
      ['com.twitter.android', true],
      ['com.reddit.frontpage', false],
    ]);
    const saved = mockRepositories.compulsions.list();
    expect(saved[0]?.dailyLimitMinutes).toBe(90);
    expect(saved[1]?.initialStreakDays).toBe(12);
    expect(mockRepositories.settings.get().checkInMinutes).toBe(22 * 60);

    // De volta à etapa: o gravado, não a pré-marcação.
    await press('button', 'Voltar');
    await expectPath('/setup');
    await waitFor(() =>
      expect(checkedIn('short-video-apps')).toEqual(['Instagram', 'TikTok', 'YouTube']),
    );
    expect(screen.getByRole('radio', { name: '90 min' })).toBeChecked();
    expect(screen.getByLabelText('Há quantos dias?').props.value).toBe('12');
  });

  it('com só uma compulsão, só a seção dela aparece', async () => {
    mockRepositories.compulsions.add({ type: 'short_videos', startedAt: new Date() });
    await renderRouter(APP_DIR, { initialUrl: '/setup' });
    expect(
      await screen.findByRole('header', { name: 'Vídeos curtos e redes sociais' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Conteúdo adulto')).toBeNull();
    expect(screen.queryByText('Horário do check-in')).toBeNull();
  });

  it('sem nenhum app escolhido, não avança e diz por quê', async () => {
    mockRepositories.compulsions.add({ type: 'short_videos', startedAt: new Date() });
    await renderRouter(APP_DIR, { initialUrl: '/setup' });
    await waitFor(() => expect(checkedIn('short-video-apps')).toHaveLength(4));
    for (const name of ['Instagram', 'TikTok', 'YouTube', 'Kwai']) {
      await pressApp('short-video-apps', name);
    }
    expect(continueButton()).toBeDisabled();
    expect(screen.getByText('Escolha pelo menos um app de vídeos curtos.')).toBeOnTheScreen();
  });
});
