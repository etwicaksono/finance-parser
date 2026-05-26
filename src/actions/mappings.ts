"use server";

import { db } from "@/db";
import { keywordMappings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getMappings() {
  try {
    const allMappings = await db.select().from(keywordMappings).all();
    return { data: allMappings };
  } catch (error) {
    console.error("Failed to fetch mappings:", error);
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
        categoryId 
      })
      .returning()
      .get();
      
    revalidatePath("/");
    return { data: inserted };
  } catch (error: any) {
    console.error("Failed to add mapping:", error);
    if (error?.message?.includes("UNIQUE constraint failed")) {
      return { error: "This keyword already exists" };
    }
    return { error: "Failed to add mapping" };
  }
}

export async function addAiMapping(keyword: string, aiCategory: string, aiParentCategory: string) {
  if (!keyword || keyword.trim() === "") {
    return { error: "Keyword is required" };
  }

  try {
    const inserted = await db
      .insert(keywordMappings)
      .values({
        keyword: keyword.trim().toLowerCase(),
        aiCategory,
        aiParentCategory,
      })
      // If keyword already exists (e.g. from manual DB), we can choose to update or ignore.
      // Let's just update the AI parts if it already exists.
      .onConflictDoUpdate({
        target: keywordMappings.keyword,
        set: {
          aiCategory,
          aiParentCategory,
          updatedAt: new Date(),
        }
      })
      .returning()
      .get();
      
    revalidatePath("/");
    return { data: inserted };
  } catch (error: any) {
    console.error("Failed to add AI mapping:", error);
    return { error: "Failed to add AI mapping" };
  }
}

export async function deleteMapping(id: string) {
  if (!id) {
    return { error: "Mapping ID is required" };
  }

  try {
    const deleted = await db.delete(keywordMappings).where(eq(keywordMappings.id, id)).returning().get();
    revalidatePath("/");
    return { data: deleted };
  } catch (error) {
    console.error("Failed to delete mapping:", error);
    return { error: "Failed to delete mapping." };
  }
}
