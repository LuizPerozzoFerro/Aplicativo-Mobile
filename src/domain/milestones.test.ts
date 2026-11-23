import type { Catalog } from './catalog';
import { toDayKey } from './day';
import {
  findMilestone,
  getExpectedReaches,
  getMilestoneDays,
  getMilestoneTimeline,
  getStreakSegments,
  isReachAgain,
  planMilestoneReaches,
  type ReachPlan,
  type ReachPlanInput,
  type StoredReach,
} from './milestones';
import { MILESTONE_DAYS } from './streak';

// Fuso fixado em America/Sao_Paulo pelo jest.global-setup.js.
const local = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour);
const key = (year: number, month: number, day: number) => toDayKey(local(year, month, day));

const DAYS = [1, 3, 7, 14, 30];

function catalogWith(days: number[]): Catalog {
  return {
    formatVersion: 1,
    contentVersion: 1,
    updatedAt: '2026-11-22',
    compulsions: {
      short_videos: {
        milestones: days.map((day) => ({
          day,
          title: `Marco ${day}`,
          summary: 'Resumo',
          body: 'Texto',
          references: [],
          free: true,
          video: null,
        })),
      },
    },
  };
}

describe('dias dos marcos', () => {
  it('vêm do catálogo da compulsão', () => {
    expect(getMilestoneDays(catalogWith([2, 5, 9]), 'short_videos')).toEqual([2, 5, 9]);
  });

  it('compulsão fora do catálogo ou sem marcos: lista de reserva', () => {
    expect(getMilestoneDays(catalogWith([2]), 'pornography')).toEqual(MILESTONE_DAYS);
    expect(getMilestoneDays(catalogWith([]), 'short_videos')).toEqual(MILESTONE_DAYS);
  });

  it('acha o marco do dia, ou null', () => {
    expect(findMilestone(catalogWith([2, 5]), 'short_videos', 5)?.title).toBe('Marco 5');
    expect(findMilestone(catalogWith([2, 5]), 'short_videos', 4)).toBeNull();
    expect(findMilestone(catalogWith([2, 5]), 'pornography', 5)).toBeNull();
  });
});

describe('sequências', () => {
  const now = local(2026, 3, 20);

  it('sem quebras: uma sequência, desde o início, ainda aberta', () => {
    expect(getStreakSegments({ startedAt: local(2026, 3, 1, 9), eventDayKeys: [], now })).toEqual([
      { baseDayKey: '2026-03-01', endDayKey: null, baseIsBreak: false },
    ]);
  });

  it('cada quebra fecha a sequência anterior e abre um recomeço', () => {
    expect(
      getStreakSegments({
        startedAt: local(2026, 3, 1),
        eventDayKeys: ['2026-03-12', '2026-03-05', '2026-03-05'],
        now,
      }),
    ).toEqual([
      { baseDayKey: '2026-03-01', endDayKey: '2026-03-05', baseIsBreak: false },
      { baseDayKey: '2026-03-05', endDayKey: '2026-03-12', baseIsBreak: true },
      { baseDayKey: '2026-03-12', endDayKey: null, baseIsBreak: true },
    ]);
  });

  it('ignora eventos antes do início, no futuro e chaves inválidas', () => {
    expect(
      getStreakSegments({
        startedAt: local(2026, 3, 10),
        eventDayKeys: ['2026-03-02', '2026-03-25', '2026-02-30', 'ontem'],
        now,
      }),
    ).toEqual([{ baseDayKey: '2026-03-10', endDayKey: null, baseIsBreak: false }]);
  });

  it('quebra no dia do início não abre sequência nova, mas faz dela um recomeço', () => {
    expect(
      getStreakSegments({ startedAt: local(2026, 3, 10), eventDayKeys: ['2026-03-10'], now }),
    ).toEqual([{ baseDayKey: '2026-03-10', endDayKey: null, baseIsBreak: true }]);
  });
});

describe('alcances esperados de uma sequência', () => {
  it('até hoje, inclusive', () => {
    const segment = { baseDayKey: '2026-03-01', endDayKey: null, baseIsBreak: false };
    expect(getExpectedReaches(segment, DAYS, local(2026, 3, 8))).toEqual([
      { milestoneDay: 1, streakBaseDay: '2026-03-01', reachedOn: '2026-03-02' },
      { milestoneDay: 3, streakBaseDay: '2026-03-01', reachedOn: '2026-03-04' },
      { milestoneDay: 7, streakBaseDay: '2026-03-01', reachedOn: '2026-03-08' },
    ]);
  });

  it('o dia da quebra ainda conta para a sequência que termina nele', () => {
    const segment = { baseDayKey: '2026-03-01', endDayKey: '2026-03-08', baseIsBreak: false };
    expect(
      getExpectedReaches(segment, DAYS, local(2026, 3, 20)).map((reach) => reach.milestoneDay),
    ).toEqual([1, 3, 7]);
  });

  it('dias fora de ordem no catálogo são ordenados', () => {
    const segment = { baseDayKey: '2026-03-01', endDayKey: null, baseIsBreak: false };
    expect(
      getExpectedReaches(segment, [7, 1, 3], local(2026, 3, 5)).map((reach) => reach.milestoneDay),
    ).toEqual([1, 3]);
  });

  it('atravessa a troca de mês e de ano pelo calendário', () => {
    const segment = { baseDayKey: '2026-12-25', endDayKey: null, baseIsBreak: false };
    expect(getExpectedReaches(segment, [7], local(2027, 1, 1))).toEqual([
      { milestoneDay: 7, streakBaseDay: '2026-12-25', reachedOn: '2027-01-01' },
    ]);
  });
});

// Simula o banco: aplica o plano e devolve os alcances gravados.
function apply(stored: StoredReach[], plan: ReachPlan, at: Date): StoredReach[] {
  let nextId = Math.max(0, ...stored.map((reach) => reach.id)) + 1;
  const silenced = new Set(plan.silence);
  return [
    ...stored.map((reach) =>
      silenced.has(reach.id) && reach.celebratedAt === null
        ? { ...reach, celebratedAt: at }
        : reach,
    ),
    ...plan.add.map(({ celebrated, ...reach }) => ({
      ...reach,
      id: nextId++,
      celebratedAt: celebrated ? at : null,
    })),
  ];
}

function plan(input: Partial<ReachPlanInput> & Pick<ReachPlanInput, 'startedAt' | 'now'>) {
  return planMilestoneReaches({
    eventDayKeys: [],
    initialStreakDays: null,
    milestoneDays: DAYS,
    checkedOn: null,
    stored: [],
    ...input,
  });
}

const summary = (result: ReachPlan) =>
  result.add.map((reach) => `${reach.milestoneDay}:${reach.celebrated ? 'quieto' : 'celebrar'}`);

describe('alcances: o que gravar e o que celebrar', () => {
  it('primeira abertura da Fase 5: os do passado entram celebrados', () => {
    const result = plan({ startedAt: local(2026, 3, 1), now: local(2026, 3, 12) });
    expect(summary(result)).toEqual(['1:quieto', '3:quieto', '7:quieto']);
  });

  it('primeira abertura no dia de um marco: só o de hoje é celebrado', () => {
    const result = plan({ startedAt: local(2026, 3, 1), now: local(2026, 3, 8) });
    expect(summary(result)).toEqual(['1:quieto', '3:quieto', '7:celebrar']);
  });

  it('marco alcançado com o app fechado é celebrado quando o app abre', () => {
    const result = plan({
      startedAt: local(2026, 3, 1),
      now: local(2026, 3, 10),
      checkedOn: '2026-03-06',
      stored: [
        {
          id: 1,
          milestoneDay: 1,
          streakBaseDay: '2026-03-01',
          reachedOn: '2026-03-02',
          celebratedAt: local(2026, 3, 2),
        },
        {
          id: 2,
          milestoneDay: 3,
          streakBaseDay: '2026-03-01',
          reachedOn: '2026-03-04',
          celebratedAt: local(2026, 3, 4),
        },
      ],
    });
    expect(result.add).toEqual([
      { milestoneDay: 7, streakBaseDay: '2026-03-01', reachedOn: '2026-03-08', celebrated: false },
    ]);
  });

  it('início com "há N dias": os marcos até N entram sem celebração', () => {
    const startedOn = local(2026, 3, 10);
    const result = plan({
      startedAt: local(2026, 3, 2),
      initialStreakDays: 8,
      now: startedOn,
    });
    expect(summary(result)).toEqual(['1:quieto', '3:quieto', '7:quieto']);
  });

  it('início com "há 7 dias" no dia 7: o 7 também entra sem celebração', () => {
    const result = plan({
      startedAt: local(2026, 3, 1),
      initialStreakDays: 7,
      now: local(2026, 3, 8),
    });
    expect(summary(result)).toEqual(['1:quieto', '3:quieto', '7:quieto']);
  });

  it('depois do início com N dias, o marco seguinte é celebrado', () => {
    const result = plan({
      startedAt: local(2026, 3, 1),
      initialStreakDays: 7,
      now: local(2026, 3, 15),
      checkedOn: '2026-03-14',
      stored: [1, 3, 7].map((day, index) => ({
        id: index + 1,
        milestoneDay: day,
        streakBaseDay: '2026-03-01',
        reachedOn: key(2026, 3, 1 + day),
        celebratedAt: local(2026, 3, 8),
      })),
    });
    expect(summary(result)).toEqual(['14:celebrar']);
  });

  it('o 1 dia é celebrado na primeira sequência, mas não num recomeço', () => {
    expect(
      summary(
        plan({ startedAt: local(2026, 3, 1), now: local(2026, 3, 2), checkedOn: '2026-03-01' }),
      ),
    ).toEqual(['1:celebrar']);

    const afterBreak = plan({
      startedAt: local(2026, 3, 1),
      eventDayKeys: ['2026-03-05'],
      now: local(2026, 3, 6),
      checkedOn: '2026-03-05',
    });
    expect(afterBreak.add.filter((reach) => reach.streakBaseDay === '2026-03-05')).toEqual([
      { milestoneDay: 1, streakBaseDay: '2026-03-05', reachedOn: '2026-03-06', celebrated: true },
    ]);
  });

  it('recaída registrada hoje para ontem: o 1 dia de hoje não é celebrado', () => {
    const result = plan({
      startedAt: local(2026, 3, 1),
      eventDayKeys: ['2026-03-09'],
      now: local(2026, 3, 10),
      checkedOn: '2026-03-10',
    });
    expect(result.add.find((reach) => reach.reachedOn === '2026-03-10')).toEqual({
      milestoneDay: 1,
      streakBaseDay: '2026-03-09',
      reachedOn: '2026-03-10',
      celebrated: true,
    });
  });

  it('quebra no dia do início (moderação): o 1 dia seguinte não é celebrado', () => {
    const result = plan({
      startedAt: local(2026, 3, 1),
      eventDayKeys: ['2026-03-01'],
      now: local(2026, 3, 2),
      checkedOn: '2026-03-01',
    });
    expect(summary(result)).toEqual(['1:quieto']);
  });

  it('alcançado de novo depois de uma quebra: celebrado a partir do 3', () => {
    const result = plan({
      startedAt: local(2026, 2, 1),
      eventDayKeys: ['2026-03-01'],
      now: local(2026, 3, 4),
      checkedOn: '2026-03-03',
      stored: [1, 3, 7, 14].map((day, index) => ({
        id: index + 1,
        milestoneDay: day,
        streakBaseDay: '2026-02-01',
        reachedOn: toDayKey(new Date(2026, 1, 1 + day)),
        celebratedAt: local(2026, 2, 20),
      })),
    });
    expect(result.add).toEqual([
      { milestoneDay: 1, streakBaseDay: '2026-03-01', reachedOn: '2026-03-02', celebrated: true },
      { milestoneDay: 3, streakBaseDay: '2026-03-01', reachedOn: '2026-03-04', celebrated: false },
    ]);
  });

  it('marco alcançado no dia da quebra: fica gravado, sem celebração', () => {
    const result = plan({
      startedAt: local(2026, 3, 1),
      eventDayKeys: ['2026-03-08'],
      now: local(2026, 3, 8),
      checkedOn: '2026-03-07',
      stored: [1, 3].map((day, index) => ({
        id: index + 1,
        milestoneDay: day,
        streakBaseDay: '2026-03-01',
        reachedOn: key(2026, 3, 1 + day),
        celebratedAt: local(2026, 3, 4),
      })),
    });
    expect(result.add).toEqual([
      { milestoneDay: 7, streakBaseDay: '2026-03-01', reachedOn: '2026-03-08', celebrated: true },
    ]);
  });

  it('alcance gravado e não celebrado é silenciado quando a sequência quebra', () => {
    const stored: StoredReach[] = [
      {
        id: 5,
        milestoneDay: 7,
        streakBaseDay: '2026-03-01',
        reachedOn: '2026-03-08',
        celebratedAt: null,
      },
      {
        id: 6,
        milestoneDay: 3,
        streakBaseDay: '2026-02-01',
        reachedOn: '2026-02-04',
        celebratedAt: local(2026, 2, 4),
      },
    ];
    const result = plan({
      startedAt: local(2026, 3, 1),
      eventDayKeys: ['2026-03-08'],
      now: local(2026, 3, 8, 20),
      checkedOn: '2026-03-08',
      stored,
    });
    expect(result.silence).toEqual([5]);
  });

  it('alcance da sequência atual, ainda não celebrado, continua pendente', () => {
    const result = plan({
      startedAt: local(2026, 3, 1),
      now: local(2026, 3, 8, 20),
      checkedOn: '2026-03-08',
      stored: [
        {
          id: 5,
          milestoneDay: 7,
          streakBaseDay: '2026-03-01',
          reachedOn: '2026-03-08',
          celebratedAt: null,
        },
      ],
    });
    expect(result.silence).toEqual([]);
  });

  it('marco acrescentado ao catálogo, já ultrapassado: entra sem celebração atrasada', () => {
    const result = plan({
      startedAt: local(2026, 3, 1),
      milestoneDays: [2, ...DAYS],
      now: local(2026, 3, 10),
      checkedOn: '2026-03-09',
      stored: [1, 3, 7].map((day, index) => ({
        id: index + 1,
        milestoneDay: day,
        streakBaseDay: '2026-03-01',
        reachedOn: key(2026, 3, 1 + day),
        celebratedAt: local(2026, 3, 8),
      })),
    });
    expect(summary(result)).toEqual(['2:quieto']);
  });

  it('no dia do início, nada; com o início no futuro, nada', () => {
    expect(plan({ startedAt: local(2026, 3, 1, 9), now: local(2026, 3, 1, 22) }).add).toEqual([]);
    expect(plan({ startedAt: local(2026, 3, 5), now: local(2026, 3, 1) }).add).toEqual([]);
  });

  it('é idempotente: aplicado, o mesmo plano não grava mais nada', () => {
    const input = {
      startedAt: local(2026, 2, 1),
      eventDayKeys: ['2026-02-10', '2026-02-20'],
      now: local(2026, 3, 10),
      checkedOn: '2026-03-01',
    };
    const first = plan(input);
    const stored = apply([], first, local(2026, 3, 10));
    expect(plan({ ...input, stored })).toEqual({ add: [], silence: [] });
  });

  it('"Desfazer" uma quebra não apaga alcances; o órfão pendente é silenciado', () => {
    // Recaída em 08/03 virou base; o 1 dia dela foi gravado; depois a recaída foi desfeita.
    const stored: StoredReach[] = [
      {
        id: 1,
        milestoneDay: 1,
        streakBaseDay: '2026-03-01',
        reachedOn: '2026-03-02',
        celebratedAt: local(2026, 3, 2),
      },
      {
        id: 2,
        milestoneDay: 3,
        streakBaseDay: '2026-03-08',
        reachedOn: '2026-03-11',
        celebratedAt: null,
      },
    ];
    const result = plan({
      startedAt: local(2026, 3, 1),
      eventDayKeys: [],
      now: local(2026, 3, 11),
      checkedOn: '2026-03-11',
      stored,
    });
    expect(result.silence).toEqual([2]);
    expect(result.add.map((reach) => reach.milestoneDay)).toEqual([3, 7]);
  });
});

describe('alcance de novo', () => {
  it('é de novo quando o mesmo marco foi alcançado antes, em outra sequência', () => {
    const before = { milestoneDay: 7, streakBaseDay: '2026-02-01', reachedOn: '2026-02-08' };
    const now = { id: 9, milestoneDay: 7, streakBaseDay: '2026-03-01', reachedOn: '2026-03-08' };
    expect(isReachAgain(now, [before, now])).toBe(true);
    expect(isReachAgain(now, [now])).toBe(false);
    expect(isReachAgain({ ...before, id: 1 }, [before, now])).toBe(false);
  });
});

describe('linha do tempo', () => {
  it('quatro estados: alcançado nesta sequência, desbloqueado antes, próximo, futuro', () => {
    expect(
      getMilestoneTimeline({
        milestoneDays: DAYS,
        streakDays: 4,
        reaches: [
          { milestoneDay: 1 },
          { milestoneDay: 3 },
          { milestoneDay: 7 },
          { milestoneDay: 14 },
        ],
      }),
    ).toEqual([
      { day: 1, status: 'reached', unlocked: true },
      { day: 3, status: 'reached', unlocked: true },
      { day: 7, status: 'next', unlocked: true },
      { day: 14, status: 'future', unlocked: true },
      { day: 30, status: 'future', unlocked: false },
    ]);
  });

  it('streak 0 e nada alcançado: o primeiro é o próximo', () => {
    expect(getMilestoneTimeline({ milestoneDays: [3, 1], streakDays: 0, reaches: [] })).toEqual([
      { day: 1, status: 'next', unlocked: false },
      { day: 3, status: 'future', unlocked: false },
    ]);
  });

  it('depois do último, todos alcançados e nenhum próximo', () => {
    expect(
      getMilestoneTimeline({ milestoneDays: [1, 3], streakDays: 40, reaches: [] }).map(
        (item) => item.status,
      ),
    ).toEqual(['reached', 'reached']);
  });
});
