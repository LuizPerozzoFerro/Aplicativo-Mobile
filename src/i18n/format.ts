import i18n from 'i18next';

// Formatação única de datas e números, sempre no idioma ativo do app
// (spec 01, seção 4.5). Nenhuma tela chama Intl ou toLocaleString direto.

function activeLanguage(language?: string): string {
  return language ?? i18n.language ?? 'pt-BR';
}

export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
  language?: string,
): string {
  return new Intl.DateTimeFormat(activeLanguage(language), options).format(date);
}

export function formatTime(date: Date, language?: string): string {
  return new Intl.DateTimeFormat(activeLanguage(language), { timeStyle: 'short' }).format(date);
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
  language?: string,
): string {
  return new Intl.NumberFormat(activeLanguage(language), options).format(value);
}
