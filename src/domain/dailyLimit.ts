// Mudança do limite diário de vídeos curtos (decisão do responsável,
// 08/11/2026): aumentar só vale a partir do dia seguinte, e diminuir vale na
// hora. Sem isso, aumentar o limite seria um jeito de escapar do alerta do dia.

export type DailyLimitState = {
  readonly dailyLimitMinutes: number | null;
  /** O limite que continua valendo no dia do aumento. */
  readonly previousDailyLimitMinutes: number | null;
  /** Dia (AAAA-MM-DD) em que o limite foi aumentado; nulo sem aumento pendente. */
  readonly dailyLimitRaisedOn: string | null;
};

/** O limite em vigor no dia: o de antes do aumento, se ele foi aumentado nesse mesmo dia. */
export function getDailyLimitToday(state: DailyLimitState, todayKey: string): number | null {
  const { dailyLimitMinutes, previousDailyLimitMinutes, dailyLimitRaisedOn } = state;
  if (
    dailyLimitMinutes === null ||
    previousDailyLimitMinutes === null ||
    dailyLimitRaisedOn !== todayKey
  ) {
    return dailyLimitMinutes;
  }
  return Math.min(previousDailyLimitMinutes, dailyLimitMinutes);
}

/** O novo valor é maior que o limite em vigor hoje, e por isso só vale amanhã? */
export function isDailyLimitIncrease(
  state: DailyLimitState,
  minutes: number,
  todayKey: string,
): boolean {
  const today = getDailyLimitToday(state, todayKey);
  return today !== null && minutes > today;
}

/** O estado depois de o usuário escolher `minutes` pelo Perfil. */
export function applyDailyLimitChange(
  state: DailyLimitState,
  minutes: number,
  todayKey: string,
): DailyLimitState {
  if (!isDailyLimitIncrease(state, minutes, todayKey)) {
    return {
      dailyLimitMinutes: minutes,
      previousDailyLimitMinutes: null,
      dailyLimitRaisedOn: null,
    };
  }
  return {
    dailyLimitMinutes: minutes,
    previousDailyLimitMinutes: getDailyLimitToday(state, todayKey),
    dailyLimitRaisedOn: todayKey,
  };
}
