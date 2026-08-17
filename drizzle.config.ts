import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./database/migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  schemaFilter: ["public"],
  // Render installs pg_stat_statements relations in the public schema. They
  // belong to the PostgreSQL extension and must not be managed by Drizzle.
  tablesFilter: ["!pg_stat_*"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
