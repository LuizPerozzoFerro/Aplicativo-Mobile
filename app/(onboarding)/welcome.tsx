import { Redirect } from 'expo-router';

import { WelcomeStep } from '@/features/onboarding/WelcomeStep';
import { useResumeStep } from '@/features/onboarding/useResumeStep';

export default function WelcomeRoute() {
  // O app abre aqui: com uma etapa gravada, segue direto para ela.
  const resumeStep = useResumeStep();
  if (resumeStep) return <Redirect href={`/${resumeStep}`} />;
  return <WelcomeStep />;
}
