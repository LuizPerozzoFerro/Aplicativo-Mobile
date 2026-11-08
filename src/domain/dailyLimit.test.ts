import {
  applyDailyLimitChange,
  getDailyLimitToday,
  isDailyLimitIncrease,
  type DailyLimitState,
} from './dailyLimit';

const TODAY = '2026-11-08';
const TOMORROW = '2026-11-09';

const limit = (minutes: number | null): DailyLimitState => ({
  dailyLimitMinutes: minutes,
  previousDailyLimitMinutes: null,
  dailyLimitRaisedOn: null,
});

describe('mudança do limite diário', () => {
  it('aumentar: hoje segue o limite antigo; amanhã vale o novo', () => {
    const raised = applyDailyLimitChange(limit(45), 60, TODAY);
    expect(raised).toEqual({
      dailyLimitMinutes: 60,
      previousDailyLimitMinutes: 45,
      dailyLimitRaisedOn: TODAY,
    });
    expect(getDailyLimitToday(raised, TODAY)).toBe(45);
    expect(getDailyLimitToday(raised, TOMORROW)).toBe(60);
  });

  it('diminuir vale na hora', () => {
    const lowered = applyDailyLimitChange(limit(45), 30, TODAY);
    expect(lowered).toEqual(limit(30));
    expect(getDailyLimitToday(lowered, TODAY)).toBe(30);
  });

  it('manter o valor não muda nada', () => {
    expect(applyDailyLimitChange(limit(45), 45, TODAY)).toEqual(limit(45));
  });

  it('aumentar duas vezes no dia: hoje continua o limite que valia de manhã', () => {
    const twice = applyDailyLimitChange(applyDailyLimitChange(limit(45), 60, TODAY), 90, TODAY);
    expect(twice.dailyLimitMinutes).toBe(90);
    expect(getDailyLimitToday(twice, TODAY)).toBe(45);
    expect(getDailyLimitToday(twice, TOMORROW)).toBe(90);
  });

  it('aumentar e depois reduzir, ainda acima do de hoje: amanhã vale o último', () => {
    const state = applyDailyLimitChange(applyDailyLimitChange(limit(45), 90, TODAY), 60, TODAY);
    expect(getDailyLimitToday(state, TODAY)).toBe(45);
    expect(getDailyLimitToday(state, TOMORROW)).toBe(60);
  });

  it('aumentar e depois reduzir abaixo do de hoje: a redução vale na hora', () => {
    const state = applyDailyLimitChange(applyDailyLimitChange(limit(45), 90, TODAY), 30, TODAY);
    expect(state).toEqual(limit(30));
  });

  it('reduzir e depois voltar a aumentar no mesmo dia não recupera o limite antigo', () => {
    const state = applyDailyLimitChange(applyDailyLimitChange(limit(45), 30, TODAY), 45, TODAY);
    expect(getDailyLimitToday(state, TODAY)).toBe(30);
    expect(getDailyLimitToday(state, TOMORROW)).toBe(45);
  });

  it('um aumento de ontem já não segura nada', () => {
    const raised = applyDailyLimitChange(limit(45), 60, TODAY);
    const next = applyDailyLimitChange(raised, 90, TOMORROW);
    expect(next).toEqual({
      dailyLimitMinutes: 90,
      previousDailyLimitMinutes: 60,
      dailyLimitRaisedOn: TOMORROW,
    });
  });

  it('sem limite anterior, nada a segurar', () => {
    expect(getDailyLimitToday(limit(null), TODAY)).toBeNull();
    expect(isDailyLimitIncrease(limit(null), 30, TODAY)).toBe(false);
    expect(applyDailyLimitChange(limit(null), 30, TODAY)).toEqual(limit(30));
  });

  it('diz quando o novo valor é um aumento em relação ao limite em vigor', () => {
    expect(isDailyLimitIncrease(limit(45), 60, TODAY)).toBe(true);
    expect(isDailyLimitIncrease(limit(45), 45, TODAY)).toBe(false);
    expect(isDailyLimitIncrease(limit(45), 30, TODAY)).toBe(false);
    const raised = applyDailyLimitChange(limit(45), 60, TODAY);
    expect(isDailyLimitIncrease(raised, 60, TODAY)).toBe(true);
  });
});
