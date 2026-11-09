// O que precisa estar ligado para o acompanhamento funcionar e o que está
// faltando (spec 03, 5.7; doc 01, 6.9 e 6.10). Regra pura: quem chama lê as
// permissões e o serviço e decide o que mostrar.

/** Tempo para o serviço subir depois de pedido, sem acusar que ele parou. */
export const SERVICE_START_GRACE_MS = 15_000;

/** Quanto tempo o "Agora não" esconde o aviso de permissão nunca concedida. */
export const PROTECTION_NOTICE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

type PermissionValue = 'granted' | 'denied' | 'unsupported';

export type ProtectionPermissions = {
  readonly usageAccess: PermissionValue;
  readonly notifications: PermissionValue;
  readonly overlay: PermissionValue;
};

export type ProtectionPermission = keyof ProtectionPermissions;

/** Quais permissões já estiveram concedidas alguma vez. */
export type PermissionHistory = Readonly<Record<ProtectionPermission, boolean>>;

export type ProtectionService = {
  readonly active: boolean;
  readonly running: boolean;
  readonly startRequestedAt: number | null;
};

export type ProtectionNeeds = {
  /** Há check-in, preventivas ou avisos para entregar. */
  readonly notifications: boolean;
  /** Há apps para medir: o serviço precisa estar ligado. */
  readonly usageAccess: boolean;
  /** Há regra com tela de interrupção. */
  readonly overlay: boolean;
};

/** O que as regras ativas pedem. App de risco não declarado nunca tem tela (doc 01, 6.5.6). */
export function getProtectionNeeds(rules: {
  readonly compulsions: readonly unknown[];
  readonly moderationRules: readonly unknown[];
  readonly riskAppRules: readonly { readonly interruption: boolean }[];
}): ProtectionNeeds {
  return {
    notifications: rules.compulsions.length > 0,
    usageAccess: rules.moderationRules.length > 0 || rules.riskAppRules.length > 0,
    overlay: rules.moderationRules.length > 0 || rules.riskAppRules.some((r) => r.interruption),
  };
}

export type ServiceSituation =
  /** Nenhuma regra precisa do serviço. */
  | 'idle'
  /** Precisa, mas falta o acesso ao uso. */
  | 'needs_usage_access'
  /** Precisa, tem a permissão e não está rodando. */
  | 'stopped'
  | 'running';

export function getServiceSituation(
  needs: ProtectionNeeds,
  permissions: ProtectionPermissions,
  service: ProtectionService,
  now: number,
): ServiceSituation {
  if (!needs.usageAccess) return 'idle';
  if (permissions.usageAccess === 'denied') return 'needs_usage_access';
  if (service.active && service.running) return 'running';
  const starting =
    service.startRequestedAt !== null && now - service.startRequestedAt < SERVICE_START_GRACE_MS;
  return starting ? 'running' : 'stopped';
}

export type ProtectionIssue = 'notifications' | 'usageAccess' | 'overlay' | 'service';

/** O que está desligado e faz falta. Vazio: o aviso do Início some. */
export function getProtectionIssues(
  needs: ProtectionNeeds,
  permissions: ProtectionPermissions,
  service: ProtectionService,
  now: number,
): ProtectionIssue[] {
  const issues: ProtectionIssue[] = [];
  if (needs.notifications && permissions.notifications === 'denied') issues.push('notifications');
  if (needs.usageAccess && permissions.usageAccess === 'denied') issues.push('usageAccess');
  if (needs.overlay && permissions.overlay === 'denied') issues.push('overlay');
  if (getServiceSituation(needs, permissions, service, now) === 'stopped') issues.push('service');
  return issues;
}

const PROTECTION_PERMISSIONS = ['usageAccess', 'notifications', 'overlay'] as const;

/** Concedidas agora e ainda fora do histórico: o que falta registrar. */
export function getNewlyGrantedPermissions(
  permissions: ProtectionPermissions,
  history: PermissionHistory,
): ProtectionPermission[] {
  return PROTECTION_PERMISSIONS.filter((name) => permissions[name] === 'granted' && !history[name]);
}

export type ProtectionNotice = {
  /** `paused`: algo que funcionava parou. `activate`: falta só o que nunca foi concedido. */
  readonly kind: 'paused' | 'activate';
  readonly issues: readonly ProtectionIssue[];
};

/**
 * Qual aviso o Início mostra. O que parou tem prioridade e nunca fica escondido;
 * só o convite para ativar pode ser adiado. Relógio voltado para antes do
 * adiamento mostra o aviso: na dúvida, avisa.
 */
export function getProtectionNotice(
  issues: readonly ProtectionIssue[],
  history: PermissionHistory,
  dismissedAt: number | null,
  now: number,
): ProtectionNotice | null {
  if (issues.length === 0) return null;
  if (issues.some((issue) => issue === 'service' || history[issue])) {
    return { kind: 'paused', issues };
  }
  const elapsed = dismissedAt === null ? null : now - dismissedAt;
  const snoozed = elapsed !== null && elapsed >= 0 && elapsed < PROTECTION_NOTICE_SNOOZE_MS;
  return snoozed ? null : { kind: 'activate', issues };
}
