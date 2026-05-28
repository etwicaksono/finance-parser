"use server";

import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAccounts() {
  try {
    const allAccounts = await db.select().from(accounts);
    return { data: allAccounts };
  } catch (error) {
    console.error("Failed to fetch accounts:", error);
    return { error: "Failed to fetch accounts" };
  }
}

export async function addAccount(name: string) {
  if (!name || name.trim() === "") {
    return { error: "Account name is required" };
  }

  try {
    const inserted = await db.insert(accounts).values({ name: name.trim() }).returning();
    revalidatePath("/");
    return { data: inserted[0] };
  } catch (error) {
    console.error("Failed to add account:", error);
    return { error: "Failed to add account" };
  }
}

export async function updateAccount(id: string, name: string) {
  if (!id || !name || name.trim() === "") {
    return { error: "Account ID and name are required" };
  }

  try {
    const updated = await db
      .update(accounts)
      .set({ name: name.trim() })
      .where(eq(accounts.id, id))
      .returning();
      
    revalidatePath("/");
    return { data: updated[0] };
  } catch (error) {
    console.error("Failed to update account:", error);
    return { error: "Failed to update account" };
  }
}

export async function deleteAccount(id: string) {
  if (!id) {
    return { error: "Account ID is required" };
  }

  try {
    const deleted = await db.delete(accounts).where(eq(accounts.id, id)).returning();
    revalidatePath("/");
    return { data: deleted[0] };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { error: "Failed to delete account." };
  }
}
