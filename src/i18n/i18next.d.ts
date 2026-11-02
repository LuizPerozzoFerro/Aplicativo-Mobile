import 'i18next';

import type { DEFAULT_LANGUAGE, DEFAULT_NAMESPACE, resources } from './resources';

// Chaves tipadas: uma chave que não existe no pt-BR quebra o typecheck.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: (typeof resources)[typeof DEFAULT_LANGUAGE];
  }
}
