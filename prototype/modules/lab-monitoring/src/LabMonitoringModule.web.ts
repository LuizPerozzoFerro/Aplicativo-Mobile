import { registerWebModule, NativeModule } from 'expo';

import {
  UNSUPPORTED,
  type InstalledApp,
  type LogEvent,
  type PermissionStatus,
  type UsageAccessRequestResult,
  type UsageEntry,
  type UsageLimitStatus,
  type NotificationPermissionResult,
  type Unsupported,
} from './LabMonitoring.types';

/**
 * A web nao e alvo do produto; existe so porque o template do Expo a inclui.
 * Responde 'unsupported' para tudo, pelo mesmo motivo do esqueleto do iOS.
 */
class LabMonitoringModule extends NativeModule<{}> {
  getPermissionStatus(): PermissionStatus {
    return { usageAccess: UNSUPPORTED, notifications: UNSUPPORTED };
  }

  async requestUsageAccess(): Promise<UsageAccessRequestResult> {
    return {
      settingsOpened: false,
      settingsRoute: 'unavailable',
      usageAccess: UNSUPPORTED,
    };
  }

  async getUsageToday(): Promise<UsageEntry[] | Unsupported> {
    return UNSUPPORTED;
  }

  async getUsageTodayFromEvents(): Promise<UsageEntry[] | Unsupported> {
    return UNSUPPORTED;
  }

  async listInstalledApps(): Promise<InstalledApp[] | Unsupported> {
    return UNSUPPORTED;
  }

  async startUsageLimit(): Promise<void> {}

  async requestNotificationPermission(): Promise<NotificationPermissionResult> {
    return { requested: false, notifications: UNSUPPORTED };
  }

  async sendTestAlert(): Promise<void> {}

  async stopUsageLimit(): Promise<void> {}

  getUsageLimitStatus(): UsageLimitStatus {
    return { active: false, minutes: 0, packages: [], message: "", firedAt: 0 };
  }

  async openNotificationSettings(): Promise<boolean> {
    return false;
  }

  async logEvent(): Promise<void> {}

  async getLog(): Promise<LogEvent[]> {
    return [];
  }

  async clearLog(): Promise<void> {}
}

export default registerWebModule(LabMonitoringModule, 'LabMonitoringModule');
