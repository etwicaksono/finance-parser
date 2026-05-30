"use server";

import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "finance_parser_session";

export async function login(password: string) {
  const expectedPassword = process.env.APP_PASSWORD;
  
  if (!expectedPassword) {
    return { error: "Sistem belum dikonfigurasi (APP_PASSWORD kosong)" };
  }
  
  if (password !== expectedPassword) {
    return { error: "Kata sandi salah" };
  }
  
  const authSecret = process.env.AUTH_SECRET || "default_unsafe_secret";
  
  // Create a simple token
  const token = Buffer.from(`${authSecret}:${new Date().getTime()}`).toString('base64');
  
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });
  
  return { success: true };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return { success: true };
}

export async function checkAuth() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  return !!sessionCookie;
}
