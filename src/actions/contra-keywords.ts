"use server";

import { db } from "@/db";
import { contraKeywords } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getContraKeywords() {
  try {
    const data = await db.select().from(contraKeywords).orderBy(contraKeywords.keyword);
    return { data };
  } catch (error: any) {
    console.error("Error fetching contra keywords:", error);
    return { error: error.message };
  }
}

export async function addContraKeyword(keyword: string) {
  try {
    const kw = keyword.toLowerCase().trim();
    if (!kw) return { error: "Keyword cannot be empty" };

    const [data] = await db
      .insert(contraKeywords)
      .values({ keyword: kw })
      .onConflictDoNothing()
      .returning();

    revalidatePath("/settings");
    return { data };
  } catch (error: any) {
    console.error("Error adding contra keyword:", error);
    return { error: error.message };
  }
}

export async function deleteContraKeyword(id: string) {
  try {
    await db.delete(contraKeywords).where(eq(contraKeywords.id, id));
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting contra keyword:", error);
    return { error: error.message };
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
  } catch (error: any) {
    console.error("Error seeding contra keywords:", error);
    return { error: error.message };
  }
}
