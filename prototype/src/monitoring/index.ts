import LabMonitoring from '../../modules/lab-monitoring';
import {
  NotImplementedYetError,
  type AdultContentWatchConfig,
  type LogEvent,
  type MonitoringModule,
  type PermissionStatus,
  type SelectionSummary,
  type UsageEntry,
  type UsageLimitConfig,
  type UsageLimitStatus,
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
    return { usageAccess: result.usageAccess };
  },

  async selectTargets(): Promise<SelectionSummary | Unsupported> {
    const apps = await LabMonitoring.listInstalledApps();
    if (apps === 'unsupported') {
      return 'unsupported';
    }
    return { apps };
  },

  async startUsageLimit(config: UsageLimitConfig): Promise<void> {
    return LabMonitoring.startUsageLimit(config.minutes, config.packages);
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

  async startAdultContentWatch(_config: AdultContentWatchConfig): Promise<void> {
    throw new NotImplementedYetError('A6', 'startAdultContentWatch');
  },

  async stopAdultContentWatch(): Promise<void> {
    throw new NotImplementedYetError('A6', 'stopAdultContentWatch');
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
