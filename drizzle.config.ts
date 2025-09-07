import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'turso',
  dbCredentials: {
    url: 'libsql://countdown-pianopia.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NDM2ODM2NDEsImlkIjoiNTViNDdjNTItNjAzNy00YmFkLTkwZmMtOGZhOGJlMDI0NjRjIn0.BzNssln4iq1Fo-JKHOzI6qusJDhQoyRU_LWov0tbWW2lYs7kcqBc3A3TPteh_COshj9StqudJrq7ndOrahTYAw',
  },
} satisfies Config; 