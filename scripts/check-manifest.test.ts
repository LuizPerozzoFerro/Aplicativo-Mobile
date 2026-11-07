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

  it('acusa a permissão de origem da instalação (Install Referrer)', () => {
    const xml = CLEAN_MANIFEST.replace(
      '<application',
      '<uses-permission android:name="com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE" />\n  <application',
    );
    expect(findForbidden(xml)).toEqual([
      'permissão proibida: com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE',
    ]);
  });

  it('não acusa o bloqueio (tools:node="remove"), que é o que o blockedPermissions gera', () => {
    const xml = CLEAN_MANIFEST.replace(
      '<application',
      `<uses-permission android:name="com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE" tools:node="remove" />
  <uses-permission tools:node="remove" android:name="android.permission.HIDE_OVERLAY_WINDOWS" />
  <application`,
    );
    expect(findForbidden(xml)).toEqual([]);
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

describe('lista de permissões permitidas (spec 03, seção 5.8)', () => {
  const withPermission = (packageName: string, permission: string) =>
    CLEAN_MANIFEST.replace('package="br.com.quedo.app"', `package="${packageName}"`).replace(
      '<application',
      `<uses-permission android:name="${permission}" />\n  <application`,
    );

  it('aceita as permissões da Fase 4', () => {
    const xml = CLEAN_MANIFEST.replace(
      '<application',
      `<uses-permission android:name="android.permission.VIBRATE" />
  <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
  <application`,
    );
    expect(findForbidden(xml)).toEqual([]);
  });

  it('acusa uma permissão fora da lista', () => {
    expect(
      findForbidden(withPermission('br.com.quedo.app', 'android.permission.READ_CONTACTS')),
    ).toEqual(['permissão fora da lista permitida: android.permission.READ_CONTACTS']);
  });

  it('acusa também quando declarada como uses-permission-sdk-23', () => {
    const xml = CLEAN_MANIFEST.replace(
      '<application',
      '<uses-permission-sdk-23 android:name="android.permission.CAMERA" />\n  <application',
    );
    expect(findForbidden(xml)).toEqual([
      'permissão fora da lista permitida: android.permission.CAMERA',
    ]);
  });

  it('aceita a permissão própria do AndroidX só com o pacote do próprio manifesto', () => {
    for (const packageName of [
      'br.com.quedo.app',
      'br.com.quedo.app.preview',
      'br.com.quedo.app.dev',
    ]) {
      expect(
        findForbidden(
          withPermission(packageName, `${packageName}.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`),
        ),
      ).toEqual([]);
    }
    expect(
      findForbidden(
        withPermission(
          'br.com.quedo.app',
          'br.com.quedo.app.dev.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
        ),
      ),
    ).toEqual([
      'permissão fora da lista permitida: br.com.quedo.app.dev.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
    ]);
  });

  it('aceita as permissões do dev client só na variante de desenvolvimento', () => {
    for (const permission of [
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_LOCAL_NETWORK',
      'android.permission.CHANGE_WIFI_MULTICAST_STATE',
    ]) {
      expect(findForbidden(withPermission('br.com.quedo.app.dev', permission))).toEqual([]);
      expect(findForbidden(withPermission('br.com.quedo.app.preview', permission))).toEqual([
        `permissão fora da lista permitida: ${permission}`,
      ]);
      expect(findForbidden(withPermission('br.com.quedo.app', permission))).toEqual([
        `permissão fora da lista permitida: ${permission}`,
      ]);
    }
  });

  it('acusa como proibidas as da Fase 4, mesmo no desenvolvimento', () => {
    for (const permission of [
      'android.permission.QUERY_ALL_PACKAGES',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
    ]) {
      expect(findForbidden(withPermission('br.com.quedo.app.dev', permission))).toEqual([
        `permissão proibida: ${permission}`,
      ]);
    }
  });

  it('sem pacote no manifesto, vale a lista estrita', () => {
    const xml = withPermission('x', 'android.permission.ACCESS_NETWORK_STATE').replace(
      ' package="x"',
      '',
    );
    expect(findForbidden(xml)).toEqual([
      'permissão fora da lista permitida: android.permission.ACCESS_NETWORK_STATE',
    ]);
  });
});
