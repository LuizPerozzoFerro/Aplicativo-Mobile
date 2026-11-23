import { router } from 'expo-router';

import type { CompulsionType } from '@/domain/compulsion';

/** Abre a aba Progresso já filtrada na compulsão do card (spec 04, 5.4). */
export function openProgress(type: CompulsionType): void {
  router.navigate({ pathname: '/progress', params: { compulsion: type } });
}
