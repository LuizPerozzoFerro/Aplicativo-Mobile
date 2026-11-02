// Preparação comum dos testes em Jest.

// Nos testes não há app.config avaliado pela CLI, e o src/config/variant.ts
// lança erro sem `expoConfig.extra.environment`. Os testes rodam como
// `development`; quem precisar de outro ambiente usa `resolveVariant` direto.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { environment: 'development' } } },
}));
