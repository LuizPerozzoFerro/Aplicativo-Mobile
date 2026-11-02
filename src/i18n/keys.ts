// Varredura estática das chaves de tradução usadas no código (spec 01, seção
// 4.5). Usada pelo teste que confere se toda chave existe no pt-BR; complementa
// as chaves tipadas, que só valem onde o TypeScript enxerga o tipo.

export type KeyUsage = { file: string; namespace: string; key: string };
export type ScanResult = { usages: KeyUsage[]; dynamic: { file: string; snippet: string }[] };

const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other'];

/** Namespaces declarados em useTranslation('ns') ou useTranslation(['ns', ...]); o primeiro é o padrão. */
function declaredNamespaces(source: string, fallback: string): string[] {
  const match = /useTranslation\(\s*(\[[^\]]*\]|['"][^'"]+['"])?/.exec(source);
  const arg = match?.[1];
  if (!arg) return [fallback];
  const names = [...arg.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]!);
  return names.length > 0 ? names : [fallback];
}

/** Remove comentários de bloco e de linha (sem tocar em "//" de URLs dentro de textos). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

export function scanSource(file: string, rawSource: string, defaultNamespace: string): ScanResult {
  const source = stripComments(rawSource);
  const [namespace] = declaredNamespaces(source, defaultNamespace) as [string];
  const usages: KeyUsage[] = [];
  const dynamic: ScanResult['dynamic'] = [];

  // t('chave'), t("chave") ou t(`chave`) sem interpolação no nome da chave.
  for (const call of source.matchAll(/(?<![\w.$])t\(\s*([^,)]*)/g)) {
    const arg = call[1]!.trim();
    const literal = /^(['"])([^'"]+)\1$/.exec(arg) ?? /^`([^`$]+)`$/.exec(arg);
    if (!literal) {
      dynamic.push({ file, snippet: call[0] });
      continue;
    }
    const raw = literal[literal.length - 1]!;
    const separator = raw.indexOf(':');
    usages.push(
      separator > 0
        ? { file, namespace: raw.slice(0, separator), key: raw.slice(separator + 1) }
        : { file, namespace, key: raw },
    );
  }

  // <Trans i18nKey="chave" />
  for (const trans of source.matchAll(/i18nKey=\{?\s*['"]([^'"]+)['"]/g)) {
    usages.push({ file, namespace, key: trans[1]! });
  }

  return { usages, dynamic };
}

function lookup(tree: unknown, path: string[]): unknown {
  let node = tree;
  for (const part of path) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/**
 * Chaves plurais (com _one ou _other) que não têm a forma _zero, como
 * `namespace:caminho.base`. No pt-BR o 0 cai em "one" ("0 dia"), então toda
 * contagem que pode ser zero precisa de _zero (convenção do NOTAS-APP.md).
 */
export function pluralsWithoutZero(namespaces: Record<string, unknown>): string[] {
  const missing: string[] = [];
  const walk = (node: unknown, prefix: string) => {
    if (typeof node !== 'object' || node === null) return;
    const entries = node as Record<string, unknown>;
    const bases = new Set(
      Object.keys(entries)
        .filter((key) => /_(one|other)$/.test(key))
        .map((key) => key.replace(/_(one|other)$/, '')),
    );
    for (const base of bases) {
      if (typeof entries[`${base}_zero`] !== 'string') missing.push(`${prefix}${base}`);
    }
    for (const [key, child] of Object.entries(entries)) walk(child, `${prefix}${key}.`);
  };
  for (const [namespace, tree] of Object.entries(namespaces)) walk(tree, `${namespace}:`);
  return missing;
}

/** A chave existe como texto, ou como plural (chave_one, chave_other...). */
export function keyExists(namespaceTree: unknown, key: string): boolean {
  const path = key.split('.');
  if (typeof lookup(namespaceTree, path) === 'string') return true;
  const parent = lookup(namespaceTree, path.slice(0, -1));
  const last = path[path.length - 1];
  return PLURAL_SUFFIXES.some(
    (suffix) =>
      typeof parent === 'object' &&
      parent !== null &&
      typeof (parent as Record<string, unknown>)[`${last}_${suffix}`] === 'string',
  );
}
