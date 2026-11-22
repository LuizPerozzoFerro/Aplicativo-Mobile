// Catálogo de conteúdo (spec 04, seções 4.1 e 4.2): marcos, textos,
// referências e vídeos de cada compulsão, num arquivo por idioma. A fonte fica
// em `content/` no repositório; o app traz uma cópia embutida, guarda no banco
// a última consulta e baixa uma versão nova do servidor de conteúdo.
//
// Tudo aqui é puro: a validação recebe o JSON já lido e nunca confia nele,
// porque o arquivo remoto pode estar quebrado ou ser de uma versão futura.

import { COMPULSION_TYPES, type CompulsionType } from './compulsion';
import { fromDayKey } from './day';

/** Maior `formatVersion` que este app entende. Um catálogo de formato maior é ignorado. */
export const CATALOG_FORMAT_VERSION = 1;

/** Idiomas com catálogo. Um arquivo por idioma (`catalog.<locale>.json`). */
export const CATALOG_LOCALES = ['pt-BR'] as const;
export type CatalogLocale = (typeof CATALOG_LOCALES)[number];

/** Maior dia de marco aceito (dez anos), só para recusar números absurdos. */
export const MAX_MILESTONE_DAY = 3650;

/**
 * Tamanho máximo do arquivo baixado, em caracteres. O catálogo real tem
 * dezenas de KB; acima disso, algo está errado no servidor.
 */
export const MAX_CATALOG_LENGTH = 2_000_000;

/**
 * Identificador opaco do vídeo (`videos/<id>.mp4`): só letras minúsculas e
 * números, sem tema no nome e sem como sair da pasta.
 */
const VIDEO_ID_PATTERN = /^[a-z0-9]{4,32}$/;

/** Referências abrem no navegador do aparelho: só endereços https. */
const REFERENCE_URL_PATTERN = /^https:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/;

export type CatalogReference = {
  readonly label: string;
  readonly url: string;
};

export type CatalogVideo = {
  readonly id: string;
  readonly durationSeconds: number;
  /** Selo "Conteúdo gerado com IA" (doc 01, 6.4). */
  readonly aiGenerated: boolean;
};

export type CatalogMilestone = {
  readonly day: number;
  readonly title: string;
  readonly summary: string;
  readonly body: string;
  readonly references: readonly CatalogReference[];
  /** Gratuito no plano (Fase 6). Nesta fase só fica marcado. */
  readonly free: boolean;
  /** Nulo: marco sem vídeo. */
  readonly video: CatalogVideo | null;
};

export type CompulsionContent = {
  /** Em ordem crescente de dia, sem repetir. */
  readonly milestones: readonly CatalogMilestone[];
};

export type Catalog = {
  readonly formatVersion: number;
  readonly contentVersion: number;
  /** AAAA-MM-DD. */
  readonly updatedAt: string;
  /** Uma compulsão pode faltar: o app usa a lista de reserva (`MILESTONE_DAYS`). */
  readonly compulsions: Partial<Record<CompulsionType, CompulsionContent>>;
};

/** Por que um catálogo foi recusado. Sem detalhes do conteúdo, para poder ir a um log. */
export type CatalogRejection = 'unsupported_format' | 'invalid';

export type CatalogParseResult =
  | { readonly ok: true; readonly catalog: Catalog }
  | { readonly ok: false; readonly reason: CatalogRejection };

type Fields = Record<string, unknown>;

function isObject(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Erro interno da validação: vira `invalid` em `parseCatalog`. */
class InvalidCatalog extends Error {}

function fail(): never {
  throw new InvalidCatalog();
}

function parseReference(raw: unknown): CatalogReference {
  if (!isObject(raw) || !isText(raw.label)) fail();
  if (typeof raw.url !== 'string' || !REFERENCE_URL_PATTERN.test(raw.url)) fail();
  return { label: raw.label, url: raw.url };
}

function parseVideo(raw: unknown): CatalogVideo | null {
  if (raw === undefined || raw === null) return null;
  if (!isObject(raw)) fail();
  if (typeof raw.id !== 'string' || !VIDEO_ID_PATTERN.test(raw.id)) fail();
  if (!isPositiveInteger(raw.durationSeconds)) fail();
  if (typeof raw.aiGenerated !== 'boolean') fail();
  return { id: raw.id, durationSeconds: raw.durationSeconds, aiGenerated: raw.aiGenerated };
}

function parseMilestone(raw: unknown): CatalogMilestone {
  if (!isObject(raw)) fail();
  const { day, title, summary, body, references, free, video } = raw;
  if (!isPositiveInteger(day) || day > MAX_MILESTONE_DAY) fail();
  if (!isText(title) || !isText(summary) || !isText(body)) fail();
  if (!Array.isArray(references)) fail();
  if (typeof free !== 'boolean') fail();
  return {
    day,
    title,
    summary,
    body,
    references: references.map(parseReference),
    free,
    video: parseVideo(video),
  };
}

function parseCompulsion(raw: unknown): CompulsionContent {
  if (!isObject(raw) || !Array.isArray(raw.milestones) || raw.milestones.length === 0) fail();
  const milestones = raw.milestones.map(parseMilestone);
  // Dias únicos e crescentes: a linha do tempo e o "próximo marco" dependem disso.
  milestones.forEach((milestone, index) => {
    const previous = milestones[index - 1];
    if (previous !== undefined && milestone.day <= previous.day) fail();
  });
  return { milestones };
}

/**
 * Confere o catálogo campo a campo. Campos desconhecidos são ignorados (um
 * catálogo do mesmo formato pode ganhar campos opcionais); compulsões
 * desconhecidas também, para um app antigo aceitar um catálogo com uma
 * compulsão nova. Precisa haver ao menos uma compulsão conhecida.
 */
export function parseCatalog(raw: unknown): CatalogParseResult {
  if (!isObject(raw) || !isPositiveInteger(raw.formatVersion)) {
    return { ok: false, reason: 'invalid' };
  }
  if (raw.formatVersion > CATALOG_FORMAT_VERSION)
    return { ok: false, reason: 'unsupported_format' };
  try {
    if (!isPositiveInteger(raw.contentVersion)) fail();
    if (typeof raw.updatedAt !== 'string' || fromDayKey(raw.updatedAt) === null) fail();
    if (!isObject(raw.compulsions)) fail();
    const compulsions: Partial<Record<CompulsionType, CompulsionContent>> = {};
    for (const type of COMPULSION_TYPES) {
      const content = raw.compulsions[type];
      if (content !== undefined) compulsions[type] = parseCompulsion(content);
    }
    if (Object.keys(compulsions).length === 0) fail();
    return {
      ok: true,
      catalog: {
        formatVersion: raw.formatVersion,
        contentVersion: raw.contentVersion,
        updatedAt: raw.updatedAt,
        compulsions,
      },
    };
  } catch (error) {
    if (error instanceof InvalidCatalog) return { ok: false, reason: 'invalid' };
    throw error;
  }
}

/** O texto baixado ou guardado: JSON válido, dentro do tamanho, e então `parseCatalog`. */
export function parseCatalogText(text: string): CatalogParseResult {
  if (text.length > MAX_CATALOG_LENGTH) return { ok: false, reason: 'invalid' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  return parseCatalog(raw);
}

/** De onde veio o catálogo em uso. */
export type CatalogSource = 'embedded' | 'cache';

/**
 * O catálogo em uso: o guardado no banco, se for válido e mais novo que o
 * embutido; senão, o embutido. Depois de uma atualização do app, o embutido
 * pode ser o mais novo.
 */
export function pickCurrentCatalog(
  embedded: Catalog,
  cached: Catalog | null,
): { catalog: Catalog; source: CatalogSource } {
  if (cached !== null && cached.contentVersion > embedded.contentVersion) {
    return { catalog: cached, source: 'cache' };
  }
  return { catalog: embedded, source: 'embedded' };
}

/** O que fazer com o guardado no banco depois de uma consulta que trouxe um catálogo válido. */
export type CacheUpdate = 'replace' | 'touch';

/**
 * Guarda o remoto se não houver nada guardado ou se ele for mais novo que o
 * guardado; senão, só registra a hora da consulta. Um catálogo remoto mais
 * velho (o servidor voltou atrás) nunca troca o guardado.
 */
export function getCacheUpdate(cached: Catalog | null, remote: Catalog): CacheUpdate {
  return cached === null || remote.contentVersion > cached.contentVersion ? 'replace' : 'touch';
}

/** Intervalo entre consultas ao servidor (spec 04, 4.1). */
export const CATALOG_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Depois de uma consulta que falhou (sem rede ou catálogo inválido), quanto
 * esperar antes de outra no mesmo processo. Evita tentativas em sequência a
 * cada volta do segundo plano (spec 04, 4.1).
 */
export const CATALOG_RETRY_AFTER_FAILURE_MS = 60 * 60 * 1000;

export type CatalogRefreshInput = {
  /** Última consulta que trouxe um catálogo válido (`content_catalog.fetched_at`). */
  readonly lastSuccessAt: Date | null;
  /** Última tentativa que falhou neste processo. */
  readonly lastFailureAt: Date | null;
  readonly now: Date;
};

/** Se está na hora de consultar o servidor. Um relógio que voltou atrás também libera. */
export function isCatalogRefreshDue({ lastSuccessAt, lastFailureAt, now }: CatalogRefreshInput) {
  const elapsed = (since: Date) => now.getTime() - since.getTime();
  const successDue =
    lastSuccessAt === null ||
    elapsed(lastSuccessAt) >= CATALOG_REFRESH_INTERVAL_MS ||
    elapsed(lastSuccessAt) < 0;
  const failureDue =
    lastFailureAt === null ||
    elapsed(lastFailureAt) >= CATALOG_RETRY_AFTER_FAILURE_MS ||
    elapsed(lastFailureAt) < 0;
  return successDue && failureDue;
}

/** Endereço do catálogo de um idioma, a partir do endereço base do conteúdo. */
export function getCatalogUrl(baseUrl: string, locale: CatalogLocale): string {
  return `${baseUrl.replace(/\/+$/, '')}/catalog.${locale}.json`;
}

/** Endereço de um vídeo: o identificador é opaco (spec 04, 4.2). */
export function getVideoUrl(baseUrl: string, video: CatalogVideo): string {
  return `${baseUrl.replace(/\/+$/, '')}/videos/${video.id}.mp4`;
}
