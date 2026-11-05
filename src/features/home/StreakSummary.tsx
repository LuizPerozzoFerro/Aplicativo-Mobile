import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { Mechanic } from '@/domain/compulsion';
import type { StreakOverview } from '@/domain/overview';
import { Text, useTheme } from '@/ui';

/** Streak e próximo marco, iguais nos dois cards. */
export function StreakSummary({
  overview,
  mechanic,
}: {
  overview: StreakOverview;
  mechanic: Mechanic;
}) {
  const { t } = useTranslation('home');
  const theme = useTheme();
  const captions = {
    abstinence: t('streakCaption.abstinence'),
    moderation: t('streakCaption.moderation'),
  } satisfies Record<Mechanic, string>;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="display">{t('streak', { count: overview.streakDays })}</Text>
      <Text color="textMuted">{captions[mechanic]}</Text>
      <Text>
        {overview.nextMilestone === null
          ? t('allMilestones')
          : t('nextMilestone', { count: overview.nextMilestone })}
      </Text>
    </View>
  );
}
