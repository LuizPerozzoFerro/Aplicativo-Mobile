import { NativeModule, requireNativeModule } from 'expo';

import type {
  DomainWatchMode,
  DomainWatchStatus,
  VpnPermissionResult,
  InstalledApp,
  LogEvent,
  PermissionStatus,
  UsageAccessRequestResult,
  UsageEntry,
  UsageLimitStatus,
  NotificationPermissionResult,
  InterruptionMode,
  OverlayPermissionResult,
  Unsupported,
} from './LabMonitoring.types';

declare class LabMonitoringModule extends NativeModule<{}> {
  getPermissionStatus(): PermissionStatus;
  requestUsageAccess(): Promise<UsageAccessRequestResult>;
  getUsageToday(): Promise<UsageEntry[] | Unsupported>;
  getUsageTodayFromEvents(): Promise<UsageEntry[] | Unsupported>;
  listInstalledApps(): Promise<InstalledApp[] | Unsupported>;
  startUsageLimit(
    minutes: number,
    packages: string[],
    message: string,
    interruptionMode: InterruptionMode,
    pauseMinutes: number
  ): Promise<void>;
  requestOverlayPermission(): Promise<OverlayPermissionResult>;
  hideInterruption(): Promise<void>;
  requestNotificationPermission(): Promise<NotificationPermissionResult>;
  sendTestAlert(): Promise<void>;
  stopUsageLimit(): Promise<void>;
  getUsageLimitStatus(): UsageLimitStatus;
  requestVpnPermission(): Promise<VpnPermissionResult>;
  startAdultContentWatch(
    mode: DomainWatchMode,
    domains: string[],
    socialDomains: string[]
  ): Promise<void>;
  stopAdultContentWatch(): Promise<void>;
  getDomainWatchStatus(): DomainWatchStatus;
  openNotificationSettings(): Promise<boolean>;
  logEvent(
    source: string,
    experiment: string,
    event: string,
    details: string | null
  ): Promise<void>;
  getLog(): Promise<LogEvent[]>;
  clearLog(): Promise<void>;
}

export default requireNativeModule<LabMonitoringModule>('LabMonitoring');
