/**
 * Database client singleton using Drizzle ORM + PostgreSQL.
 *
 * This module automatically applies any pending Postgres migrations on startup,
 * so no manual `npm run db:push` or `npm run db:migrate` is needed.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";
import * as schema from "./schema/index";

/**
 * Global database reference to prevent multiple connections
 * during Next.js development hot-reloads.
 */
declare global {
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/finance_parser",
  });
}

const pool = globalThis.__pgPool ??= createPool();

export const db = drizzle(pool, {
  schema,
  casing: "snake_case",
  logger: process.env["NODE_ENV"] === "development",
});

// Auto-apply migrations so the app works out of the box on any machine.
// Uses the pre-generated SQL files in src/db/migrations/.
// We suppress the "relation already exists" error (pg code 42P07) that can
// occur when multiple Next.js build workers run migrations in parallel.
migrate(db, {
  migrationsFolder: path.resolve(process.cwd(), "src/db/migrations"),
}).catch((err: unknown) => {
  const cause = err instanceof Error && err.cause ? (err.cause as { code?: string }) : null;
  const msg = err instanceof Error ? err.message : "";
  if (cause?.code === "42P07" || msg.includes("already exists")) {
    // Tables already exist — safe to ignore during parallel builds.
    return;
  }
  console.error("❌ Migration failed:", err);
});

export type DatabaseType = typeof db;
