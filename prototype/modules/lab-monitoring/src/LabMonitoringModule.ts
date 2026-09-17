import { NativeModule, requireNativeModule } from 'expo';

import type {
  InstalledApp,
  LogEvent,
  PermissionStatus,
  UsageAccessRequestResult,
  UsageEntry,
  Unsupported,
} from './LabMonitoring.types';

declare class LabMonitoringModule extends NativeModule<{}> {
  getPermissionStatus(): PermissionStatus;
  requestUsageAccess(): Promise<UsageAccessRequestResult>;
  getUsageToday(): Promise<UsageEntry[] | Unsupported>;
  listInstalledApps(): Promise<InstalledApp[] | Unsupported>;
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
