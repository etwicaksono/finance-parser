import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const duplicateHashes = pgTable("duplicate_hashes", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  transactionHash: text("transaction_hash").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
