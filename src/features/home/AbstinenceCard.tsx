import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import type { UserCompulsion } from '@/data/repositories';
import { getRelapseDayKey, type CheckInAnswer, type RelapseDay } from '@/domain/checkIn';
import type { AbstinenceOverview } from '@/domain/overview';
import { Button, Card, choiceDialog, Text, useTheme } from '@/ui';

import { StreakSummary } from './StreakSummary';

type Props = {
  compulsion: UserCompulsion;
  overview: AbstinenceOverview;
  /** Chamado depois de cada gravação, para a tela recarregar. */
  onChange: () => void;
};

/**
 * Card da abstinência (spec 02, seção 4.5): streak, próximo marco, check-in do
 * dia com "Desfazer" e "Registrar recaída" (hoje ou ontem). As gravações usam
 * o dia do momento do toque, não o do último carregamento.
 */
export function AbstinenceCard({ compulsion, overview, onChange }: Props) {
  const { t } = useTranslation(['home', 'common']);
  const theme = useTheme();
  const repositories = getRepositories();
  const dayOf = (day: RelapseDay) => ({
    compulsionId: compulsion.id,
    dayKey: getRelapseDayKey(day, new Date()),
  });
  const dayLabels = {
    today: t('relapse.today'),
    yesterday: t('relapse.yesterday'),
  } satisfies Record<RelapseDay, string>;
  const singleDayMessages = {
    today: t('relapse.dialogTodayOnly'),
    yesterday: t('relapse.dialogYesterdayOnly'),
  } satisfies Record<RelapseDay, string>;

  const answer = (value: CheckInAnswer) => {
    repositories.checkIns.answer({ ...dayOf('today'), answer: value });
    onChange();
  };

  const undoToday = () => {
    repositories.checkIns.undo(dayOf('today'));
    onChange();
  };

  const undoYesterday = () => {
    repositories.relapses.undo(dayOf('yesterday'));
    onChange();
  };

  const registerRelapse = async () => {
    const [first] = overview.relapseDays;
    if (first === undefined) return;
    const both = overview.relapseDays.length > 1;
    const day = await choiceDialog<RelapseDay>({
      title: t('relapse.dialogTitle'),
      message: both ? t('relapse.dialogChooseDay') : singleDayMessages[first],
      // Um dia só: o botão confirma. Os dois: cada botão é um dia, ontem antes de hoje.
      choices: both
        ? [
            { value: 'yesterday', label: dayLabels.yesterday },
            { value: 'today', label: dayLabels.today },
          ]
        : [{ value: first, label: t('relapse.confirm') }],
      cancelLabel: t('relapse.cancel'),
    });
    if (day === null) return;
    repositories.relapses.record(dayOf(day));
    onChange();
  };

  return (
    <Card testID="home-card-pornography">
      <Text variant="heading">{t('common:compulsions.pornography')}</Text>
      <StreakSummary overview={overview} mechanic="abstinence" />
      {overview.relapseRecordedToday ? (
        <Text accessibilityLiveRegion="polite">{t('relapse.support')}</Text>
      ) : null}
      <View style={{ gap: theme.spacing.sm }}>
        {overview.checkIn.state === 'pending' ? (
          <>
            <Text variant="bodyStrong">{t('checkIn.question')}</Text>
            <Button label={t('checkIn.noRelapse')} onPress={() => answer('no_relapse')} />
            <Button
              label={t('checkIn.relapse')}
              variant="secondary"
              onPress={() => answer('relapse')}
            />
          </>
        ) : (
          <>
            <Text variant="bodyStrong" accessibilityLiveRegion="polite">
              {overview.checkIn.answer === 'no_relapse'
                ? t('checkIn.answeredNoRelapse')
                : t('checkIn.answeredRelapse')}
            </Text>
            {overview.checkIn.canUndo ? (
              <Button label={t('checkIn.undo')} variant="text" onPress={undoToday} />
            ) : null}
          </>
        )}
        {overview.yesterdayRelapseUndoable ? (
          <View testID="home-yesterday-relapse">
            <Text>{t('relapse.yesterdayRecorded')}</Text>
            <Button label={t('checkIn.undo')} variant="text" onPress={undoYesterday} />
          </View>
        ) : null}
        {overview.relapseDays.length > 0 ? (
          <Button
            label={t('relapse.register')}
            variant="text"
            onPress={() => void registerRelapse()}
          />
        ) : null}
      </View>
    </Card>
  );
}
