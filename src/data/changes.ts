import type { Repositories } from './repositories';

// Aviso de "os dados mudaram" (spec 03, seção 4.2: a configuração do nativo
// é reenviada sempre que algo muda). Toda função de repositório que não
// começa com `list` ou `get` grava; depois dela, quem assinou é avisado.
// O teste confere que essa regra de nomes vale para todas as funções.

const READ_PREFIXES = ['list', 'get'] as const;

export function isReadMethod(name: string): boolean {
  return READ_PREFIXES.some((prefix) => name.startsWith(prefix));
}

type Listener = () => void;

export type DataChanges = {
  /** Devolve a função que cancela a assinatura. */
  subscribe(listener: Listener): () => void;
  notify(): void;
};

export function createDataChanges(): DataChanges {
  const listeners = new Set<Listener>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify() {
      for (const listener of [...listeners]) listener();
    },
  };
}

/** Os mesmos repositórios, avisando `onChange` depois de cada gravação que terminou sem erro. */
export function observeRepositories(
  repositories: Repositories,
  onChange: () => void,
): Repositories {
  const wrap = <F extends (...args: never[]) => unknown>(name: string, fn: F): F => {
    if (isReadMethod(name)) return fn;
    return ((...args: Parameters<F>) => {
      const result = fn(...args);
      onChange();
      return result;
    }) as F;
  };

  const observed: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(repositories)) {
    if (typeof value === 'function') {
      observed[name] = wrap(name, value as (...args: never[]) => unknown);
    } else {
      observed[name] = Object.fromEntries(
        Object.entries(value as Record<string, (...args: never[]) => unknown>).map(
          ([method, fn]) => [method, wrap(method, fn)],
        ),
      );
    }
  }
  return observed as Repositories;
}

/** Os avisos do banco do app (src/data/bootstrap.ts). */
export const dataChanges = createDataChanges();
