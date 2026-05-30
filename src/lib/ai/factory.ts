import { AiProvider } from "./types";
import { GeminiProvider } from "./providers/gemini";
import { SwiftRouterProvider } from "./providers/swiftrouter";
import { getAiSettings } from "@/actions/ai-settings";

let providerInstance: AiProvider | null = null;
let currentProviderName: string | null = null;

export async function getAiProvider(overrideConfig?: { provider: string; activeModel: string }): Promise<AiProvider> {
  const settings = overrideConfig || await getAiSettings();

  if (overrideConfig) {
    // Return a one-off instance bypassing cache if overridden
    return createProviderInstance(settings.provider, settings.activeModel);
  }

  // If the provider has changed or instance is not initialized, create a new one
  if (!providerInstance || currentProviderName !== settings.provider) {
    currentProviderName = settings.provider;
    providerInstance = createProviderInstance(settings.provider, settings.activeModel);
  }
  
  return providerInstance;
}

function createProviderInstance(providerName: string, activeModel: string): AiProvider {
  switch (providerName.toLowerCase()) {
      case "gemini":
        return new GeminiProvider(
          process.env.GEMINI_API_KEY || "", 
          activeModel || process.env.GEMINI_MODELS?.split(",")[0] || "gemini-2.5-flash"
        );
      case "swiftrouter":
        return new SwiftRouterProvider(
          process.env.SWIFTROUTER_API_KEY || "", 
          activeModel || process.env.SWIFTROUTER_MODELS?.split(",")[0] || "google/gemini-2.5-flash"
        );
      default:
        console.warn(`Unknown AI_PROVIDER "${providerName}", falling back to gemini.`);
        return new GeminiProvider(
          process.env.GEMINI_API_KEY || "", 
          activeModel || process.env.GEMINI_MODELS?.split(",")[0] || "gemini-2.5-flash"
        );
    }
}
