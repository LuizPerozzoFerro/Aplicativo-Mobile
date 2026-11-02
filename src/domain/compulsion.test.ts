import {
  COMPULSION_DEFINITIONS,
  COMPULSION_TYPES,
  MECHANICS,
  getCompulsionDefinition,
  isAppRoleAllowed,
} from './compulsion';

describe('definições das compulsões do MVP', () => {
  it('existe uma definição para cada tipo, com o próprio tipo', () => {
    expect(Object.keys(COMPULSION_DEFINITIONS).sort()).toEqual([...COMPULSION_TYPES].sort());
    for (const type of COMPULSION_TYPES) {
      expect(getCompulsionDefinition(type).type).toBe(type);
    }
  });

  it('pornografia é abstinência e só vigia apps de risco', () => {
    expect(getCompulsionDefinition('pornography').mechanic).toBe('abstinence');
    expect(isAppRoleAllowed('pornography', 'risk')).toBe(true);
    expect(isAppRoleAllowed('pornography', 'short_video')).toBe(false);
  });

  it('vídeos curtos é moderação e só vigia apps de vídeo curto', () => {
    expect(getCompulsionDefinition('short_videos').mechanic).toBe('moderation');
    expect(isAppRoleAllowed('short_videos', 'short_video')).toBe(true);
    expect(isAppRoleAllowed('short_videos', 'risk')).toBe(false);
  });

  it('as duas mecânicas estão em uso', () => {
    const used = new Set(COMPULSION_TYPES.map((type) => getCompulsionDefinition(type).mechanic));
    expect([...used].sort()).toEqual([...MECHANICS].sort());
  });
});
