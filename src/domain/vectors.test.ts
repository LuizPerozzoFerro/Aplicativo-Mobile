import { startOfDay, startOfNextDay, toDayKey } from './day';
import {
  createMomentState,
  getCompulsionMoment,
  momentRespond,
  momentShown,
  momentTick,
  type MomentAction,
  type MomentConfig,
  type MomentResponse,
  type MomentState,
} from './momentRules';
import dayBoundary from './vectors/day-boundary.json';
import momentRules from './vectors/moment-rules.json';

// Os mesmos vetores rodam no JUnit (MomentRulesVectorsTest e
// DayBoundaryVectorsTest), contra o Kotlin que executa no aparelho (spec 03, 4.1).

const SECOND = 1000;
const MINUTE = 60 * SECOND;

type VectorConfig = {
  moderation: { compulsionId: number; targets: string[]; limitMinutes: number }[];
  risk: { compulsionId: number; target: string; limitMinutes: number; interruption: boolean }[];
};

type VectorStep = {
  config?: VectorConfig;
  tick?: {
    t: number;
    day: string;
    usage: Record<string, number>;
    foreground: string | null;
    blocked: boolean;
  };
  shown?: { t: number; day: string; compulsionId: number };
  respond?: { t: number; day: string; compulsionId: number; response: MomentResponse };
  expect?: MomentAction[];
  state?: Record<string, { interruptions: number; continues: number; stopped: boolean }>;
};

type VectorScenario = { name: string; config: VectorConfig; steps: VectorStep[] };

function toConfig(config: VectorConfig): MomentConfig {
  return {
    moderation: config.moderation.map(({ limitMinutes, ...rule }) => ({
      ...rule,
      limitMs: limitMinutes * MINUTE,
    })),
    risk: config.risk.map(({ limitMinutes, ...rule }) => ({
      ...rule,
      limitMs: limitMinutes * MINUTE,
    })),
  };
}

// Instantes reais só para o relógio não começar em zero.
const EPOCH = 1_794_000_000_000;

function runScenario({ config: first, steps }: VectorScenario) {
  let config = toConfig(first);
  let state: MomentState = createMomentState();

  for (const [index, step] of steps.entries()) {
    let actions: MomentAction[] = [];
    if (step.config) {
      config = toConfig(step.config);
    } else if (step.tick) {
      const { t, day, usage, foreground, blocked } = step.tick;
      const result = momentTick(config, state, {
        now: EPOCH + t * SECOND,
        dayKey: day,
        usage: Object.fromEntries(
          Object.entries(usage).map(([target, minutes]) => [target, minutes * MINUTE]),
        ),
        foreground,
        blocked,
      });
      state = result.state;
      actions = result.actions;
    } else if (step.shown) {
      state = momentShown(state, step.shown.compulsionId, step.shown.day);
    } else if (step.respond) {
      const { t, day, compulsionId, response } = step.respond;
      const result = momentRespond(config, state, {
        compulsionId,
        response,
        now: EPOCH + t * SECOND,
        dayKey: day,
      });
      state = result.state;
      actions = result.actions;
    }

    const where = `passo ${index}`;
    expect({ where, actions }).toEqual({ where, actions: step.expect ?? [] });
    for (const [id, counts] of Object.entries(step.state ?? {})) {
      const { interruptions, continues, stopped } = getCompulsionMoment(state, Number(id));
      expect({ where, id, interruptions, continues, stopped }).toEqual({ where, id, ...counts });
    }
  }
}

describe('vetores das regras do momento', () => {
  const scenarios = momentRules.scenarios as unknown as VectorScenario[];

  it('há cenários para rodar', () => {
    expect(scenarios.length).toBeGreaterThan(20);
  });

  it.each(scenarios.map((scenario) => [scenario.name, scenario] as const))(
    '%s',
    (_name, scenario) => runScenario(scenario),
  );
});

describe('vetores da borda do dia', () => {
  it('são do fuso em que o Jest roda', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(dayBoundary.zone);
  });

  it.each(dayBoundary.cases.map((item) => [item.name, item] as const))('%s', (_name, item) => {
    const instant = new Date(item.instant);
    expect(toDayKey(instant)).toBe(item.dayKey);
    expect(startOfDay(instant).toISOString()).toBe(item.startOfDay);
    expect(startOfNextDay(instant).toISOString()).toBe(item.startOfNextDay);
  });
});
