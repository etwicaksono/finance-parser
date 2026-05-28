import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const accounts = pgTable("accounts", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
