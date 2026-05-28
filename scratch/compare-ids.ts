import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { pgTable, varchar } from "drizzle-orm/pg-core";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const categories = pgTable("categories", { id: varchar("id", { length: 36 }) });
const accounts = pgTable("accounts", { id: varchar("id", { length: 36 }) });

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/finance_parser",
  });
  const db = drizzle(pool, { casing: "snake_case" });

  const cats = await db.select().from(categories).limit(3);
  const accs = await db.select().from(accounts).limit(3);

  console.log("Categories IDs:", cats.map(c => c.id));
  console.log("Accounts IDs:", accs.map(a => a.id));

  await pool.end();
}

main().catch(console.error);
