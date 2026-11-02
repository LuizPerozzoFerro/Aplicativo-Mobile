import { resolveLanguage } from './language';

describe('resolveLanguage', () => {
  it('usa pt-BR quando o aparelho está em pt-BR', () => {
    expect(resolveLanguage(['pt-BR', 'en-US'])).toBe('pt-BR');
  });

  it('aceita outra variante do português pelo idioma base', () => {
    expect(resolveLanguage(['pt-PT'])).toBe('pt-BR');
  });

  it('cai no pt-BR quando nenhum idioma do aparelho é suportado', () => {
    expect(resolveLanguage(['en-US', 'es-ES'])).toBe('pt-BR');
    expect(resolveLanguage([])).toBe('pt-BR');
    expect(resolveLanguage([null])).toBe('pt-BR');
  });
});
