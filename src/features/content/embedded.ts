import type { CatalogLocale } from '@/domain/catalog';

import catalogPtBR from '../../../content/catalog.pt-BR.json';

// Cópia embutida do catálogo (spec 04, 4.1): o build leva o arquivo de
// `content/`, e o app tem marcos e textos já na primeira abertura, sem
// internet. Fica como `unknown`: passa pela mesma validação do remoto, e um
// teste garante que ela é válida.

export const EMBEDDED_CATALOGS: Readonly<Record<CatalogLocale, unknown>> = {
  'pt-BR': catalogPtBR,
};
