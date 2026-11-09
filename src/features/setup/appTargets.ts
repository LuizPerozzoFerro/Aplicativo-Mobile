import { useEffect, useMemo, useState } from 'react';

import { createTextComparer } from '@/i18n/format';
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

  // O sistema ordena sem conhecer acentos ("Câmera" depois de "Correios").
  const options = useMemo(() => {
    const compare = createTextComparer();
    return (targets ?? [])
      .map((target) => ({
        value: target.id as string,
        label: target.label ?? (target.id as string),
      }))
      .sort((a, b) => compare(a.label, b.label));
  }, [targets]);

  return {
    targets,
    installed: targets?.map((target) => target.id as string) ?? null,
    options,
    labelOf: (id) => targets?.find((target) => (target.id as string) === id)?.label ?? id,
  };
}
