import { pgTable, uuid, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { categories } from "./categories";

export const keywordMappings = pgTable("keyword_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  keyword: varchar("keyword", { length: 255 }).notNull().unique(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
