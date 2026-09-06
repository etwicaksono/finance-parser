"use server";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { CategorySign } from "@/types";

const VALID_SIGNS: CategorySign[] = ["income", "expense", "both"];

function isCategorySign(value: unknown): value is CategorySign {
  return typeof value === "string" && (VALID_SIGNS as string[]).includes(value);
}

export async function getCategories() {
  try {
    const allCategories = await db.select().from(categories);
    return { data: allCategories };
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return { error: "Failed to fetch categories" };
  }
}

export async function addCategory(
  name: string,
  signType: CategorySign = "expense"
) {
  if (!name || name.trim() === "") {
    return { error: "Category name is required" };
  }
  if (!isCategorySign(signType)) {
    return { error: "Category sign type must be income, expense, or both" };
  }

  try {
    const inserted = await db
      .insert(categories)
      .values({ name: name.trim(), signType })
      .returning();
    revalidatePath("/");
    return { data: inserted[0] };
  } catch (error) {
    console.error("Failed to add category:", error);
    return { error: "Failed to add category" };
  }
}

export async function updateCategory(
  id: string,
  name: string,
  signType?: CategorySign
) {
  if (!id || !name || name.trim() === "") {
    return { error: "Category ID and name are required" };
  }
  if (signType !== undefined && !isCategorySign(signType)) {
    return { error: "Category sign type must be income, expense, or both" };
  }

  try {
    const updated = await db
      .update(categories)
      .set({
        name: name.trim(),
        ...(signType !== undefined && { signType }),
      })
      .where(eq(categories.id, id))
      .returning();

    revalidatePath("/");
    return { data: updated[0] };
  } catch (error) {
    console.error("Failed to update category:", error);
    return { error: "Failed to update category" };
  }
}

export async function deleteCategory(id: string) {
  if (!id) {
    return { error: "Category ID is required" };
  }

  try {
    const deleted = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();
    revalidatePath("/");
    return { data: deleted[0] };
  } catch (error) {
    console.error("Failed to delete category:", error);
    return {
      error: "Failed to delete category. It might be used in mappings.",
    };
  }
}
