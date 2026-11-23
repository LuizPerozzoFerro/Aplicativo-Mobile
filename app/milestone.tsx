import { useLocalSearchParams } from 'expo-router';

import { isCompulsionType } from '@/domain/compulsion';
import { MilestoneDetailScreen } from '@/features/milestones/MilestoneDetailScreen';

function parseDay(value: unknown): number | null {
  const day = typeof value === 'string' && /^\d{1,4}$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(day) && day >= 1 ? day : null;
}

export default function MilestoneRoute() {
  const { compulsion, day } = useLocalSearchParams<{ compulsion?: string; day?: string }>();
  return (
    <MilestoneDetailScreen
      type={isCompulsionType(compulsion) ? compulsion : null}
      day={parseDay(day)}
    />
  );
}
