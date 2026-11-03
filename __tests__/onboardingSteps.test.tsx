import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import type { DatabaseState } from '@/data/bootstrap';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { onboardingProgress } from '@/features/onboarding/onboardingProgress';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { FakeMonitoringModule } from '@/monitoring';

// Etapas do onboarding (spec 02, seção 4.4) sobre as rotas reais, com um
// banco sql.js e um monitoramento falso novos a cada teste. Os apps vêm do FakeMonitoringModule, que
// tem os seis sugeridos (Instagram, TikTok, YouTube, Kwai, X, Reddit).
const mockDatabaseState = jest.fn<DatabaseState, []>(() => ({ status: 'ready' }));
let mockRepositories: Repositories;
jest.mock('@/data/bootstrap', () => ({
  useDatabase: () => mockDatabaseState(),
  getRepositories: () => mockRepositories,
}));
let mockMonitoring: FakeMonitoringModule;
jest.mock('@/monitoring', () => ({
  ...jest.requireActual('@/monitoring'),
  getMonitoring: () => mockMonitoring,
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
  mockMonitoring = new FakeMonitoringModule();
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

describe('etapa 4: gatilhos', () => {
  const checkedLabels = (testID: string) =>
    within(screen.getByTestId(testID))
      .getAllByRole('checkbox')
      .filter((chip) => chip.props.accessibilityState?.checked)
      .map((chip) => chip.props.accessibilityLabel);
  const savedTriggers = () =>
    mockRepositories.triggers.list().map(({ kind, value }) => `${kind}:${value}`);

  it('mostra as 12 faixas de 2 horas e tudo é opcional', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/triggers' });
    const presets = within(await screen.findByTestId('preset-ranges')).getAllByRole('checkbox');
    expect(presets.map((chip) => chip.props.accessibilityLabel)).toEqual([
      '00h–02h',
      '02h–04h',
      '04h–06h',
      '06h–08h',
      '08h–10h',
      '10h–12h',
      '12h–14h',
      '14h–16h',
      '16h–18h',
      '18h–20h',
      '20h–22h',
      '22h–24h',
    ]);
    expect(continueButton()).toBeEnabled();
    await press('button', 'Continuar');
    await expectPath('/motivation');
    expect(savedTriggers()).toEqual([]);
  });

  it('grava faixas, dias (com atalho) e emoções; voltar mostra o gravado', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/triggers' });
    await press('checkbox', '20h–22h');
    await press('checkbox', '22h–24h');
    await press('checkbox', 'Fim de semana');
    expect(checkedLabels('weekdays')).toEqual(['Domingo', 'Sábado']);
    await press('checkbox', 'Estresse');
    await press('button', 'Continuar');
    await expectPath('/motivation');
    expect(savedTriggers()).toEqual([
      'time:20:00-22:00',
      'time:22:00-00:00',
      'weekday:0',
      'weekday:6',
      'emotion:stress',
    ]);

    await press('button', 'Voltar');
    await expectPath('/triggers');
    expect(checkedLabels('preset-ranges')).toEqual(['20h–22h', '22h–24h']);
    expect(checkedLabels('emotions')).toEqual(['Estresse']);
  });

  it('"Dias úteis" marca segunda a sexta; tocar de novo desmarca', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/triggers' });
    await press('checkbox', 'Dias úteis');
    expect(checkedLabels('weekdays')).toEqual(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']);
    expect(screen.getByRole('checkbox', { name: 'Dias úteis' })).toBeChecked();
    await press('checkbox', 'Dias úteis');
    expect(checkedLabels('weekdays')).toEqual([]);
  });

  it('faixa personalizada atravessando a meia-noite (R5); tocar nela tira', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/triggers' });
    await press('button', 'Adicionar faixa personalizada');
    // Padrão 23h–01h; o início vai para 23h30.
    for (let i = 0; i < 6; i++) {
      await userEvent.setup().press(screen.getByTestId('new-range-start-minute-increase'));
    }
    expect(screen.getByText('Termina no dia seguinte')).toBeOnTheScreen();
    await press('button', 'Adicionar faixa');
    expect(checkedLabels('custom-ranges')).toEqual(['23h30–01h']);
    await press('button', 'Continuar');
    expect(savedTriggers()).toEqual(['time:23:30-01:00']);

    await press('button', 'Voltar');
    await press('checkbox', '23h30–01h');
    expect(screen.queryByTestId('custom-ranges')).toBeNull();
  });

  it('faixa personalizada igual a uma fixa marca a fixa, sem duplicar', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/triggers' });
    await press('button', 'Adicionar faixa personalizada');
    // 23h–01h → 22h–00h.
    await userEvent.setup().press(screen.getByTestId('new-range-start-hour-decrease'));
    await userEvent.setup().press(screen.getByTestId('new-range-end-hour-decrease'));
    await press('button', 'Adicionar faixa');
    expect(checkedLabels('preset-ranges')).toEqual(['22h–24h']);
    expect(screen.queryByTestId('custom-ranges')).toBeNull();
  });

  it('início igual ao fim: não deixa adicionar e diz por quê', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/triggers' });
    await press('button', 'Adicionar faixa personalizada');
    // 23h–01h → 00h–01h: o início sobe uma hora; depois 01h–01h.
    await userEvent.setup().press(screen.getByTestId('new-range-start-hour-increase'));
    await userEvent.setup().press(screen.getByTestId('new-range-start-hour-increase'));
    expect(screen.getByText('O início e o fim precisam ser diferentes')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Adicionar faixa' })).toBeDisabled();
  });
});

describe('etapa 5: motivação', () => {
  const field = () => screen.getByLabelText('Por que eu quero mudar?');

  it('obrigatória, com contador; grava sem os espaços das pontas', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/motivation' });
    await screen.findByLabelText('Por que eu quero mudar?');
    expect(continueButton()).toBeDisabled();
    expect(screen.getByText('Escreva pelo menos 3 caracteres.')).toBeOnTheScreen();
    expect(screen.getByText('0/280')).toBeOnTheScreen();
    await userEvent.setup().type(field(), '  Por mim  ');
    expect(screen.getByText('7/280')).toBeOnTheScreen();
    await waitFor(() => expect(continueButton()).toBeEnabled());
    await press('button', 'Continuar');
    await expectPath('/permissions');
    expect(mockRepositories.motivation.get()?.text).toBe('Por mim');
  });

  it('acima de 280 caracteres, mostra o erro e não avança', async () => {
    mockRepositories.motivation.save('a'.repeat(281));
    await renderRouter(APP_DIR, { initialUrl: '/motivation' });
    expect((await screen.findAllByText('Use no máximo 280 caracteres.')).length).toBeGreaterThan(0);
    expect(continueButton()).toBeDisabled();
  });
});

describe('etapa 6: permissões', () => {
  const card = (kind: string) => within(screen.getByTestId(`permission-${kind}`));
  const DENIED = 'Não permitido agora. Dá para permitir depois, no Perfil.';

  it('explica as três na ordem do doc 01 e nada é obrigatório', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/permissions' });
    await screen.findByTestId('permission-notifications');
    const titles = ['Notificações', 'Acesso a dados de uso', 'Aparecer sobre outros apps'];
    for (const [index, kind] of ['notifications', 'usageAccess', 'overlay'].entries()) {
      expect(card(kind).getByRole('header', { name: titles[index] })).toBeOnTheScreen();
      expect(card(kind).getByText('Para que serve')).toBeOnTheScreen();
      expect(card(kind).getByText('O que o Quedo não faz')).toBeOnTheScreen();
    }
    expect(screen.getByText(/notificação discreta na barra do celular/)).toBeOnTheScreen();
    expect(screen.getByText(/Depois de reiniciar o celular/)).toBeOnTheScreen();
    expect(continueButton()).toBeEnabled();
  });

  it('"Permitir" pede ao monitoramento e mostra "Permitido"; "Agora não" diz que dá depois', async () => {
    await renderRouter(APP_DIR, { initialUrl: '/permissions' });
    await screen.findByTestId('permission-usageAccess');
    await userEvent.setup().press(card('usageAccess').getByRole('button', { name: 'Permitir' }));
    await waitFor(() => expect(card('usageAccess').getByText('Permitido')).toBeOnTheScreen());
    expect(card('usageAccess').queryByRole('button', { name: 'Permitir' })).toBeNull();
    expect((await mockMonitoring.getPermissionStatus()).usageAccess).toBe('granted');

    await userEvent.setup().press(card('overlay').getByRole('button', { name: 'Agora não' }));
    expect(card('overlay').getByText(DENIED)).toBeOnTheScreen();
    expect((await mockMonitoring.getPermissionStatus()).overlay).toBe('denied');
  });

  it('pedido negado no sistema também diz que dá para permitir depois', async () => {
    mockMonitoring = new FakeMonitoringModule({ grantOnRequest: false });
    await renderRouter(APP_DIR, { initialUrl: '/permissions' });
    await screen.findByTestId('permission-notifications');
    await userEvent.setup().press(card('notifications').getByRole('button', { name: 'Permitir' }));
    await waitFor(() => expect(card('notifications').getByText(DENIED)).toBeOnTheScreen());
  });
});

describe('etapa 7: seu plano', () => {
  it('resume as escolhas e "Começar" grava o início e conclui', async () => {
    const videos = mockRepositories.compulsions.add({
      type: 'short_videos',
      startedAt: new Date(2026, 0, 1),
      dailyLimitMinutes: 60,
    });
    const adult = mockRepositories.compulsions.add({
      type: 'pornography',
      startedAt: new Date(2026, 0, 1),
    });
    mockRepositories.compulsions.setInitialStreakDays(adult.id, 12);
    mockRepositories.monitoredApps.replaceForCompulsion(videos.id, [
      { packageName: 'com.instagram.android', role: 'short_video' },
      { packageName: 'com.zhiliaoapp.musically', role: 'short_video' },
    ]);
    mockRepositories.monitoredApps.replaceForCompulsion(adult.id, [
      { packageName: 'com.twitter.android', role: 'risk', declaredConsumption: true },
    ]);
    mockRepositories.triggers.replaceAll([
      { kind: 'time', value: '20:00-22:00' },
      { kind: 'time', value: '22:00-00:00' },
      { kind: 'time', value: '23:30-01:00' },
      { kind: 'weekday', value: '6' },
      { kind: 'weekday', value: '0' },
      { kind: 'emotion', value: 'stress' },
    ]);
    mockRepositories.motivation.save('Quero ter mais tempo para mim.');

    await renderRouter(APP_DIR, { initialUrl: '/summary' });
    const videosCard = within(await screen.findByTestId('summary-short-videos'));
    expect(await videosCard.findByText('Apps: Instagram, TikTok')).toBeOnTheScreen();
    expect(
      videosCard.getByText('Limite de 60 min por dia, somado entre os apps'),
    ).toBeOnTheScreen();
    const adultCard = within(screen.getByTestId('summary-adult'));
    expect(adultCard.getByText('Sem recair há 12 dias')).toBeOnTheScreen();
    expect(adultCard.getByText('Apps de risco: X')).toBeOnTheScreen();
    expect(adultCard.getByText('Check-in todos os dias às 21h')).toBeOnTheScreen();
    const triggers = within(screen.getByTestId('summary-triggers'));
    // R5: as três faixas viram uma só no resumo.
    expect(triggers.getByText('Horários: 20h–01h')).toBeOnTheScreen();
    expect(triggers.getByText('Dias: Domingo, Sábado')).toBeOnTheScreen();
    expect(triggers.getByText('Sentimentos: Estresse')).toBeOnTheScreen();
    expect(screen.getByText('Quero ter mais tempo para mim.')).toBeOnTheScreen();

    await press('button', 'Começar');
    await expectPath('/');
    expect(onboardingStatus.isCompleted()).toBe(true);
    const [savedVideos, savedAdult] = mockRepositories.compulsions.list();
    const today = new Date();
    const twelveDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 12);
    expect(savedAdult?.startedAt).toEqual(twelveDaysAgo);
    expect(savedVideos?.startedAt.toDateString()).toBe(today.toDateString());
  });

  it('sem gatilhos e sem apps, diz que nenhum foi marcado', async () => {
    mockRepositories.compulsions.add({
      type: 'short_videos',
      startedAt: new Date(),
      dailyLimitMinutes: 30,
    });
    await renderRouter(APP_DIR, { initialUrl: '/summary' });
    expect(await screen.findByText('Nenhum gatilho marcado')).toBeOnTheScreen();
    expect(screen.getByText('Nenhum app escolhido')).toBeOnTheScreen();
  });
});
