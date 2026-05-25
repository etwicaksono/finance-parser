import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: ".data/sqlite.db",
  },
  casing: "snake_case",
  verbose: true,
  strict: false,
});
