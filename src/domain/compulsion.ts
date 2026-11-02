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

/** Limite padrão de notificações proativas por dia (doc 01). */
export const DEFAULT_PROACTIVE_NOTIFICATION_DAILY_LIMIT = 6;
