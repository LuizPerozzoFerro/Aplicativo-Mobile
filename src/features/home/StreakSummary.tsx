import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import type { Mechanic } from '@/domain/compulsion';
import type { StreakOverview } from '@/domain/overview';
import { Text, useTheme } from '@/ui';

/**
 * Streak e próximo marco, iguais nos dois cards. Com `onPress`, a área toda
 * vira um botão que abre a aba Progresso (spec 04, 5.4); o resto do card não
 * muda, porque tem botões próprios.
 */
export function StreakSummary({
  overview,
  mechanic,
  onPress,
  testID,
}: {
  overview: StreakOverview;
  mechanic: Mechanic;
  onPress?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation('home');
  const theme = useTheme();
  const captions = {
    abstinence: t('streakCaption.abstinence'),
    moderation: t('streakCaption.moderation'),
  } satisfies Record<Mechanic, string>;
  const lines = [
    t('streak', { count: overview.streakDays }),
    captions[mechanic],
    overview.nextMilestone === null
      ? t('allMilestones')
      : t('nextMilestone', { count: overview.nextMilestone }),
  ] as const;

  const content = (
    <>
      <Text variant="display">{lines[0]}</Text>
      <Text color="textMuted">{lines[1]}</Text>
      <Text>{lines[2]}</Text>
    </>
  );

  if (!onPress) return <View style={{ gap: theme.spacing.xs }}>{content}</View>;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={lines.join(', ')}
      accessibilityHint={t('openProgress')}
      onPress={onPress}
      style={({ pressed }) => ({
        gap: theme.spacing.xs,
        minHeight: theme.minTouchTarget,
        borderRadius: theme.radii.md,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {content}
    </Pressable>
  );
}
