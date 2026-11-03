import { createOnboardingProgress } from './onboardingProgress';

describe('progresso do onboarding', () => {
  it('começa sem etapa e, ligado ao banco, carrega a etapa gravada', () => {
    const progress = createOnboardingProgress();
    expect(progress.getStep()).toBeNull();
    progress.connect({ load: () => 'setup', save: jest.fn() });
    expect(progress.getStep()).toBe('setup');
  });

  it('grava no banco a cada mudança', () => {
    const save = jest.fn();
    const progress = createOnboardingProgress();
    progress.connect({ load: () => null, save });
    progress.setStep('triggers');
    progress.setStep(null);
    expect(save.mock.calls).toEqual([['triggers'], [null]]);
  });

  it('se a gravação falhar, a etapa não muda (e quem chamou não navega)', () => {
    const progress = createOnboardingProgress();
    progress.connect({
      load: () => 'compulsions',
      save: () => {
        throw new Error('disco cheio');
      },
    });
    expect(() => progress.setStep('setup')).toThrow('disco cheio');
    expect(progress.getStep()).toBe('compulsions');
  });

  it('a etapa para retomar vale até a retomada ser marcada', () => {
    const progress = createOnboardingProgress();
    progress.connect({ load: () => 'motivation', save: jest.fn() });
    expect(progress.getResumeStep()).toBe('motivation');
    expect(progress.getResumeStep()).toBe('motivation');
    progress.markResumed();
    expect(progress.getResumeStep()).toBeNull();
    expect(progress.getStep()).toBe('motivation');
  });

  it('uma nova abertura (connect) volta a retomar', () => {
    const progress = createOnboardingProgress();
    progress.connect({ load: () => 'setup', save: jest.fn() });
    progress.markResumed();
    progress.connect({ load: () => 'triggers', save: jest.fn() });
    expect(progress.getResumeStep()).toBe('triggers');
  });
});
