import { useLocalSearchParams } from 'expo-router';

import { parseEmergencySource } from '@/domain/emergency';
import { EmergencyScreen } from '@/features/emergency/EmergencyScreen';

export default function EmergencyRoute() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  return <EmergencyScreen source={parseEmergencySource(source)} />;
}
