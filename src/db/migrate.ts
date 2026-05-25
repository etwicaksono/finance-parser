/**
 * Migration runner script.
 *
 * Run with:
 *   npx tsx src/db/migrate.ts
 *
 * Or via npm script:
 *   npm run db:migrate
 *
 * This applies all pending migrations from src/db/migrations/ to the database.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema/index";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
      "Cannot run migrations without a database connection."
  );
}

async function runMigrations(): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });

  const db = drizzle(pool, { schema, casing: "snake_case" });

  // eslint-disable-next-line no-console
  console.log("⏳ Running migrations...");

  const start = Date.now();

  await migrate(db, {
    migrationsFolder: "./src/db/migrations",
  });

  const duration = Date.now() - start;

  // eslint-disable-next-line no-console
  console.log(`✅ Migrations applied successfully in ${duration}ms`);

  await pool.end();
}

runMigrations().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
