import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resolveLanguage } from './language';
import { DEFAULT_LANGUAGE, DEFAULT_NAMESPACE, resources } from './resources';

// Configuração única do i18next (spec 01, seção 4.5). Importar este módulo uma
// vez, no layout raiz, antes de qualquer tela usar useTranslation().
// A forma i18n.use(...) é a da documentação do i18next; a regra abaixo a
// confunde com o `use` exportado pelo nome.
// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(getLocales().map((locale) => locale.languageTag)),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: DEFAULT_NAMESPACE,
  ns: Object.keys(resources[DEFAULT_LANGUAGE]),
  interpolation: {
    // O React já escapa o que renderiza.
    escapeValue: false,
  },
  // Recursos embutidos: a inicialização é síncrona, sem tela piscando sem texto.
  initAsync: false,
});

export default i18n;
