import fs from 'node:fs';
import path from 'node:path';

import {
  DAILY_LIMIT_OPTIONS,
  DEFAULT_DAILY_LIMIT_MINUTES,
  ONBOARDING_STEPS,
  getMotivationLength,
  getMotivationProblem,
  getNextOnboardingStep,
  getPreviousOnboardingStep,
  isOnboardingStep,
  isValidDailyLimit,
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
