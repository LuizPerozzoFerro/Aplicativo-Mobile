// Re-export the native module. On web, it will be resolved to LabMonitoringModule.web.ts
// and on native platforms to LabMonitoringModule.ts
export { default } from './src/LabMonitoringModule';
export * from './src/LabMonitoring.types';
