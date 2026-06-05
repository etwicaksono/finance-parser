import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
config({ path: ".env" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/finance_parser",
  },
  casing: "snake_case",
  verbose: true,
  strict: false,
});
