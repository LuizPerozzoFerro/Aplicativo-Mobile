import {
  CATALOG_FORMAT_VERSION,
  CATALOG_REFRESH_INTERVAL_MS,
  CATALOG_RETRY_AFTER_FAILURE_MS,
  MAX_CATALOG_LENGTH,
  getCacheUpdate,
  getCatalogUrl,
  getVideoUrl,
  isCatalogRefreshDue,
  parseCatalog,
  parseCatalogText,
  pickCurrentCatalog,
  type Catalog,
} from './catalog';

/** Um marco válido; cada teste muda só o que interessa. */
function milestone(day: number, overrides: Record<string, unknown> = {}) {
  return {
    day,
    title: `Título ${day}`,
    summary: `Resumo ${day}`,
    body: `Texto ${day}`,
    references: [{ label: 'Referência', url: 'https://example.com/a' }],
    free: day <= 7,
    video: { id: `v${day}abc`, durationSeconds: 12, aiGenerated: false },
    ...overrides,
  };
}

function rawCatalog(overrides: Record<string, unknown> = {}) {
  return {
    formatVersion: 1,
    contentVersion: 3,
    updatedAt: '2026-11-22',
    compulsions: {
      pornography: { milestones: [milestone(1), milestone(3), milestone(7)] },
      short_videos: { milestones: [milestone(1), milestone(7, { video: null })] },
    },
    ...overrides,
  };
}

function withMilestones(milestones: unknown[]) {
  return rawCatalog({ compulsions: { pornography: { milestones } } });
}

function parsed(raw: unknown): Catalog {
  const result = parseCatalog(raw);
  if (!result.ok) throw new Error(`esperava válido, veio ${result.reason}`);
  return result.catalog;
}

const reasonOf = (raw: unknown) => {
  const result = parseCatalog(raw);
  return result.ok ? 'ok' : result.reason;
};

describe('parseCatalog', () => {
  it('aceita um catálogo válido e mantém marcos, referências e vídeos', () => {
    const catalog = parsed(rawCatalog());
    expect(catalog.contentVersion).toBe(3);
    expect(catalog.compulsions.pornography?.milestones.map((item) => item.day)).toEqual([1, 3, 7]);
    expect(catalog.compulsions.pornography?.milestones[0]).toEqual({
      day: 1,
      title: 'Título 1',
      summary: 'Resumo 1',
      body: 'Texto 1',
      references: [{ label: 'Referência', url: 'https://example.com/a' }],
      free: true,
      video: { id: 'v1abc', durationSeconds: 12, aiGenerated: false },
    });
  });

  it('marco sem vídeo (nulo ou ausente) fica com video nulo', () => {
    const { video: _omit, ...withoutVideo } = milestone(14);
    const catalog = parsed(withMilestones([milestone(7, { video: null }), withoutVideo]));
    expect(catalog.compulsions.pornography?.milestones.map((item) => item.video)).toEqual([
      null,
      null,
    ]);
  });

  it('compulsão ausente fica de fora; precisa haver ao menos uma conhecida', () => {
    expect(parsed(withMilestones([milestone(1)])).compulsions.short_videos).toBeUndefined();
    expect(reasonOf(rawCatalog({ compulsions: {} }))).toBe('invalid');
    expect(reasonOf(rawCatalog({ compulsions: { other: { milestones: [milestone(1)] } } }))).toBe(
      'invalid',
    );
  });

  it('ignora compulsões e campos desconhecidos (catálogo mais novo do mesmo formato)', () => {
    const catalog = parsed(
      rawCatalog({
        extra: true,
        compulsions: {
          pornography: { milestones: [milestone(1, { newField: 'x' })], newField: 1 },
          future_type: { anything: true },
        },
      }),
    );
    expect(Object.keys(catalog.compulsions)).toEqual(['pornography']);
    expect(catalog.compulsions.pornography?.milestones[0]).not.toHaveProperty('newField');
  });

  it(`formato maior que o suportado (${CATALOG_FORMAT_VERSION}) é ignorado, mesmo que o resto pareça válido`, () => {
    expect(reasonOf(rawCatalog({ formatVersion: CATALOG_FORMAT_VERSION + 1 }))).toBe(
      'unsupported_format',
    );
    expect(reasonOf({ formatVersion: CATALOG_FORMAT_VERSION + 1 })).toBe('unsupported_format');
  });

  it.each([
    ['não é objeto', []],
    ['nulo', null],
    ['formato ausente', rawCatalog({ formatVersion: undefined })],
    ['formato zero', rawCatalog({ formatVersion: 0 })],
    ['formato fracionário', rawCatalog({ formatVersion: 1.5 })],
    ['versão do conteúdo ausente', rawCatalog({ contentVersion: undefined })],
    ['versão do conteúdo zero', rawCatalog({ contentVersion: 0 })],
    ['versão do conteúdo em texto', rawCatalog({ contentVersion: '3' })],
    ['data inválida', rawCatalog({ updatedAt: '2026-13-40' })],
    ['compulsões em lista', rawCatalog({ compulsions: [] })],
  ])('recusa catálogo com %s', (_case, raw) => {
    expect(reasonOf(raw)).toBe('invalid');
  });

  it.each([
    ['lista de marcos vazia', []],
    ['dia repetido', [milestone(1), milestone(1)]],
    ['dias fora de ordem', [milestone(3), milestone(1)]],
    ['dia zero', [milestone(0)]],
    ['dia fracionário', [milestone(1.5)]],
    ['dia acima de dez anos', [milestone(3651)]],
    ['título vazio', [milestone(1, { title: '  ' })]],
    ['resumo ausente', [milestone(1, { summary: undefined })]],
    ['texto em número', [milestone(1, { body: 3 })]],
    ['referências ausentes', [milestone(1, { references: undefined })]],
    ['referência sem rótulo', [milestone(1, { references: [{ url: 'https://example.com' }] })]],
    [
      'referência http',
      [milestone(1, { references: [{ label: 'a', url: 'http://example.com' }] })],
    ],
    [
      'referência com outro esquema',
      [milestone(1, { references: [{ label: 'a', url: 'javascript:alert(1)' }] })],
    ],
    [
      'referência sem domínio',
      [milestone(1, { references: [{ label: 'a', url: 'https://exemplo' }] })],
    ],
    ['gratuito ausente', [milestone(1, { free: undefined })]],
    [
      'vídeo com id que sai da pasta',
      [milestone(1, { video: { id: '../x', durationSeconds: 1, aiGenerated: false } })],
    ],
    [
      'vídeo com id em maiúsculas',
      [milestone(1, { video: { id: 'ABCD', durationSeconds: 1, aiGenerated: false } })],
    ],
    [
      'vídeo sem duração',
      [milestone(1, { video: { id: 'abcd', durationSeconds: 0, aiGenerated: false } })],
    ],
    ['vídeo sem o selo de IA', [milestone(1, { video: { id: 'abcd', durationSeconds: 5 } })]],
  ])('recusa marco com %s', (_case, milestones) => {
    expect(reasonOf(withMilestones(milestones))).toBe('invalid');
  });

  it('aceita lista de referências vazia', () => {
    expect(reasonOf(withMilestones([milestone(1, { references: [] })]))).toBe('ok');
  });
});

describe('parseCatalogText', () => {
  it('lê o texto e valida', () => {
    expect(parseCatalogText(JSON.stringify(rawCatalog())).ok).toBe(true);
  });

  it('JSON quebrado é inválido', () => {
    expect(parseCatalogText('{"formatVersion": 1,')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseCatalogText('')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('texto acima do tamanho máximo é inválido sem ler o JSON', () => {
    const huge = JSON.stringify(rawCatalog({ padding: 'x'.repeat(MAX_CATALOG_LENGTH) }));
    expect(parseCatalogText(huge)).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('pickCurrentCatalog', () => {
  const embedded = parsed(rawCatalog({ contentVersion: 3 }));

  it('sem nada guardado, usa o embutido', () => {
    expect(pickCurrentCatalog(embedded, null)).toEqual({ catalog: embedded, source: 'embedded' });
  });

  it('usa o guardado só quando é mais novo', () => {
    const newer = parsed(rawCatalog({ contentVersion: 4 }));
    const same = parsed(rawCatalog({ contentVersion: 3 }));
    const older = parsed(rawCatalog({ contentVersion: 2 }));
    expect(pickCurrentCatalog(embedded, newer).source).toBe('cache');
    expect(pickCurrentCatalog(embedded, same).source).toBe('embedded');
    // Depois de atualizar o app, o embutido pode ser o mais novo.
    expect(pickCurrentCatalog(embedded, older).source).toBe('embedded');
  });
});

describe('getCacheUpdate', () => {
  const v = (contentVersion: number) => parsed(rawCatalog({ contentVersion }));

  it('guarda o remoto sem nada guardado ou quando ele é mais novo', () => {
    expect(getCacheUpdate(null, v(1))).toBe('replace');
    expect(getCacheUpdate(v(3), v(4))).toBe('replace');
  });

  it('com a mesma versão ou uma mais velha, só registra a consulta', () => {
    expect(getCacheUpdate(v(3), v(3))).toBe('touch');
    expect(getCacheUpdate(v(3), v(2))).toBe('touch');
  });
});

describe('isCatalogRefreshDue', () => {
  const now = new Date('2026-11-22T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it('sem consulta anterior, consulta', () => {
    expect(isCatalogRefreshDue({ lastSuccessAt: null, lastFailureAt: null, now })).toBe(true);
  });

  it('consulta de novo só depois de 24 horas', () => {
    const due = (ms: number) =>
      isCatalogRefreshDue({ lastSuccessAt: ago(ms), lastFailureAt: null, now });
    expect(due(CATALOG_REFRESH_INTERVAL_MS - 1)).toBe(false);
    expect(due(CATALOG_REFRESH_INTERVAL_MS)).toBe(true);
  });

  it('depois de uma falha, espera antes de tentar de novo, mesmo vencidas as 24 horas', () => {
    const due = (ms: number) =>
      isCatalogRefreshDue({ lastSuccessAt: null, lastFailureAt: ago(ms), now });
    expect(due(CATALOG_RETRY_AFTER_FAILURE_MS - 1)).toBe(false);
    expect(due(CATALOG_RETRY_AFTER_FAILURE_MS)).toBe(true);
  });

  it('relógio que voltou atrás libera a consulta, para não travar por dias', () => {
    const future = new Date(now.getTime() + 60_000);
    expect(isCatalogRefreshDue({ lastSuccessAt: future, lastFailureAt: null, now })).toBe(true);
    expect(isCatalogRefreshDue({ lastSuccessAt: null, lastFailureAt: future, now })).toBe(true);
  });
});

describe('endereços', () => {
  it('monta o do catálogo e o do vídeo, com ou sem barra no fim', () => {
    expect(getCatalogUrl('https://conteudo.example.com', 'pt-BR')).toBe(
      'https://conteudo.example.com/catalog.pt-BR.json',
    );
    expect(getCatalogUrl('https://conteudo.example.com/', 'pt-BR')).toBe(
      'https://conteudo.example.com/catalog.pt-BR.json',
    );
    expect(
      getVideoUrl('https://conteudo.example.com//', {
        id: 'abcd1234',
        durationSeconds: 12,
        aiGenerated: false,
      }),
    ).toBe('https://conteudo.example.com/videos/abcd1234.mp4');
  });
});
