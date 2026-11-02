import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from './resources';

// Escolhe o idioma do app a partir dos idiomas do aparelho, em ordem de
// preferência. Hoje só há pt-BR, então o resultado é sempre pt-BR; a função
// existe para quando houver outros idiomas.
export function resolveLanguage(deviceLanguageTags: readonly (string | null)[]): Language {
  for (const tag of deviceLanguageTags) {
    if (!tag) continue;
    const exact = SUPPORTED_LANGUAGES.find((language) => language === tag);
    if (exact) return exact;
    const base = tag.split('-')[0];
    const sameBase = SUPPORTED_LANGUAGES.find((language) => language.split('-')[0] === base);
    if (sameBase) return sameBase;
  }
  return DEFAULT_LANGUAGE;
}
