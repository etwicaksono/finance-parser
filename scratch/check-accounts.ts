import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool, { casing: "snake_case" });
  
  const res = await db.execute("SELECT * FROM accounts");
  console.log(res.rows);

  await pool.end();
}

main().catch(console.error);
