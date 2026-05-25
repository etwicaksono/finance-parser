"use server";

import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getAccounts() {
  try {
    const allAccounts = await db.select().from(accounts).all();
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
    const inserted = await db.insert(accounts).values({ name: name.trim() }).returning().get();
    revalidatePath("/");
    return { data: inserted };
  } catch (error) {
    console.error("Failed to add account:", error);
    return { error: "Failed to add account" };
  }
}

export async function deleteAccount(id: string) {
  if (!id) {
    return { error: "Account ID is required" };
  }

  try {
    const deleted = await db.delete(accounts).where(eq(accounts.id, id)).returning().get();
    revalidatePath("/");
    return { data: deleted };
  } catch (error) {
    console.error("Failed to delete account:", error);
    return { error: "Failed to delete account." };
  }
}
