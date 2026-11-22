import { CATALOG_LOCALES, parseCatalog, type Catalog } from '@/domain/catalog';
import { COMPULSION_TYPES } from '@/domain/compulsion';
import { MILESTONE_DAYS } from '@/domain/streak';

import { EMBEDDED_CATALOGS } from './embedded';

// O catálogo de `content/` é embutido no app: precisa ser válido, senão o app
// não abre o conteúdo. E nesta fase ele é o conteúdo de teste da spec 04, 5.1.

function embedded(locale: (typeof CATALOG_LOCALES)[number]): Catalog {
  const result = parseCatalog(EMBEDDED_CATALOGS[locale]);
  if (!result.ok) throw new Error(`catálogo embutido inválido: ${result.reason}`);
  return result.catalog;
}

describe.each(CATALOG_LOCALES)('catálogo embutido %s', (locale) => {
  const catalog = embedded(locale);
  const all = COMPULSION_TYPES.flatMap(
    (type) => catalog.compulsions[type]?.milestones.map((item) => ({ type, ...item })) ?? [],
  );

  it('é válido e tem as duas compulsões', () => {
    expect(Object.keys(catalog.compulsions).sort()).toEqual([...COMPULSION_TYPES].sort());
  });

  it('tem os marcos de 1, 3, 7, 14, 30, 60, 90, 180 e 365 dias nas duas', () => {
    for (const type of COMPULSION_TYPES) {
      expect(catalog.compulsions[type]?.milestones.map((item) => item.day)).toEqual([
        ...MILESTONE_DAYS,
      ]);
    }
  });

  it('marca como gratuitos só os marcos até 7 dias', () => {
    expect(all.filter((item) => item.free).every((item) => item.day <= 7)).toBe(true);
    expect(all.filter((item) => item.day <= 7).every((item) => item.free)).toBe(true);
  });

  it('tem vídeo só até 30 dias, com identificadores únicos', () => {
    const withVideo = all.filter((item) => item.video !== null);
    expect(withVideo.every((item) => item.day <= 30)).toBe(true);
    expect(all.filter((item) => item.day <= 30).every((item) => item.video !== null)).toBe(true);
    const ids = withVideo.map((item) => item.video?.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('marca um vídeo só como gerado com IA, para conferir o selo', () => {
    expect(all.filter((item) => item.video?.aiGenerated)).toHaveLength(1);
  });

  it('é claramente de teste, com referências num domínio de exemplo', () => {
    for (const item of all) {
      expect(item.title).toMatch(/teste/i);
      expect(item.references.length).toBeGreaterThan(0);
      for (const reference of item.references) {
        expect(new URL(reference.url).hostname).toBe('example.com');
      }
    }
  });
});
