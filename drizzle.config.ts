import { defineConfig } from 'drizzle-kit';

// Gera as migrações SQL a partir do esquema: `npm run db:generate`.
// driver 'expo' cria o drizzle/migrations.js que o app embute.
export default defineConfig({
  schema: './src/data/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
});
