import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Generation must work before the local Docker stack has been started.
    url: process.env.DATABASE_URL ?? 'postgresql://duckboard:duckboard@localhost:5432/duckboard',
  },
})
