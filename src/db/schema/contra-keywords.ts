import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const contraKeywords = pgTable("contra_keywords", {
  id: uuid("id").primaryKey().defaultRandom(),
  keyword: text("keyword").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
