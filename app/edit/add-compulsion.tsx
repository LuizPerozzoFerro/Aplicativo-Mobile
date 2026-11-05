import { useLocalSearchParams } from 'expo-router';

import { isCompulsionType } from '@/domain/compulsion';
import { AddCompulsionScreen } from '@/features/profile/AddCompulsionScreen';

export default function AddCompulsionRoute() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  return isCompulsionType(type) ? <AddCompulsionScreen type={type} /> : null;
}
