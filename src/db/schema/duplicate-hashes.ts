import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const duplicateHashes = sqliteTable("duplicate_hashes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  transactionHash: text("transaction_hash").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`).notNull(),
});
