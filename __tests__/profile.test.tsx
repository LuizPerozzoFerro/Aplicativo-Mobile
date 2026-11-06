import { userEvent } from '@testing-library/react-native';
import { renderRouter, screen, waitFor, within } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import type { DatabaseState } from '@/data/bootstrap';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { addCalendarDays, isSameDay, toDayKey } from '@/domain/day';
import { onboardingProgress } from '@/features/onboarding/onboardingProgress';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { FakeMonitoringModule } from '@/monitoring';

// Perfil (spec 02, seção 4.6) sobre as rotas reais, com um banco sql.js e um
// monitoramento falso novos a cada teste.
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
const press = async (name: string | RegExp) =>
  userEvent.setup().press(await screen.findByRole('button', { name }));
const saveButton = () => screen.getByRole('button', { name: 'Salvar' });

/** Responde o próximo diálogo do sistema tocando no botão com este texto. */
function answerNextAlert(label: string) {
  return jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons) => {
    buttons?.find((button) => button.text === label)?.onPress?.();
  });
}

function addVideos() {
  const videos = mockRepositories.compulsions.add({
    type: 'short_videos',
    startedAt: addCalendarDays(new Date(), -3),
    dailyLimitMinutes: 60,
  });
  mockRepositories.monitoredApps.replaceForCompulsion(videos.id, [
    { packageName: 'com.instagram.android', role: 'short_video' },
  ]);
  return videos;
}

function addAdult() {
  const adult = mockRepositories.compulsions.add({
    type: 'pornography',
    startedAt: addCalendarDays(new Date(), -10),
  });
  mockRepositories.compulsions.setInitialStreakDays(adult.id, 0);
  mockRepositories.monitoredApps.replaceForCompulsion(adult.id, [
    { packageName: 'com.twitter.android', role: 'risk', declaredConsumption: true },
  ]);
  return adult;
}

beforeEach(async () => {
  mockRepositories = createRepositories((await createTestDatabase()).db);
  mockMonitoring = new FakeMonitoringModule();
  onboardingStatus.setCompleted(true);
  onboardingProgress.connect({ load: () => null, save: () => undefined });
});
afterEach(() => jest.restoreAllMocks());

describe('Perfil', () => {
  it('mostra os itens das compulsões ativas, com os valores atuais', async () => {
    addVideos();
    addAdult();
    await renderRouter(APP_DIR, { initialUrl: '/profile' });
    expect(
      await screen.findByRole('button', {
        name: 'O que você quer mudar, Vídeos curtos e redes sociais, Conteúdo adulto',
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: 'Apps e limite, Limite de 60 min por dia, somado entre os apps',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Apps de risco/ })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Horário do check-in, Todos os dias às 21h' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Gatilhos/ })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^Minha motivação/ })).toBeOnTheScreen();
  });

  it('sem conteúdo adulto, não mostra apps de risco nem check-in', async () => {
    addVideos();
    await renderRouter(APP_DIR, { initialUrl: '/profile' });
    await screen.findByRole('button', { name: /^Apps e limite/ });
    expect(screen.queryByRole('button', { name: /^Apps de risco/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Horário do check-in/ })).toBeNull();
  });

  it('"Permissões" abre a tela de permissões', async () => {
    addVideos();
    await renderRouter(APP_DIR, { initialUrl: '/profile' });
    await press(/^Permissões/);
    await expectPath('/permission-status');
    expect(await screen.findByTestId('permission-usageAccess')).toBeOnTheScreen();
  });
});

describe('Apagar meus dados', () => {
  const fillEverything = () => {
    const adult = addAdult();
    addVideos();
    mockRepositories.checkIns.answer({
      compulsionId: adult.id,
      dayKey: toDayKey(new Date()),
      answer: 'relapse',
    });
    mockRepositories.triggers.replaceAll([{ kind: 'emotion', value: 'stress' }]);
    mockRepositories.motivation.save('Quero ter mais tempo para mim.');
    mockRepositories.settings.setAgeConfirmedAt(new Date());
    mockRepositories.settings.setOnboardingCompleted(true);
  };

  it('duas confirmações apagam tudo e voltam às boas-vindas (R11)', async () => {
    fillEverything();
    const alert = jest.spyOn(Alert, 'alert');
    alert
      .mockImplementationOnce((_t, _m, buttons) => buttons?.[1]?.onPress?.())
      .mockImplementationOnce((_t, _m, buttons) => buttons?.[1]?.onPress?.());
    await renderRouter(APP_DIR, { initialUrl: '/profile' });
    await userEvent.setup().press(await screen.findByTestId('delete-data'));

    await expectPath('/welcome');
    expect(alert.mock.calls.map(([title]) => title)).toEqual([
      'Apagar todos os seus dados?',
      'Tem certeza?',
    ]);
    expect(alert.mock.calls[1]?.[2]?.[1]).toMatchObject({
      text: 'Apagar tudo',
      style: 'destructive',
    });
    expect(onboardingStatus.isCompleted()).toBe(false);
    expect(onboardingProgress.getStep()).toBeNull();
    expect(mockRepositories.compulsions.list()).toEqual([]);
    expect(mockRepositories.triggers.list()).toEqual([]);
    expect(mockRepositories.motivation.get()).toBeNull();
    expect(mockRepositories.settings.get()).toMatchObject({
      onboardingCompleted: false,
      ageConfirmedAt: null,
      onboardingStep: null,
    });
    expect(await screen.findByText('Você tem 18 anos ou mais?')).toBeOnTheScreen();
  });

  it.each([
    ['na primeira', ['Cancelar']],
    ['na segunda', ['Continuar', 'Cancelar']],
  ])('cancelar %s confirmação não apaga nada', async (_when, answers) => {
    fillEverything();
    answers.forEach(answerNextAlert);
    await renderRouter(APP_DIR, { initialUrl: '/profile' });
    await userEvent.setup().press(await screen.findByTestId('delete-data'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(answers.length));
    expect(screen).toHavePathname('/profile');
    expect(onboardingStatus.isCompleted()).toBe(true);
    expect(mockRepositories.compulsions.list()).toHaveLength(2);
    expect(mockRepositories.motivation.get()).not.toBeNull();
  });
});

describe('O que você quer mudar', () => {
  it('com uma só, "Remover" fica desabilitado e diz por quê', async () => {
    addVideos();
    await renderRouter(APP_DIR, { initialUrl: '/edit/compulsions' });
    const card = within(await screen.findByTestId('profile-compulsion-short_videos'));
    expect(card.getByRole('button', { name: 'Remover' })).toBeDisabled();
    expect(card.getByText('Pelo menos uma opção precisa continuar.')).toBeOnTheScreen();
  });

  it('remover pede confirmação e apaga o histórico da compulsão', async () => {
    addVideos();
    const adult = addAdult();
    mockRepositories.relapses.record({ compulsionId: adult.id, dayKey: toDayKey(new Date()) });
    await renderRouter(APP_DIR, { initialUrl: '/edit/compulsions' });

    // Cancelar mantém.
    answerNextAlert('Cancelar');
    const adultCard = () => within(screen.getByTestId('profile-compulsion-pornography'));
    await screen.findByTestId('profile-compulsion-pornography');
    await userEvent.setup().press(adultCard().getByRole('button', { name: 'Remover' }));
    expect(mockRepositories.compulsions.list()).toHaveLength(2);

    const alert = answerNextAlert('Remover');
    await userEvent.setup().press(adultCard().getByRole('button', { name: 'Remover' }));
    expect(await adultCard().findByRole('button', { name: 'Adicionar' })).toBeOnTheScreen();
    expect(alert).toHaveBeenLastCalledWith(
      'Parar de acompanhar?',
      expect.stringContaining('será apagado'),
      expect.any(Array),
      expect.any(Object),
    );
    expect(mockRepositories.compulsions.list().map((item) => item.type)).toEqual(['short_videos']);
    expect(mockRepositories.relapses.listByCompulsion(adult.id)).toEqual([]);
  });

  it('adicionar vídeos curtos: sugeridos pré-marcados, grava ao salvar e começa hoje', async () => {
    addAdult();
    await renderRouter(APP_DIR, { initialUrl: '/edit/compulsions' });
    const card = within(await screen.findByTestId('profile-compulsion-short_videos'));
    await userEvent.setup().press(card.getByRole('button', { name: 'Adicionar' }));
    await expectPath('/edit/add-compulsion');

    const apps = within(await screen.findByTestId('short-video-apps'));
    expect(
      screen.getByText('Ajuste do seu jeito. A contagem começa a partir de hoje.'),
    ).toBeOnTheScreen();
    expect(apps.getByRole('checkbox', { name: 'Instagram' })).toBeChecked();
    expect(mockRepositories.compulsions.list()).toHaveLength(1);
    await press('Salvar');

    await expectPath('/edit/compulsions');
    const added = mockRepositories.compulsions.list()[1];
    expect(added).toMatchObject({ type: 'short_videos', dailyLimitMinutes: 60 });
    expect(isSameDay(added!.startedAt, new Date())).toBe(true);
    expect(
      mockRepositories.monitoredApps.listByCompulsion(added!.id).map((app) => app.packageName),
    ).toEqual(expect.arrayContaining(['com.instagram.android', 'com.google.android.youtube']));
    expect(
      within(screen.getByTestId('profile-compulsion-short_videos')).getByText('Acompanhando'),
    ).toBeOnTheScreen();
  });

  it('adicionar conteúdo adulto "há N dias": declarações obrigatórias e início contado de hoje', async () => {
    addVideos();
    await renderRouter(APP_DIR, { initialUrl: '/edit/add-compulsion?type=pornography' });
    const user = userEvent.setup();
    expect(
      await screen.findByText(
        'Ajuste do seu jeito. A contagem começa hoje, a não ser que você informe que já está sem recair há alguns dias.',
      ),
    ).toBeOnTheScreen();
    await user.press(
      await screen.findByRole('radio', { name: 'Já estou sem recair há alguns dias' }),
    );
    await user.type(screen.getByLabelText('Há quantos dias?'), '5');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('Responda à pergunta de cada app de risco marcado.')).toBeOnTheScreen();
    await screen.findByText('Você costuma ver esse tipo de conteúdo em Reddit?');
    for (const answer of screen.getAllByRole('radio', { name: 'Não' })) await user.press(answer);
    await user.press(screen.getByTestId('check-in-time-hour-increase')); // 21h → 22h
    await user.press(saveButton());

    await waitFor(() => expect(mockRepositories.compulsions.list()).toHaveLength(2));
    const added = mockRepositories.compulsions.list()[1]!;
    expect(added.type).toBe('pornography');
    expect(added.initialStreakDays).toBe(5);
    expect(isSameDay(added.startedAt, addCalendarDays(new Date(), -5))).toBe(true);
    expect(mockRepositories.monitoredApps.listByCompulsion(added.id)).toEqual([
      expect.objectContaining({ packageName: 'com.twitter.android', declaredConsumption: false }),
      expect.objectContaining({ packageName: 'com.reddit.frontpage', declaredConsumption: false }),
    ]);
    expect(mockRepositories.settings.get().checkInMinutes).toBe(22 * 60);
  });

  it('"Cancelar" não adiciona nada', async () => {
    addVideos();
    await renderRouter(APP_DIR, { initialUrl: '/edit/add-compulsion?type=pornography' });
    await press('Cancelar');
    expect(mockRepositories.compulsions.list()).toHaveLength(1);
  });
});

describe('edições', () => {
  it('apps e limite: grava o limite novo, e o Perfil mostra', async () => {
    const videos = addVideos();
    await renderRouter(APP_DIR, { initialUrl: '/profile' });
    await press(/^Apps e limite/);
    await expectPath('/edit/short-videos');
    expect(
      within(await screen.findByTestId('short-video-apps')).getByRole('checkbox', {
        name: 'Instagram',
      }),
    ).toBeChecked();
    await userEvent.setup().press(screen.getByRole('radio', { name: '90 min' }));
    await press('Salvar');

    await expectPath('/profile');
    expect(mockRepositories.compulsions.list()[0]?.dailyLimitMinutes).toBe(90);
    expect(
      await screen.findByRole('button', {
        name: 'Apps e limite, Limite de 90 min por dia, somado entre os apps',
      }),
    ).toBeOnTheScreen();
    expect(
      mockRepositories.monitoredApps.listByCompulsion(videos.id).map((app) => app.packageName),
    ).toEqual(['com.instagram.android']);
  });

  it('apps de risco: app novo precisa da resposta antes de salvar', async () => {
    const adult = addAdult();
    await renderRouter(APP_DIR, { initialUrl: '/edit/risk-apps' });
    const user = userEvent.setup();
    const riskApps = within(await screen.findByTestId('risk-apps'));
    expect(riskApps.getByRole('checkbox', { name: 'X' })).toBeChecked();
    expect(screen.queryByText('Desde quando você está sem recair?')).toBeNull();
    expect(saveButton()).toBeEnabled();

    await user.press(riskApps.getByRole('checkbox', { name: 'Reddit' }));
    expect(saveButton()).toBeDisabled();
    await screen.findByText('Você costuma ver esse tipo de conteúdo em Reddit?');
    // X já respondido (Sim); o segundo "Sim" é o do Reddit.
    await user.press(screen.getAllByRole('radio', { name: 'Sim' })[1]!);
    await user.press(saveButton());

    await waitFor(() =>
      expect(mockRepositories.monitoredApps.listByCompulsion(adult.id)).toHaveLength(2),
    );
    expect(mockRepositories.monitoredApps.listByCompulsion(adult.id)[1]).toMatchObject({
      packageName: 'com.reddit.frontpage',
      declaredConsumption: true,
    });
  });

  it('horário do check-in', async () => {
    addAdult();
    await renderRouter(APP_DIR, { initialUrl: '/edit/check-in' });
    await userEvent.setup().press(await screen.findByTestId('check-in-time-hour-increase'));
    await press('Salvar');
    await waitFor(() => expect(mockRepositories.settings.get().checkInMinutes).toBe(22 * 60));
  });

  it('gatilhos: grava ao salvar; "Cancelar" descarta', async () => {
    addVideos();
    mockRepositories.triggers.replaceAll([{ kind: 'emotion', value: 'stress' }]);
    await renderRouter(APP_DIR, { initialUrl: '/edit/triggers' });
    const user = userEvent.setup();
    const emotions = () => within(screen.getByTestId('emotions'));
    await screen.findByTestId('emotions');
    expect(emotions().getByRole('checkbox', { name: 'Estresse' })).toBeChecked();

    await user.press(emotions().getByRole('checkbox', { name: 'Tédio' }));
    await press('Cancelar');
    expect(mockRepositories.triggers.list().map((trigger) => trigger.value)).toEqual(['stress']);
  });

  it('gatilhos: salvar troca os gatilhos gravados', async () => {
    addVideos();
    await renderRouter(APP_DIR, { initialUrl: '/edit/triggers' });
    const user = userEvent.setup();
    await user.press(
      within(await screen.findByTestId('emotions')).getByRole('checkbox', { name: 'Tédio' }),
    );
    await user.press(screen.getByRole('checkbox', { name: 'Fim de semana' }));
    await press('Salvar');
    await waitFor(() =>
      expect(mockRepositories.triggers.list().map(({ kind, value }) => [kind, value])).toEqual([
        ['weekday', '0'],
        ['weekday', '6'],
        ['emotion', 'boredom'],
      ]),
    );
  });

  it('motivação: mínimo de 3 caracteres e grava sem os espaços das pontas', async () => {
    addVideos();
    mockRepositories.motivation.save('Quero ter mais tempo para mim.');
    await renderRouter(APP_DIR, { initialUrl: '/edit/motivation' });
    const user = userEvent.setup();
    const field = await screen.findByTestId('motivation-input');
    await user.clear(field);
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('Escreva pelo menos 3 caracteres.')).toBeOnTheScreen();
    await user.type(field, '  Por mim  ');
    await user.press(saveButton());
    await waitFor(() => expect(mockRepositories.motivation.get()?.text).toBe('Por mim'));
  });
});
