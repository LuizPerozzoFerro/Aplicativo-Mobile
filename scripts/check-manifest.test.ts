import { findForbidden } from './check-manifest';

// Manifestos mínimos, no formato do manifesto mesclado do Gradle.
const CLEAN_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="br.com.quedo.app">
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <application android:allowBackup="false">
    <service android:name=".UsageLimitService" android:foregroundServiceType="specialUse" android:exported="false" />
  </application>
</manifest>`;

const FORBIDDEN_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="br.com.quedo.app">
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SYSTEM_EXEMPTED" />
  <uses-permission
      android:name="android.permission.HIDE_OVERLAY_WINDOWS" />
  <application>
    <service
        android:name=".LabVpnService"
        android:permission="android.permission.BIND_VPN_SERVICE"
        android:exported="false">
      <intent-filter>
        <action android:name="android.net.VpnService" />
      </intent-filter>
    </service>
  </application>
</manifest>`;

describe('findForbidden', () => {
  it('aprova um manifesto sem VPN nem permissões proibidas', () => {
    expect(findForbidden(CLEAN_MANIFEST)).toEqual([]);
  });

  it('acusa as três proibições: as duas permissões e o serviço de VPN', () => {
    expect(findForbidden(FORBIDDEN_MANIFEST)).toEqual([
      'permissão proibida: android.permission.FOREGROUND_SERVICE_SYSTEM_EXEMPTED',
      'permissão proibida: android.permission.HIDE_OVERLAY_WINDOWS',
      'serviço de VPN: .LabVpnService (exige BIND_VPN_SERVICE)',
    ]);
  });

  it('acusa a permissão BIND_VPN_SERVICE declarada como uses-permission', () => {
    const xml = CLEAN_MANIFEST.replace(
      '<application',
      '<uses-permission android:name="android.permission.BIND_VPN_SERVICE" />\n  <application',
    );
    expect(findForbidden(xml)).toEqual(['permissão proibida: android.permission.BIND_VPN_SERVICE']);
  });

  it('acusa um serviço que responde a android.net.VpnService mesmo sem a permissão', () => {
    const xml = CLEAN_MANIFEST.replace(
      '</application>',
      `<service android:name=".OtherVpn"><intent-filter><action android:name="android.net.VpnService" /></intent-filter></service>
  </application>`,
    );
    expect(findForbidden(xml)).toEqual([
      'serviço de VPN: .OtherVpn (responde a android.net.VpnService)',
    ]);
  });
});
