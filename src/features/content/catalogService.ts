import type { Repositories } from '@/data/repositories';
import {
  getCacheUpdate,
  getCatalogUrl,
  isCatalogRefreshDue,
  parseCatalog,
  parseCatalogText,
  pickCurrentCatalog,
  type Catalog,
  type CatalogLocale,
  type CatalogSource,
} from '@/domain/catalog';

// Catálogo em uso e atualização remota (spec 04, 4.1). As regras ficam em
// src/domain/catalog.ts; aqui só a conversa com o banco e com a rede.
//
// Uma falha (sem rede, resposta de erro, catálogo inválido ou de formato
// maior) não aparece para o usuário e não gera tentativas em sequência: o
// app segue com o que tem. Nada daqui escreve no log o endereço ou o
// conteúdo (CLAUDE.md, seção 9).

/** Quanto esperar a resposta do servidor. */
export const CATALOG_FETCH_TIMEOUT_MS = 15_000;

/** Lê um endereço como texto. `ok` falso: o servidor respondeu com erro. */
export type FetchText = (
  url: string,
  signal: AbortSignal,
) => Promise<{ ok: boolean; text: string }>;

export type CurrentCatalog = {
  readonly catalog: Catalog;
  readonly source: CatalogSource;
  /** Última consulta que trouxe um catálogo válido; nulo se nunca houve. */
  readonly fetchedAt: Date | null;
};

export type CatalogRefreshResult =
  /** Sem endereço do conteúdo nesta variante. */
  | 'not_configured'
  /** Consulta recente, ou falha recente neste processo. */
  | 'not_due'
  /** Outra consulta já está em andamento. */
  | 'busy'
  /** O catálogo em uso mudou. */
  | 'updated'
  /** Consulta válida, sem catálogo mais novo. */
  | 'unchanged'
  | 'failed';

export type CatalogService = {
  current(): CurrentCatalog;
  /** Consulta o servidor se estiver na hora; `force` ignora o intervalo (ferramenta de teste). */
  refresh(options?: { force?: boolean }): Promise<CatalogRefreshResult>;
  /** Avisa quando o catálogo em uso muda. Devolve a função que cancela. */
  subscribe(listener: () => void): () => void;
};

export type CatalogServiceOptions = {
  readonly repositories: () => Repositories;
  readonly embedded: Readonly<Record<CatalogLocale, unknown>>;
  readonly locale: () => CatalogLocale;
  readonly baseUrl: string | null;
  readonly fetchText: FetchText;
  readonly now?: () => Date;
  readonly timeoutMs?: number;
};

export function createCatalogService(options: CatalogServiceOptions): CatalogService {
  const now = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? CATALOG_FETCH_TIMEOUT_MS;
  const listeners = new Set<() => void>();
  const embeddedParsed = new Map<CatalogLocale, Catalog>();
  /** O guardado já validado, pelo texto: a validação roda uma vez por versão. */
  let cachedParse: { json: string; catalog: Catalog | null } | null = null;
  let lastFailureAt: Date | null = null;
  let inFlight = false;

  function embedded(locale: CatalogLocale): Catalog {
    const known = embeddedParsed.get(locale);
    if (known) return known;
    const result = parseCatalog(options.embedded[locale]);
    // Um embutido inválido é erro de build; o teste do catálogo embutido o impede.
    if (!result.ok) throw new Error('Catálogo embutido inválido');
    embeddedParsed.set(locale, result.catalog);
    return result.catalog;
  }

  function cached(locale: CatalogLocale): { catalog: Catalog | null; fetchedAt: Date | null } {
    const row = options.repositories().contentCatalog.get(locale);
    if (row === null) return { catalog: null, fetchedAt: null };
    if (cachedParse?.json !== row.json) {
      const result = parseCatalogText(row.json);
      cachedParse = { json: row.json, catalog: result.ok ? result.catalog : null };
    }
    return { catalog: cachedParse.catalog, fetchedAt: row.fetchedAt };
  }

  function current(): CurrentCatalog {
    const locale = options.locale();
    const stored = cached(locale);
    return { ...pickCurrentCatalog(embedded(locale), stored.catalog), fetchedAt: stored.fetchedAt };
  }

  async function download(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await options.fetchText(url, controller.signal);
      return response.ok ? response.text : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function refresh({ force = false } = {}): Promise<CatalogRefreshResult> {
    const { baseUrl } = options;
    if (baseUrl === null) return 'not_configured';
    if (inFlight) return 'busy';
    const locale = options.locale();
    const lastSuccessAt = cached(locale).fetchedAt;
    if (!force && !isCatalogRefreshDue({ lastSuccessAt, lastFailureAt, now: now() })) {
      return 'not_due';
    }

    inFlight = true;
    try {
      const text = await download(getCatalogUrl(baseUrl, locale));
      const remote = text === null ? null : parseCatalogText(text);
      if (text === null || remote === null || !remote.ok) {
        lastFailureAt = now();
        return 'failed';
      }
      lastFailureAt = null;
      const before = current().catalog.contentVersion;
      const repository = options.repositories().contentCatalog;
      if (getCacheUpdate(cached(locale).catalog, remote.catalog) === 'replace') {
        repository.save({
          locale,
          formatVersion: remote.catalog.formatVersion,
          contentVersion: remote.catalog.contentVersion,
          json: text,
        });
      } else {
        repository.touch(locale);
      }
      if (current().catalog.contentVersion === before) return 'unchanged';
      for (const listener of [...listeners]) listener();
      return 'updated';
    } finally {
      inFlight = false;
    }
  }

  return {
    current,
    refresh,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** `fetch` do React Native, sem cabeçalho nem parâmetro que identifique o usuário ou o aparelho. */
export const fetchText: FetchText = async (url, signal) => {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  return { ok: response.ok, text: response.ok ? await response.text() : '' };
};
