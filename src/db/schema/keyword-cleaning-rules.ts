import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const keywordCleaningRules = pgTable("keyword_cleaning_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // 'quantity_unit' | 'discount_prefix'
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
