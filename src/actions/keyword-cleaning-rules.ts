"use server";

import { db } from "@/db";
import { keywordCleaningRules } from "@/db/schema";
import { eq, like, and, asc, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { KeywordCleaningRuleType, KeywordCleaningRules } from "@/lib/keyword-utils";

const DEFAULT_QUANTITY_UNITS = [
  "kg", "g", "gr", "gram", "ml", "liter", "l", "pcs", "buah", "biji",
  "slop", "pack", "ikat", "besek", "box", "porsi", "botol", "kaleng",
  "cup", "bungkus", "bks", "lembar", "lbr",
];

const DEFAULT_DISCOUNT_PREFIXES = [
  "Disc",
];

export async function getKeywordCleaningRules(): Promise<{ data?: KeywordCleaningRules; error?: string }> {
  try {
    const rows = await db.select().from(keywordCleaningRules).orderBy(keywordCleaningRules.type, keywordCleaningRules.value);
    const quantityUnits = rows.filter(r => r.type === "quantity_unit").map(r => r.value);
    const discountPrefixes = rows.filter(r => r.type === "discount_prefix").map(r => r.value);
    return { data: { quantityUnits, discountPrefixes } };
  } catch (error: unknown) {
    console.error("Error fetching keyword cleaning rules:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getKeywordCleaningRulesRaw(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "value" | "createdAt";
  sortOrder?: "asc" | "desc";
  type?: string;
}) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10;
  const search = options?.search?.trim() ?? "";
  const type = options?.type;
  const sortBy = options?.sortBy ?? "value";
  const sortOrder = options?.sortOrder ?? "asc";
  const offset = (page - 1) * pageSize;

  try {
    const conditions = [];
    if (search) conditions.push(like(keywordCleaningRules.value, `%${search}%`));
    if (type) conditions.push(eq(keywordCleaningRules.type, type));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderCol = sortBy === "createdAt" ? keywordCleaningRules.createdAt : keywordCleaningRules.value;
    const orderClause = sortOrder === "desc" ? desc(orderCol) : asc(orderCol);

    const [data, totalResult] = await Promise.all([
      db.select().from(keywordCleaningRules).where(whereClause).orderBy(orderClause).limit(pageSize).offset(offset),
      db.select({ count: count() }).from(keywordCleaningRules).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;
    return { data, total, page, pageSize };
  } catch (error: unknown) {
    console.error("Error fetching keyword cleaning rules:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function addKeywordCleaningRule(type: KeywordCleaningRuleType, value: string) {
  try {
    const v = value.trim();
    if (!v) return { error: "Value cannot be empty" };

    // Check for existing
    const [existing] = await db.select().from(keywordCleaningRules)
      .where(and(eq(keywordCleaningRules.type, type), eq(keywordCleaningRules.value, v)));
    if (existing) return { error: "This value already exists" };

    const [data] = await db
      .insert(keywordCleaningRules)
      .values({ type, value: v })
      .returning();

    revalidatePath("/settings");
    return { data };
  } catch (error: unknown) {
    console.error("Error adding keyword cleaning rule:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function updateKeywordCleaningRule(id: string, value: string) {
  try {
    const v = value.trim();
    if (!v) return { error: "Value cannot be empty" };

    // Get current rule
    const [current] = await db.select().from(keywordCleaningRules).where(eq(keywordCleaningRules.id, id));
    if (!current) return { error: "Rule not found" };

    // No change
    if (current.value === v) return { success: true };

    // Check for duplicates (same type + value)
    const [duplicate] = await db.select().from(keywordCleaningRules)
      .where(and(eq(keywordCleaningRules.type, current.type), eq(keywordCleaningRules.value, v)));
    if (duplicate) return { error: "A rule with this value already exists" };

    await db.update(keywordCleaningRules).set({ value: v }).where(eq(keywordCleaningRules.id, id));
    revalidatePath("/settings");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating keyword cleaning rule:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deleteKeywordCleaningRule(id: string) {
  try {
    await db.delete(keywordCleaningRules).where(eq(keywordCleaningRules.id, id));
    revalidatePath("/settings");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting keyword cleaning rule:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function seedDefaultKeywordCleaningRules() {
  try {
    const existing = await db.select().from(keywordCleaningRules);
    if (existing.length === 0) {
      const defaults = [
        ...DEFAULT_QUANTITY_UNITS.map(v => ({ type: "quantity_unit" as const, value: v })),
        ...DEFAULT_DISCOUNT_PREFIXES.map(v => ({ type: "discount_prefix" as const, value: v })),
      ];
      await db.insert(keywordCleaningRules).values(defaults).onConflictDoNothing();
      revalidatePath("/settings");
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Error seeding keyword cleaning rules:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
