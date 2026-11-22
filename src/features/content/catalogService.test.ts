import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase, query, type TestDatabase } from '@/data/testing';
import { CATALOG_REFRESH_INTERVAL_MS, CATALOG_RETRY_AFTER_FAILURE_MS } from '@/domain/catalog';

import { createCatalogService, type CatalogService, type FetchText } from './catalogService';

const BASE_URL = 'https://conteudo.example.com';
const CATALOG_URL = `${BASE_URL}/catalog.pt-BR.json`;
const START = new Date('2026-11-22T12:00:00Z');

function catalogJson(contentVersion: number, title = `Título v${contentVersion}`) {
  return {
    formatVersion: 1,
    contentVersion,
    updatedAt: '2026-11-22',
    compulsions: {
      short_videos: {
        milestones: [
          {
            day: 1,
            title,
            summary: 'Resumo',
            body: 'Texto',
            references: [],
            free: true,
            video: null,
          },
        ],
      },
    },
  };
}

/** Servidor falso: responde o que o teste mandar e anota cada pedido. */
function createFakeServer() {
  let reply: () => Promise<{ ok: boolean; text: string }> = () =>
    Promise.resolve({ ok: false, text: '' });
  const requests: string[] = [];
  const fetchText: FetchText = (url, signal) => {
    requests.push(url);
    if (signal.aborted) return Promise.reject(new Error('abortado'));
    return reply();
  };
  return {
    fetchText,
    requests,
    serve(body: unknown) {
      reply = () => Promise.resolve({ ok: true, text: JSON.stringify(body) });
    },
    serveText(text: string) {
      reply = () => Promise.resolve({ ok: true, text });
    },
    error() {
      reply = () => Promise.resolve({ ok: false, text: '' });
    },
    offline() {
      reply = () => Promise.reject(new Error('sem rede'));
    },
    /** Nunca responde: só termina quando o app desiste (aborta). */
    hang(signalOf: () => AbortSignal | null) {
      reply = () =>
        new Promise((_resolve, reject) => {
          signalOf()?.addEventListener('abort', () => reject(new Error('abortado')));
        });
    },
  };
}

let database: TestDatabase;
let repositories: Repositories;
let clock: Date;
let server: ReturnType<typeof createFakeServer>;

function service(options: { baseUrl?: string | null; timeoutMs?: number } = {}): CatalogService {
  return createCatalogService({
    repositories: () => repositories,
    embedded: { 'pt-BR': catalogJson(2, 'Embutido') },
    locale: () => 'pt-BR',
    baseUrl: options.baseUrl === undefined ? BASE_URL : options.baseUrl,
    fetchText: server.fetchText,
    now: () => clock,
    timeoutMs: options.timeoutMs,
  });
}

const advance = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};
const titleOf = (catalog: CatalogService) =>
  catalog.current().catalog.compulsions.short_videos?.milestones[0]?.title;

beforeEach(async () => {
  database = await createTestDatabase();
  clock = START;
  repositories = createRepositories(database.db, () => clock);
  server = createFakeServer();
});

describe('catálogo em uso', () => {
  it('sem nada guardado, é o embutido, sem consulta registrada', () => {
    const catalog = service();
    expect(catalog.current()).toMatchObject({ source: 'embedded', fetchedAt: null });
    expect(titleOf(catalog)).toBe('Embutido');
  });

  it('guardado inválido no banco (ex.: corrompido) é ignorado: volta ao embutido', () => {
    repositories.contentCatalog.save({
      locale: 'pt-BR',
      formatVersion: 1,
      contentVersion: 9,
      json: '{"quebrado":',
    });
    expect(service().current().source).toBe('embedded');
  });
});

describe('atualização remota', () => {
  it('sem endereço do conteúdo, não consulta nada', async () => {
    const catalog = service({ baseUrl: null });
    expect(await catalog.refresh()).toBe('not_configured');
    expect(server.requests).toEqual([]);
  });

  it('pede só o catálogo do idioma, sem parâmetros', async () => {
    server.serve(catalogJson(2));
    await service().refresh();
    expect(server.requests).toEqual([CATALOG_URL]);
  });

  it('catálogo mais novo troca o em uso e avisa quem assinou', async () => {
    const catalog = service();
    const listener = jest.fn();
    catalog.subscribe(listener);
    server.serve(catalogJson(3));

    expect(await catalog.refresh()).toBe('updated');
    expect(catalog.current()).toMatchObject({ source: 'cache', fetchedAt: START });
    expect(titleOf(catalog)).toBe('Título v3');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('mesma versão do embutido: guarda a consulta, mas continua com o embutido', async () => {
    const catalog = service();
    server.serve(catalogJson(2, 'Remoto igual'));
    expect(await catalog.refresh()).toBe('unchanged');
    expect(catalog.current()).toMatchObject({ source: 'embedded', fetchedAt: START });
  });

  it('consulta de novo só depois de 24 horas; antes, nem chega a pedir', async () => {
    const catalog = service();
    server.serve(catalogJson(3));
    await catalog.refresh();

    advance(CATALOG_REFRESH_INTERVAL_MS - 1);
    expect(await catalog.refresh()).toBe('not_due');
    expect(server.requests).toHaveLength(1);

    advance(1);
    server.serve(catalogJson(4));
    expect(await catalog.refresh()).toBe('updated');
    expect(server.requests).toHaveLength(2);
  });

  it('a espera de 24 horas vale entre aberturas do app (fica no banco)', async () => {
    server.serve(catalogJson(3));
    await service().refresh();
    advance(60_000);
    expect(await service().refresh()).toBe('not_due');
  });

  it('remoto mais velho que o guardado: só registra a consulta, o guardado fica', async () => {
    const catalog = service();
    server.serve(catalogJson(5));
    await catalog.refresh();

    advance(CATALOG_REFRESH_INTERVAL_MS);
    server.serve(catalogJson(4));
    expect(await catalog.refresh()).toBe('unchanged');
    expect(catalog.current()).toMatchObject({ source: 'cache', fetchedAt: clock });
    expect(catalog.current().catalog.contentVersion).toBe(5);
  });

  it.each([
    ['catálogo inválido', () => server.serve({ ...catalogJson(9), contentVersion: 0 })],
    ['formato maior que o suportado', () => server.serve({ ...catalogJson(9), formatVersion: 2 })],
    ['JSON quebrado', () => server.serveText('{"formatVersion":')],
    ['erro do servidor', () => server.error()],
    ['sem rede', () => server.offline()],
  ])('%s: segue com o que tem, sem gravar nada', async (_case, setup) => {
    const catalog = service();
    server.serve(catalogJson(3));
    await catalog.refresh();
    const stored = query(database.raw, 'SELECT * FROM content_catalog');

    advance(CATALOG_REFRESH_INTERVAL_MS);
    setup();
    expect(await catalog.refresh()).toBe('failed');
    expect(titleOf(catalog)).toBe('Título v3');
    expect(query(database.raw, 'SELECT * FROM content_catalog')).toEqual(stored);
  });

  it('depois de uma falha, não tenta em sequência: espera 1 hora no mesmo processo', async () => {
    const catalog = service();
    server.offline();
    expect(await catalog.refresh()).toBe('failed');

    advance(CATALOG_RETRY_AFTER_FAILURE_MS - 1);
    expect(await catalog.refresh()).toBe('not_due');
    expect(server.requests).toHaveLength(1);

    advance(1);
    server.serve(catalogJson(3));
    expect(await catalog.refresh()).toBe('updated');
  });

  it('a consulta forçada (ferramenta de teste) ignora as esperas', async () => {
    const catalog = service();
    server.serve(catalogJson(3));
    await catalog.refresh();
    server.serve(catalogJson(4));
    expect(await catalog.refresh()).toBe('not_due');
    expect(await catalog.refresh({ force: true })).toBe('updated');
  });

  it('uma consulta por vez', async () => {
    const catalog = service();
    server.serve(catalogJson(3));
    const first = catalog.refresh();
    expect(await catalog.refresh({ force: true })).toBe('busy');
    expect(await first).toBe('updated');
    expect(server.requests).toHaveLength(1);
  });

  it('servidor que não responde: desiste no limite de tempo', async () => {
    let signal: AbortSignal | null = null;
    const catalog = createCatalogService({
      repositories: () => repositories,
      embedded: { 'pt-BR': catalogJson(2) },
      locale: () => 'pt-BR',
      baseUrl: BASE_URL,
      fetchText: (url, received) => {
        signal = received;
        return server.fetchText(url, received);
      },
      now: () => clock,
      timeoutMs: 10,
    });
    server.hang(() => signal);
    expect(await catalog.refresh()).toBe('failed');
    expect(catalog.current().source).toBe('embedded');
  });

  it('guardado corrompido é substituído na próxima consulta válida', async () => {
    repositories.contentCatalog.save({
      locale: 'pt-BR',
      formatVersion: 1,
      contentVersion: 9,
      json: '{"quebrado":',
    });
    advance(CATALOG_REFRESH_INTERVAL_MS);
    const catalog = service();
    server.serve(catalogJson(3));
    expect(await catalog.refresh()).toBe('updated');
    expect(catalog.current().source).toBe('cache');
  });
});
