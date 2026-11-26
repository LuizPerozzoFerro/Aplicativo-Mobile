import { useLocalSearchParams } from 'expo-router';

import { isCompulsionType } from '@/domain/compulsion';
import { parseMilestoneDay } from '@/features/milestones/routeParams';
import { VideoScreen } from '@/features/milestones/VideoScreen';

export default function VideoRoute() {
  const { compulsion, day } = useLocalSearchParams<{ compulsion?: string; day?: string }>();
  return (
    <VideoScreen
      type={isCompulsionType(compulsion) ? compulsion : null}
      day={parseMilestoneDay(day)}
    />
  );
}
