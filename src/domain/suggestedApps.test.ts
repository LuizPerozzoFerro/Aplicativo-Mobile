import { MONITORED_APP_ROLES } from './compulsion';
import { SUGGESTED_PACKAGES, getPreselectedPackages, isSuggestedPackage } from './suggestedApps';

describe('apps sugeridos', () => {
  it('há sugestões para cada papel, sem pacote repetido', () => {
    for (const role of MONITORED_APP_ROLES) {
      const packages = SUGGESTED_PACKAGES[role];
      expect(packages.length).toBeGreaterThan(0);
      expect(new Set(packages).size).toBe(packages.length);
    }
  });

  it('TikTok entra com os dois pacotes', () => {
    expect(isSuggestedPackage('short_video', 'com.zhiliaoapp.musically')).toBe(true);
    expect(isSuggestedPackage('short_video', 'com.ss.android.ugc.trill')).toBe(true);
  });

  it('a sugestão vale só para o próprio papel', () => {
    expect(isSuggestedPackage('risk', 'com.twitter.android')).toBe(true);
    expect(isSuggestedPackage('short_video', 'com.twitter.android')).toBe(false);
  });

  it('pré-marca só os sugeridos que estão instalados, na ordem recebida', () => {
    const installed = [
      'com.example.notes',
      'com.kwai.video',
      'com.reddit.frontpage',
      'com.instagram.android',
    ];
    expect(getPreselectedPackages('short_video', installed)).toEqual([
      'com.kwai.video',
      'com.instagram.android',
    ]);
    expect(getPreselectedPackages('risk', installed)).toEqual(['com.reddit.frontpage']);
    expect(getPreselectedPackages('risk', [])).toEqual([]);
  });
});
