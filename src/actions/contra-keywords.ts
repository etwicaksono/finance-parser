"use server";

import { db } from "@/db";
import { contraKeywords } from "@/db/schema";
import { eq, like, and, asc, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getContraKeywords() {
  try {
    const data = await db.select().from(contraKeywords).orderBy(contraKeywords.keyword);
    return { data };
  } catch (error: unknown) {
    console.error("Error fetching contra keywords:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function getContraKeywordsPaginated(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "keyword" | "createdAt";
  sortOrder?: "asc" | "desc";
}) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 10;
  const search = options?.search?.trim() ?? "";
  const sortBy = options?.sortBy ?? "keyword";
  const sortOrder = options?.sortOrder ?? "asc";
  const offset = (page - 1) * pageSize;

  try {
    const conditions = [];
    if (search) conditions.push(like(contraKeywords.keyword, `%${search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderCol = sortBy === "createdAt" ? contraKeywords.createdAt : contraKeywords.keyword;
    const orderClause = sortOrder === "desc" ? desc(orderCol) : asc(orderCol);

    const [data, totalResult] = await Promise.all([
      db.select().from(contraKeywords).where(whereClause).orderBy(orderClause).limit(pageSize).offset(offset),
      db.select({ count: count() }).from(contraKeywords).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;
    return { data, total, page, pageSize };
  } catch (error: unknown) {
    console.error("Error fetching contra keywords:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function addContraKeyword(keyword: string) {
  try {
    const kw = keyword.toLowerCase().trim();
    if (!kw) return { error: "Keyword cannot be empty" };

    // Check for existing
    const [existing] = await db.select().from(contraKeywords)
      .where(eq(contraKeywords.keyword, kw));
    if (existing) return { error: "This keyword already exists" };

    const [data] = await db
      .insert(contraKeywords)
      .values({ keyword: kw })
      .returning();

    revalidatePath("/settings");
    return { data };
  } catch (error: unknown) {
    console.error("Error adding contra keyword:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function updateContraKeyword(id: string, keyword: string) {
  try {
    const kw = keyword.toLowerCase().trim();
    if (!kw) return { error: "Keyword cannot be empty" };

    // Get current
    const [current] = await db.select().from(contraKeywords).where(eq(contraKeywords.id, id));
    if (!current) return { error: "Keyword not found" };

    // No change
    if (current.keyword === kw) return { success: true };

    // Check for duplicates
    const [duplicate] = await db.select().from(contraKeywords)
      .where(eq(contraKeywords.keyword, kw));
    if (duplicate) return { error: "This keyword already exists" };

    await db.update(contraKeywords).set({ keyword: kw }).where(eq(contraKeywords.id, id));
    revalidatePath("/settings");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating contra keyword:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function deleteContraKeyword(id: string) {
  try {
    await db.delete(contraKeywords).where(eq(contraKeywords.id, id));
    revalidatePath("/settings");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting contra keyword:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

const DEFAULT_CONTRA_KEYWORDS = [
  "diskon",
  "disc",
  "voucher",
  "vocer",
  "cashback",
  "promo",
  "potongan",
  "refund",
  "kembali",
  "kembalian"
];

export async function seedDefaultContraKeywords() {
  try {
    const existing = await db.select().from(contraKeywords);
    if (existing.length === 0) {
      await db.insert(contraKeywords).values(
        DEFAULT_CONTRA_KEYWORDS.map(kw => ({ keyword: kw }))
      ).onConflictDoNothing();
      revalidatePath("/settings");
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Error seeding contra keywords:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
