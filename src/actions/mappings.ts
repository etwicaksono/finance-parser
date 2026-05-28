"use server";

import { db } from "@/db";
import { keywordMappings } from "@/db/schema";
import { eq, like, sql, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 100;

export async function getMappings(options?: { page?: number; search?: string }) {
  const page = options?.page ?? 1;
  const search = options?.search?.trim() ?? "";
  const offset = (page - 1) * PAGE_SIZE;

  try {
    const whereClause = search
      ? like(keywordMappings.keyword, `%${search}%`)
      : undefined;

    const [data, totalResult] = await Promise.all([
      db
        .select()
        .from(keywordMappings)
        .where(whereClause)
        .orderBy(keywordMappings.keyword)
        .limit(PAGE_SIZE)
        .offset(offset),
      db
        .select({ count: count() })
        .from(keywordMappings)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;
    return { data, total, page, pageSize: PAGE_SIZE };
  } catch (error) {
    console.error("Failed to fetch mappings:", error);
    return { error: "Failed to fetch mappings" };
  }
}

/** Fetch all mappings without pagination — used for the local suggestion engine on the home page. */
export async function getAllMappings() {
  try {
    const data = await db
      .select()
      .from(keywordMappings)
      .orderBy(keywordMappings.keyword);
    return { data };
  } catch (error) {
    console.error("Failed to fetch all mappings:", error);
    return { error: "Failed to fetch mappings" };
  }
}

export async function addMapping(keyword: string, categoryId: string) {
  if (!keyword || keyword.trim() === "") {
    return { error: "Keyword is required" };
  }
  if (!categoryId) {
    return { error: "Category ID is required" };
  }

  try {
    const inserted = await db
      .insert(keywordMappings)
      .values({ 
        keyword: keyword.trim().toLowerCase(), 
        categoryId,
        usageCount: 1, 
      })
      .onConflictDoUpdate({
        target: keywordMappings.keyword,
        set: { 
          categoryId,
          usageCount: sql`CASE WHEN ${keywordMappings.categoryId} = ${categoryId} THEN ${keywordMappings.usageCount} + 1 ELSE 1 END`, 
          updatedAt: new Date() 
        }
      })
      .returning();
      
    revalidatePath("/");
    return { data: inserted[0] };
  } catch (error: any) {
    console.error("Failed to add mapping:", error);
    if (error?.message?.includes("UNIQUE constraint failed") || error?.message?.includes("duplicate key")) {
      return { error: "This keyword already exists" };
    }
    return { error: "Failed to add mapping" };
  }
}

export async function batchAddMappings(mappings: { keyword: string; categoryId: string }[]) {
  const validMappings = mappings.filter((m) => m.keyword && m.keyword.trim() !== "" && m.categoryId);
  if (validMappings.length === 0) return { error: "No valid mappings provided" };

  try {
    const values = validMappings.map((m) => ({
      keyword: m.keyword.trim().toLowerCase(),
      categoryId: m.categoryId,
      usageCount: 1,
    }));

    await db
      .insert(keywordMappings)
      .values(values)
      .onConflictDoUpdate({
        target: keywordMappings.keyword,
        set: {
          categoryId: sql`EXCLUDED.category_id`,
          usageCount: sql`CASE WHEN ${keywordMappings.categoryId} = EXCLUDED.category_id THEN ${keywordMappings.usageCount} + 1 ELSE 1 END`,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to batch add mappings:", error);
    return { error: "Failed to batch add mappings" };
  }
}



export async function deleteMapping(id: string) {
  if (!id) {
    return { error: "Mapping ID is required" };
  }

  try {
    const deleted = await db.delete(keywordMappings).where(eq(keywordMappings.id, id)).returning();
    revalidatePath("/");
    return { data: deleted[0] };
  } catch (error) {
    console.error("Failed to delete mapping:", error);
    return { error: "Failed to delete mapping." };
  }
}

export async function updateMapping(id: string, newKeyword: string, newCategoryId: string) {
  if (!id) return { error: "Mapping ID is required" };
  if (!newKeyword || newKeyword.trim() === "") return { error: "Keyword is required" };
  if (!newCategoryId) return { error: "Category ID is required" };

  try {
    const updated = await db
      .update(keywordMappings)
      .set({
        keyword: newKeyword.trim().toLowerCase(),
        categoryId: newCategoryId,
        updatedAt: new Date(),
      })
      .where(eq(keywordMappings.id, id))
      .returning();
      
    revalidatePath("/");
    revalidatePath("/settings");
    return { data: updated[0] };
  } catch (error: any) {
    console.error("Failed to update mapping:", error);
    if (error?.message?.includes("UNIQUE constraint failed") || error?.message?.includes("duplicate key")) {
      return { error: "This keyword already exists" };
    }
    return { error: "Failed to update mapping." };
  }
}
