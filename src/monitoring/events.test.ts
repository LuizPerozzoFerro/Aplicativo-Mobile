import { parseNativeEvents } from './events';

const base = { at: 1_794_070_000_000, dayKey: '2026-11-07' };

describe('parseNativeEvents', () => {
  it('aceita cada tipo de evento com os seus campos, na ordem', () => {
    const raw = [
      { id: 'a', ...base, type: 'service_started', origin: 'boot' },
      { id: 'b', ...base, type: 'limit_reached', compulsionId: 2, targetId: null },
      { id: 'c', ...base, type: 'limit_reached', compulsionId: 1, targetId: 'com.example.forum' },
      { id: 'd', ...base, type: 'notification_sent', kind: 'check_in' },
      {
        id: 'e',
        ...base,
        type: 'interruption_shown',
        compulsionId: 2,
        targetId: 'com.example.clips',
      },
      {
        id: 'f',
        ...base,
        type: 'interruption_response',
        interruptionId: 'e',
        compulsionId: 2,
        response: 'continue',
      },
      { id: 'g', ...base, type: 'day_failed', compulsionId: 2, reason: 'ignored_limit' },
      { id: 'h', ...base, type: 'check_in_answered', compulsionId: 1, answer: 'relapse' },
      { id: 'i', ...base, type: 'emergency_requested', source: 'notification' },
      { id: 'j', ...base, type: 'permission_lost', permission: 'overlay' },
    ];
    const { events, invalidIds } = parseNativeEvents(raw);
    expect(invalidIds).toEqual([]);
    expect(events).toEqual(raw);
  });

  it('o targetId ausente no limite vira nulo', () => {
    const { events } = parseNativeEvents([
      { id: 'a', ...base, type: 'limit_reached', compulsionId: 2 },
    ]);
    expect(events).toEqual([
      { id: 'a', ...base, type: 'limit_reached', compulsionId: 2, targetId: null },
    ]);
  });

  it('não leva campos que não pertencem ao tipo', () => {
    const { events } = parseNativeEvents([
      { id: 'a', ...base, type: 'service_started', origin: 'app', extra: 'x' },
    ]);
    expect(events).toEqual([{ id: 'a', ...base, type: 'service_started', origin: 'app' }]);
  });

  it.each([
    ['tipo desconhecido', { type: 'usage_spike' }],
    ['origem fora da lista', { type: 'service_started', origin: 'widget' }],
    ['compulsão não inteira', { type: 'day_failed', compulsionId: 1.5, reason: 'ignored_limit' }],
    ['motivo fora da lista', { type: 'day_failed', compulsionId: 1, reason: 'tired' }],
    ['resposta fora da lista', { type: 'check_in_answered', compulsionId: 1, answer: 'maybe' }],
    ['tela sem app', { type: 'interruption_shown', compulsionId: 2 }],
    ['resposta sem a tela', { type: 'interruption_response', compulsionId: 2, response: 'home' }],
    ['permissão fora da lista', { type: 'permission_lost', permission: 'camera' }],
    ['dia fora do formato', { type: 'service_started', origin: 'app', dayKey: '07/11/2026' }],
    ['dia inexistente', { type: 'service_started', origin: 'app', dayKey: '2026-02-30' }],
    ['instante não numérico', { type: 'service_started', origin: 'app', at: 'agora' }],
  ])('separa como inválido: %s', (_name, fields) => {
    const { events, invalidIds } = parseNativeEvents([
      { id: 'bom', ...base, type: 'service_started', origin: 'app' },
      { id: 'ruim', ...base, ...fields },
    ]);
    expect(events.map((event) => event.id)).toEqual(['bom']);
    expect(invalidIds).toEqual(['ruim']);
  });

  it('descarta sem id o que não tem como ser apagado, e aceita lista que não é lista', () => {
    expect(
      parseNativeEvents([{ ...base, type: 'service_started', origin: 'app' }, 'x', null]),
    ).toEqual({ events: [], invalidIds: [] });
    expect(parseNativeEvents({ id: 'a' })).toEqual({ events: [], invalidIds: [] });
  });
});
