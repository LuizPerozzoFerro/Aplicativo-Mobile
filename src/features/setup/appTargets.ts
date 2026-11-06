import { useEffect, useState } from 'react';

import { getMonitoring, UNSUPPORTED, type MonitoringTarget } from '@/monitoring';

export type AppTargets = {
  /** Null enquanto a lista carrega. */
  targets: MonitoringTarget[] | null;
  /** Identificadores dos apps instalados, ou null enquanto carrega. */
  installed: string[] | null;
  options: { value: string; label: string }[];
  labelOf: (id: string) => string;
};

/**
 * Apps instalados (Android) para as listas de escolha, do onboarding e do
 * Perfil. Sem suporte (iOS), a lista fica vazia.
 */
export function useAppTargets(): AppTargets {
  const [targets, setTargets] = useState<MonitoringTarget[] | null>(null);

  useEffect(() => {
    let active = true;
    void getMonitoring()
      .listTargets()
      .then((result) => active && setTargets(result === UNSUPPORTED ? [] : result));
    return () => {
      active = false;
    };
  }, []);

  return {
    targets,
    installed: targets?.map((target) => target.id as string) ?? null,
    options: (targets ?? []).map((target) => ({
      value: target.id as string,
      label: target.label ?? (target.id as string),
    })),
    labelOf: (id) => targets?.find((target) => (target.id as string) === id)?.label ?? id,
  };
}
