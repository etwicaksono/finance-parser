import { pgTable, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * User-managed labels that can be attached to keyword mappings and transactions.
 *
 * Names are displayed with the capitalization the user typed, but uniqueness is
 * enforced case-insensitively via a functional index on lower(name) so labels
 * like "Food" and "food" cannot both exist.
 */
export const labels = pgTable(
  "labels",
  {
    id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    // Optional label chip colors as #rrggbb. NULL keeps the default neutral
    // styling, so existing labels are unaffected until a color is set.
    textColor: varchar("text_color", { length: 7 }),
    bgColor: varchar("bg_color", { length: 7 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("labels_name_lower_unique").on(sql`lower(${table.name})`),
  ]
);
