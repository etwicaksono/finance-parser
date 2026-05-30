"use server";

import { cookies } from "next/headers";

export type AiProviderType = "gemini" | "swiftrouter";

export interface AiSettingsConfig {
  provider: AiProviderType;
  activeModel: string;
}

const COOKIE_NAME = "finance_parser_ai_settings";

export async function getAiSettings(): Promise<AiSettingsConfig> {
  const cookieStore = await cookies();
  const savedSettings = cookieStore.get(COOKIE_NAME);

  if (savedSettings?.value) {
    try {
      const parsed = JSON.parse(savedSettings.value) as Partial<AiSettingsConfig>;
      if (parsed.provider && parsed.activeModel) {
        return {
          provider: parsed.provider,
          activeModel: parsed.activeModel,
        };
      }
    } catch {
      // fallback to env if cookie is malformed
    }
  }

  // Determine default model based on provider
  const defaultProvider = (process.env.AI_PROVIDER as AiProviderType) || "gemini";
  let defaultModel = "gemini-2.5-flash";
  
  if (defaultProvider === "gemini") {
    defaultModel = process.env.GEMINI_MODELS?.split(",")[0] || "gemini-2.5-flash";
  } else if (defaultProvider === "swiftrouter") {
    defaultModel = process.env.SWIFTROUTER_MODELS?.split(",")[0] || "google/gemini-2.5-flash";
  }

  return {
    provider: defaultProvider,
    activeModel: defaultModel,
  };
}

export async function saveAiSettings(settings: AiSettingsConfig) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(settings), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

