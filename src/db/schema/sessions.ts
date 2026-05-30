import { pgTable, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  data: jsonb("data").default('[]').notNull(),
  images: jsonb("images").default('[]').notNull(),
  metadata: jsonb("metadata").default('{}').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
