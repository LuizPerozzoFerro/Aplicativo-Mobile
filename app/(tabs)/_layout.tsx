import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Text, type ColorValue } from 'react-native';

import { useMilestoneCelebrations } from '@/features/milestones/useMilestoneCelebrations';
import { useTheme } from '@/ui';

// Ícones genéricos e neutros: Material Symbols no Android, SF Symbols no iOS.
function tabIcon(name: SymbolViewProps['name']) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={name} tintColor={color} size={size} />;
  }
  return TabIcon;
}

/**
 * Rótulo da aba numa linha só, que diminui para caber em vez de ser cortado
 * com reticências quando a fonte do sistema está grande (P13, 28/11/2026). O
 * nome lido pelo leitor de tela não muda: é o título da aba.
 */
function TabLabel({ color, children }: { color: ColorValue; children: string }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.5}
      style={{ color, fontSize: 12, textAlign: 'center' }}
    >
      {children}
    </Text>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation('tabs');
  const theme = useTheme();
  // Alcances de marco e celebração, só com as abas à vista (spec 04, 5.3).
  useMilestoneCelebrations();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
        },
        sceneStyle: { backgroundColor: theme.colors.background },
        tabBarLabel: TabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: tabIcon({ ios: 'house', android: 'home', web: 'home' }),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('stats'),
          tabBarIcon: tabIcon({ ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' }),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('progress'),
          tabBarIcon: tabIcon({ ios: 'flag', android: 'flag', web: 'flag' }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: tabIcon({ ios: 'person', android: 'person', web: 'person' }),
        }}
      />
    </Tabs>
  );
}
