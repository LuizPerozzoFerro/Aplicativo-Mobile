// Valores técnicos das compulsões e mecânicas do MVP (doc 01, seção 3; spec 01,
// seções 4.6 e 4.7). São identificadores internos: podem ir para o banco e o
// código, mas nunca para logs, mensagens de erro ou fora do aparelho.

export const COMPULSION_TYPES = ['pornography', 'short_videos'] as const;
export type CompulsionType = (typeof COMPULSION_TYPES)[number];

export const COMPULSION_STATUSES = ['active', 'paused'] as const;
export type CompulsionStatus = (typeof COMPULSION_STATUSES)[number];

export const MONITORED_APP_ROLES = ['short_video', 'risk'] as const;
export type MonitoredAppRole = (typeof MONITORED_APP_ROLES)[number];

export const TRIGGER_KINDS = ['time', 'weekday', 'emotion'] as const;
export type TriggerKind = (typeof TRIGGER_KINDS)[number];

export const MECHANICS = ['abstinence', 'moderation'] as const;
export type Mechanic = (typeof MECHANICS)[number];

export type CompulsionDefinition = {
  readonly type: CompulsionType;
  readonly mechanic: Mechanic;
  /** Papéis que um app monitorado pode ter nesta compulsão. */
  readonly allowedAppRoles: readonly MonitoredAppRole[];
};

/**
 * As duas compulsões do MVP (doc 01, seção 3.1). Pornografia: abstinência,
 * vigiando apps de risco (6.5.6). Vídeos curtos: moderação, vigiando o tempo
 * nos apps de vídeo curto.
 */
export const COMPULSION_DEFINITIONS: { readonly [T in CompulsionType]: CompulsionDefinition } = {
  pornography: { type: 'pornography', mechanic: 'abstinence', allowedAppRoles: ['risk'] },
  short_videos: { type: 'short_videos', mechanic: 'moderation', allowedAppRoles: ['short_video'] },
};

export function getCompulsionDefinition(type: CompulsionType): CompulsionDefinition {
  return COMPULSION_DEFINITIONS[type];
}

export function isAppRoleAllowed(type: CompulsionType, role: MonitoredAppRole): boolean {
  return COMPULSION_DEFINITIONS[type].allowedAppRoles.includes(role);
}

/** Limite padrão de notificações proativas por dia (doc 01). */
export const DEFAULT_PROACTIVE_NOTIFICATION_DAILY_LIMIT = 6;
