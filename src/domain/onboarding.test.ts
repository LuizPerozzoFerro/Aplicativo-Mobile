import fs from 'node:fs';
import path from 'node:path';

import {
  DAILY_LIMIT_OPTIONS,
  DEFAULT_DAILY_LIMIT_MINUTES,
  ONBOARDING_STEPS,
  getAbstinenceSetupProblem,
  getCompulsionChoiceProblem,
  getMotivationLength,
  getMotivationProblem,
  getNextOnboardingStep,
  getPreviousOnboardingStep,
  getShortVideoSetupProblem,
  isOnboardingStep,
  isValidDailyLimit,
  parseWholeNumber,
} from './onboarding';

describe('etapas', () => {
  it('são as 7 da spec, na ordem', () => {
    expect(ONBOARDING_STEPS).toEqual([
      'welcome',
      'compulsions',
      'setup',
      'triggers',
      'motivation',
      'permissions',
      'summary',
    ]);
  });

  it('cada etapa tem a rota de mesmo nome em app/(onboarding)/', () => {
    const routesDir = path.join(__dirname, '..', '..', 'app', '(onboarding)');
    for (const step of ONBOARDING_STEPS) {
      expect(fs.existsSync(path.join(routesDir, `${step}.tsx`))).toBe(true);
    }
  });

  it('seguinte e anterior', () => {
    expect(getNextOnboardingStep('welcome')).toBe('compulsions');
    expect(getNextOnboardingStep('permissions')).toBe('summary');
    expect(getNextOnboardingStep('summary')).toBeNull();
    expect(getPreviousOnboardingStep('compulsions')).toBe('welcome');
    expect(getPreviousOnboardingStep('welcome')).toBeNull();
  });

  it('reconhece só os nomes das etapas', () => {
    expect(isOnboardingStep('triggers')).toBe(true);
    expect(isOnboardingStep('Triggers')).toBe(false);
    expect(isOnboardingStep('')).toBe(false);
  });
});

describe('limite diário de vídeos curtos', () => {
  it('padrão de 60 min entre as opções', () => {
    expect(DAILY_LIMIT_OPTIONS).toEqual([30, 45, 60, 90, 120]);
    expect(DAILY_LIMIT_OPTIONS).toContain(DEFAULT_DAILY_LIMIT_MINUTES);
    expect(DAILY_LIMIT_OPTIONS.every(isValidDailyLimit)).toBe(true);
  });

  it('valor livre: inteiro de 5 a 600', () => {
    expect(isValidDailyLimit(5)).toBe(true);
    expect(isValidDailyLimit(600)).toBe(true);
    expect(isValidDailyLimit(4)).toBe(false);
    expect(isValidDailyLimit(601)).toBe(false);
    expect(isValidDailyLimit(17.5)).toBe(false);
    expect(isValidDailyLimit(Number.NaN)).toBe(false);
  });
});

describe('motivação', () => {
  it('de 3 a 280 caracteres', () => {
    expect(getMotivationProblem('ab')).toBe('too_short');
    expect(getMotivationProblem('abc')).toBeNull();
    expect(getMotivationProblem('a'.repeat(280))).toBeNull();
    expect(getMotivationProblem('a'.repeat(281))).toBe('too_long');
  });

  it('não conta os espaços das pontas', () => {
    expect(getMotivationLength('   ab   ')).toBe(2);
    expect(getMotivationProblem('   ab   ')).toBe('too_short');
    expect(getMotivationProblem('')).toBe('too_short');
  });

  it('um emoji conta como um caractere', () => {
    expect(getMotivationLength('Por mim 💪')).toBe(9);
    expect(getMotivationProblem('💪'.repeat(280))).toBeNull();
  });
});

describe('validação das etapas 2 e 3', () => {
  it('etapa 2: pelo menos uma compulsão', () => {
    expect(getCompulsionChoiceProblem(0)).toBe('none_selected');
    expect(getCompulsionChoiceProblem(1)).toBeNull();
    expect(getCompulsionChoiceProblem(2)).toBeNull();
  });

  it('vídeos curtos: pelo menos um app e limite de 5 a 600', () => {
    expect(getShortVideoSetupProblem({ appCount: 0, dailyLimitMinutes: 60 })).toBe('no_apps');
    expect(getShortVideoSetupProblem({ appCount: 2, dailyLimitMinutes: 4 })).toBe('invalid_limit');
    expect(getShortVideoSetupProblem({ appCount: 2, dailyLimitMinutes: Number.NaN })).toBe(
      'invalid_limit',
    );
    expect(getShortVideoSetupProblem({ appCount: 1, dailyLimitMinutes: 600 })).toBeNull();
  });

  it('conteúdo adulto: "há N dias" de 1 a 3650; "hoje" ignora N', () => {
    const base = { riskAppDeclarations: [] };
    expect(
      getAbstinenceSetupProblem({ ...base, startMode: 'days_ago', daysAlreadyWithoutRelapse: 0 }),
    ).toBe('invalid_days');
    expect(
      getAbstinenceSetupProblem({
        ...base,
        startMode: 'days_ago',
        daysAlreadyWithoutRelapse: 3650,
      }),
    ).toBeNull();
    expect(
      getAbstinenceSetupProblem({
        ...base,
        startMode: 'today',
        daysAlreadyWithoutRelapse: Number.NaN,
      }),
    ).toBeNull();
  });

  it('conteúdo adulto: apps de risco opcionais, mas cada marcado precisa da resposta', () => {
    const today = { startMode: 'today' as const, daysAlreadyWithoutRelapse: 0 };
    expect(getAbstinenceSetupProblem({ ...today, riskAppDeclarations: [] })).toBeNull();
    expect(getAbstinenceSetupProblem({ ...today, riskAppDeclarations: [true, false] })).toBeNull();
    expect(getAbstinenceSetupProblem({ ...today, riskAppDeclarations: [true, null] })).toBe(
      'undeclared_app',
    );
  });

  it('lê só números inteiros digitados', () => {
    expect(parseWholeNumber(' 45 ')).toBe(45);
    expect(parseWholeNumber('007')).toBe(7);
    expect(parseWholeNumber('')).toBeNaN();
    expect(parseWholeNumber('4,5')).toBeNaN();
    expect(parseWholeNumber('-3')).toBeNaN();
    expect(parseWholeNumber('1e3')).toBeNaN();
  });
});
