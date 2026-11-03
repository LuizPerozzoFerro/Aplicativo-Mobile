// Apps pré-marcados no onboarding, se instalados (spec 02 v0.2, seção 4.4;
// doc 01 v0.7, seção 4.2). Pacotes do Android, a confirmar no aparelho na
// Fase 4. O usuário pode tirar estes e acrescentar outros.

import type { MonitoredAppRole } from './compulsion';

export const SUGGESTED_PACKAGES: { readonly [R in MonitoredAppRole]: readonly string[] } = {
  short_video: [
    'com.instagram.android',
    // TikTok tem dois pacotes, conforme a região da loja.
    'com.zhiliaoapp.musically',
    'com.ss.android.ugc.trill',
    'com.google.android.youtube',
    'com.kwai.video',
  ],
  risk: ['com.twitter.android', 'com.reddit.frontpage'],
};

export function isSuggestedPackage(role: MonitoredAppRole, packageName: string): boolean {
  return SUGGESTED_PACKAGES[role].includes(packageName);
}

/** Dos pacotes instalados, os que vêm pré-marcados para o papel, na ordem recebida. */
export function getPreselectedPackages(
  role: MonitoredAppRole,
  installedPackages: readonly string[],
): string[] {
  return installedPackages.filter((packageName) => isSuggestedPackage(role, packageName));
}
