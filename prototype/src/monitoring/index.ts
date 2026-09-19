import LabMonitoring from '../../modules/lab-monitoring';
import {
  type AdultContentWatchConfig,
  type DomainWatchStatus,
  type VpnPermissionResult,
  type LogEvent,
  type MonitoringModule,
  type PermissionStatus,
  type SelectionSummary,
  type UsageEntry,
  type UsageLimitConfig,
  type UsageLimitStatus,
  type NotificationPermissionResult,
  type OverlayPermissionResult,
  type Unsupported,
} from './types';

/**
 * Implementacao unica sobre o modulo nativo. As diferencas entre iOS e Android
 * ficam dentro do modulo, nao aqui (CLAUDE.md secao 8.3).
 */
const monitoring: MonitoringModule = {
  async getPermissionStatus(): Promise<PermissionStatus> {
    return LabMonitoring.getPermissionStatus();
  },

  async requestPermissions(): Promise<PermissionStatus> {
    const result = await LabMonitoring.requestUsageAccess();
    // A concessao acontece fora do app, entao o status de notificacao vem da
    // leitura corrente, nao do resultado deste pedido.
    const current = LabMonitoring.getPermissionStatus();
    return {
      usageAccess: result.usageAccess,
      notifications: current.notifications,
      overlay: current.overlay,
      vpn: current.vpn,
    };
  },

  async selectTargets(): Promise<SelectionSummary | Unsupported> {
    const apps = await LabMonitoring.listInstalledApps();
    if (apps === 'unsupported') {
      return 'unsupported';
    }
    return { apps };
  },

  async startUsageLimit(config: UsageLimitConfig): Promise<void> {
    return LabMonitoring.startUsageLimit(
      config.minutes,
      config.packages,
      config.message,
      config.interruptionMode,
      config.pauseMinutes
    );
  },

  async stopUsageLimit(): Promise<void> {
    return LabMonitoring.stopUsageLimit();
  },

  async getUsageLimitStatus(): Promise<UsageLimitStatus> {
    return LabMonitoring.getUsageLimitStatus();
  },

  async openNotificationSettings(): Promise<boolean> {
    return LabMonitoring.openNotificationSettings();
  },

  async requestNotificationPermission(): Promise<NotificationPermissionResult> {
    return LabMonitoring.requestNotificationPermission();
  },

  async requestOverlayPermission(): Promise<OverlayPermissionResult> {
    return LabMonitoring.requestOverlayPermission();
  },

  async hideInterruption(): Promise<void> {
    return LabMonitoring.hideInterruption();
  },

  async sendTestAlert(): Promise<void> {
    return LabMonitoring.sendTestAlert();
  },

  async requestVpnPermission(): Promise<VpnPermissionResult> {
    return LabMonitoring.requestVpnPermission();
  },

  async startAdultContentWatch(config: AdultContentWatchConfig): Promise<void> {
    return LabMonitoring.startAdultContentWatch(
      config.mode,
      config.domains,
      config.socialDomains
    );
  },

  async stopAdultContentWatch(): Promise<void> {
    return LabMonitoring.stopAdultContentWatch();
  },

  async getDomainWatchStatus(): Promise<DomainWatchStatus> {
    return LabMonitoring.getDomainWatchStatus();
  },

  async getUsageToday(): Promise<UsageEntry[] | Unsupported> {
    return LabMonitoring.getUsageToday();
  },

  async getUsageTodayFromEvents(): Promise<UsageEntry[] | Unsupported> {
    return LabMonitoring.getUsageTodayFromEvents();
  },

  async getLog(): Promise<LogEvent[]> {
    return LabMonitoring.getLog();
  },

  async clearLog(): Promise<void> {
    return LabMonitoring.clearLog();
  },

  async logEvent(experiment: string, event: string, details?: string): Promise<void> {
    return LabMonitoring.logEvent('app', experiment, event, details ?? null);
  },
};

export default monitoring;
export * from './types';
