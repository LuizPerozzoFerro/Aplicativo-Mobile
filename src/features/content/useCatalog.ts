import { useEffect } from 'react';
import { AppState } from 'react-native';

import { variant } from '@/config/variant';
import { getRepositories } from '@/data/bootstrap';
import type { CatalogLocale } from '@/domain/catalog';
import i18n from '@/i18n';
import type { Language } from '@/i18n/resources';

import { createCatalogService, fetchText, type CatalogService } from './catalogService';
import { EMBEDDED_CATALOGS } from './embedded';

/** Cada idioma do app precisa de um catálogo: um idioma novo sem arquivo não compila. */
const CATALOG_LOCALE_BY_LANGUAGE: Readonly<Record<Language, CatalogLocale>> = {
  'pt-BR': 'pt-BR',
};

function currentLocale(): CatalogLocale {
  return CATALOG_LOCALE_BY_LANGUAGE[i18n.language as Language] ?? 'pt-BR';
}

let shared: CatalogService | null = null;

/** O serviço do catálogo do app, o mesmo para quem chamar. Só depois de o banco estar pronto. */
export function getAppCatalogService(): CatalogService {
  shared ??= createCatalogService({
    repositories: getRepositories,
    embedded: EMBEDDED_CATALOGS,
    locale: currentLocale,
    baseUrl: variant.contentBaseUrl,
    fetchText,
  });
  return shared;
}

/**
 * Atualiza o catálogo ao abrir o app e ao voltar do segundo plano, se a
 * última consulta tiver mais de 24 horas (spec 04, 4.1). Montar uma vez, no
 * layout raiz, depois de o banco estar pronto.
 */
export function useCatalogRefresh(): void {
  useEffect(() => {
    const service = getAppCatalogService();
    // Falha de banco aqui não pode derrubar o app: segue com o que tem.
    const refresh = () => void service.refresh().catch(() => undefined);
    refresh();
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => app.remove();
  }, []);
}
