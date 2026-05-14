import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: new URL('../../.env', import.meta.url) });
config();

const migrationUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:password@localhost:5432/corafit';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: migrationUrl,
  },
});
