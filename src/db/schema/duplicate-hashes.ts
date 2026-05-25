import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const duplicateHashes = pgTable("duplicate_hashes", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionHash: varchar("transaction_hash", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
