// Regras do momento (spec 03, tabela da seção 5.2). Quem executa no aparelho
// é o Kotlin (`MomentRules.kt`), porque elas precisam rodar sem o JavaScript
// (spec 03, 4.1). Esta versão é a referência em TypeScript: não entra no
// bundle do app. Ela existe para o Jest rodar os mesmos vetores que o JUnit
// (`src/domain/vectors/moment-rules.json`), e as duas não podem divergir.
// Mudou aqui, muda lá, e os vetores acompanham.

export const PAUSE_MS = 5 * 60 * 1000;
export const EXIT_GRACE_MS = 3 * 1000;
export const CONTINUES_TO_STOP = 3;
export const INTERRUPTIONS_TO_IGNORE = 3;

export type ModerationRule = {
  readonly compulsionId: number;
  readonly targets: readonly string[];
  readonly limitMs: number;
  /** Limite que vale só naquele dia: o de antes de um aumento (src/domain/dailyLimit.ts). */
  readonly todayLimit?: { readonly dayKey: string; readonly limitMs: number } | null;
};

export type RiskRule = {
  readonly compulsionId: number;
  readonly target: string;
  readonly limitMs: number;
  /** O usuário declarou consumir o conteúdo neste app: só então há tela. */
  readonly interruption: boolean;
};

export type MomentConfig = {
  readonly moderation: readonly ModerationRule[];
  readonly risk: readonly RiskRule[];
};

export type MomentTick = {
  readonly now: number;
  readonly dayKey: string;
  /** Uso de hoje, em milissegundos, por app. */
  readonly usage: Readonly<Record<string, number>>;
  /** App na frente, ou nulo. */
  readonly foreground: string | null;
  /** A tela não pode ser pedida agora: já aberta, em recuo ou numa chamada. */
  readonly blocked: boolean;
};

export type MomentAction =
  | {
      readonly type: 'limit_reached';
      readonly compulsionId: number;
      readonly target: string | null;
    }
  | {
      readonly type: 'show_interruption';
      readonly compulsionId: number;
      readonly target: string;
      readonly canIgnore: boolean;
      readonly warnsEndOfDay: boolean;
    }
  | {
      readonly type: 'day_failed';
      readonly compulsionId: number;
      readonly reason: 'third_continue' | 'ignored_limit';
    };

export type MomentResponse = 'emergency' | 'home' | 'continue' | 'ignore_today';

export type CompulsionMoment = {
  readonly interruptions: number;
  readonly continues: number;
  /** Fim da pausa; 0 sem pausa. */
  readonly pausedUntil: number;
  /** Dia reprovado (moderação) ou telas encerradas (abstinência), até a meia-noite. */
  readonly stopped: boolean;
  /** Quando a compulsão atingiu o limite somado (moderação); nulo antes disso. */
  readonly reachedAt: number | null;
};

export type MomentState = {
  readonly dayKey: string | null;
  readonly compulsions: Readonly<Record<number, CompulsionMoment>>;
  /** Quando cada app de risco atingiu o limite no dia. */
  readonly riskReachedAt: Readonly<Record<string, number>>;
  readonly lastExitAt: number;
};

const NO_MOMENT: CompulsionMoment = {
  interruptions: 0,
  continues: 0,
  pausedUntil: 0,
  stopped: false,
  reachedAt: null,
};

export function createMomentState(): MomentState {
  return { dayKey: null, compulsions: {}, riskReachedAt: {}, lastExitAt: 0 };
}

export function getCompulsionMoment(state: MomentState, compulsionId: number): CompulsionMoment {
  return state.compulsions[compulsionId] ?? NO_MOMENT;
}

/** A borda do dia zera tudo: contagens, pausa, avisos e carência (spec 03, 5.2). */
function forDay(state: MomentState, dayKey: string): MomentState {
  return state.dayKey === dayKey ? state : { ...createMomentState(), dayKey };
}

function withCompulsion(
  state: MomentState,
  compulsionId: number,
  change: Partial<CompulsionMoment>,
): MomentState {
  return {
    ...state,
    compulsions: {
      ...state.compulsions,
      [compulsionId]: { ...getCompulsionMoment(state, compulsionId), ...change },
    },
  };
}

/** O limite da regra no dia: um aumento só vale a partir do dia seguinte. */
const moderationLimit = (rule: ModerationRule, dayKey: string) =>
  rule.todayLimit?.dayKey === dayKey ? rule.todayLimit.limitMs : rule.limitMs;

const usedMs = (usage: MomentTick['usage'], targets: readonly string[]) =>
  targets.reduce((total, target) => total + (usage[target] ?? 0), 0);

type Candidate = { compulsionId: number; reachedAt: number; moderation: boolean };

/** Uma verificação do serviço. Devolve o novo estado e o que fazer agora. */
export function momentTick(
  config: MomentConfig,
  previous: MomentState,
  tick: MomentTick,
): { state: MomentState; actions: MomentAction[] } {
  let state = forDay(previous, tick.dayKey);
  const actions: MomentAction[] = [];

  for (const rule of config.moderation) {
    const moment = getCompulsionMoment(state, rule.compulsionId);
    if (
      usedMs(tick.usage, rule.targets) >= moderationLimit(rule, tick.dayKey) &&
      moment.reachedAt === null
    ) {
      state = withCompulsion(state, rule.compulsionId, { reachedAt: tick.now });
      actions.push({ type: 'limit_reached', compulsionId: rule.compulsionId, target: null });
    }
  }
  for (const rule of config.risk) {
    if (
      usedMs(tick.usage, [rule.target]) >= rule.limitMs &&
      !(rule.target in state.riskReachedAt)
    ) {
      state = {
        ...state,
        riskReachedAt: { ...state.riskReachedAt, [rule.target]: tick.now },
      };
      actions.push({ type: 'limit_reached', compulsionId: rule.compulsionId, target: rule.target });
    }
  }

  const show = chooseInterruption(config, state, tick);
  if (show) actions.push(show);
  return { state, actions };
}

function chooseInterruption(
  config: MomentConfig,
  state: MomentState,
  tick: MomentTick,
): MomentAction | null {
  const { foreground } = tick;
  if (foreground === null) return null;

  const candidates: Candidate[] = [];
  for (const rule of config.moderation) {
    const moment = getCompulsionMoment(state, rule.compulsionId);
    if (
      rule.targets.includes(foreground) &&
      moment.reachedAt !== null &&
      !moment.stopped &&
      usedMs(tick.usage, rule.targets) >= moderationLimit(rule, tick.dayKey)
    ) {
      candidates.push({
        compulsionId: rule.compulsionId,
        reachedAt: moment.reachedAt,
        moderation: true,
      });
    }
  }
  for (const rule of config.risk) {
    const reachedAt = state.riskReachedAt[rule.target];
    if (
      rule.target === foreground &&
      rule.interruption &&
      reachedAt !== undefined &&
      !getCompulsionMoment(state, rule.compulsionId).stopped &&
      usedMs(tick.usage, [rule.target]) >= rule.limitMs
    ) {
      candidates.push({ compulsionId: rule.compulsionId, reachedAt, moderation: false });
    }
  }

  // Uma tela só: a da compulsão que atingiu primeiro. Enquanto ela estiver
  // ativa, mesmo em pausa, a outra não entra no lugar.
  const [first] = candidates.sort(
    (a, b) => a.reachedAt - b.reachedAt || a.compulsionId - b.compulsionId,
  );
  if (!first) return null;

  // Na verificação em que atingiu, só o aviso; a tela vem na seguinte.
  if (first.reachedAt === tick.now) return null;
  const moment = getCompulsionMoment(state, first.compulsionId);
  if (moment.pausedUntil > tick.now) return null;
  if (tick.blocked) return null;
  if (state.lastExitAt > 0 && tick.now - state.lastExitAt < EXIT_GRACE_MS) return null;

  return {
    type: 'show_interruption',
    compulsionId: first.compulsionId,
    target: foreground,
    canIgnore: first.moderation && moment.interruptions + 1 >= INTERRUPTIONS_TO_IGNORE,
    warnsEndOfDay: first.moderation && moment.continues === CONTINUES_TO_STOP - 1,
  };
}

/** A tela de fato apareceu (I-28): só aí ela conta. */
export function momentShown(
  previous: MomentState,
  compulsionId: number,
  dayKey: string,
): MomentState {
  const state = forDay(previous, dayKey);
  return withCompulsion(state, compulsionId, {
    interruptions: getCompulsionMoment(state, compulsionId).interruptions + 1,
  });
}

/** A tela saiu sem resposta (chamada, usuário foi embora): só a carência. */
export function momentExited(previous: MomentState, now: number, dayKey: string): MomentState {
  return { ...forDay(previous, dayKey), lastExitAt: now };
}

/** O usuário respondeu na tela. */
export function momentRespond(
  config: MomentConfig,
  previous: MomentState,
  input: {
    readonly compulsionId: number;
    readonly response: MomentResponse;
    readonly now: number;
    readonly dayKey: string;
  },
): { state: MomentState; actions: MomentAction[] } {
  const { compulsionId, response, now, dayKey } = input;
  const moderation = config.moderation.some((rule) => rule.compulsionId === compulsionId);
  const risk = config.risk.some((rule) => rule.compulsionId === compulsionId);
  if (!moderation && !risk) return { state: previous, actions: [] };

  let state = forDay(previous, dayKey);
  const moment = getCompulsionMoment(state, compulsionId);

  if (response === 'ignore_today') {
    // O botão só existe na moderação, a partir da 3ª tela.
    if (!moderation || moment.interruptions < INTERRUPTIONS_TO_IGNORE || moment.stopped) {
      return { state, actions: [] };
    }
    state = withCompulsion({ ...state, lastExitAt: now }, compulsionId, { stopped: true });
    return { state, actions: [{ type: 'day_failed', compulsionId, reason: 'ignored_limit' }] };
  }

  state = { ...state, lastExitAt: now };
  if (response !== 'continue') return { state, actions: [] };

  const continues = moment.continues + 1;
  const stops = continues >= CONTINUES_TO_STOP && !moment.stopped;
  state = withCompulsion(state, compulsionId, {
    continues,
    pausedUntil: now + PAUSE_MS,
    stopped: moment.stopped || stops,
  });
  return {
    state,
    actions:
      stops && moderation ? [{ type: 'day_failed', compulsionId, reason: 'third_continue' }] : [],
  };
}
