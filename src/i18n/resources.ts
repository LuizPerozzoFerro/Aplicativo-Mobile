import about from './pt-BR/about.json';
import common from './pt-BR/common.json';
import dev from './pt-BR/dev.json';
import onboarding from './pt-BR/onboarding.json';
import tabs from './pt-BR/tabs.json';

// Textos do app, por idioma e namespace (spec 01, seção 4.5). Um idioma novo
// entra como mais uma chave aqui, com os mesmos namespaces do pt-BR.
export const DEFAULT_LANGUAGE = 'pt-BR';
export const DEFAULT_NAMESPACE = 'common';

export const resources = {
  'pt-BR': { about, common, dev, onboarding, tabs },
} as const;

export type Language = keyof typeof resources;
export type Namespace = keyof (typeof resources)[typeof DEFAULT_LANGUAGE];

export const SUPPORTED_LANGUAGES = Object.keys(resources) as Language[];
