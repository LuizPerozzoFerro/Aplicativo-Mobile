import { useLocalSearchParams } from 'expo-router';

import { isCompulsionType } from '@/domain/compulsion';
import { MilestoneDetailScreen } from '@/features/milestones/MilestoneDetailScreen';
import { parseMilestoneDay } from '@/features/milestones/routeParams';

export default function MilestoneRoute() {
  const { compulsion, day } = useLocalSearchParams<{ compulsion?: string; day?: string }>();
  return (
    <MilestoneDetailScreen
      type={isCompulsionType(compulsion) ? compulsion : null}
      day={parseMilestoneDay(day)}
    />
  );
}
