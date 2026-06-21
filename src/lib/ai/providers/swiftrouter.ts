import { AiProvider, ReceiptItem } from "../types";
import { AiClassificationResult, CATEGORIZATION_SYSTEM_PROMPT } from "@/features/categorization/taxonomy";
import PROMPTS from "@/data/ai-prompts.json";

const getReceiptScanPrompt = (translateNames: boolean) => {
  const promptId = translateNames ? "receipt_translate" : "receipt";
  const promptObj = PROMPTS.find((p) => p.id === promptId);
  const rawText = promptObj?.text || "";
  // Strip out the placeholder meant for manual UI
  return rawText.replace("\n\nBerikut datanya:\n[PASTE TEKS / GAMBAR NOTA DI SINI]", "");
};

export class SwiftRouterProvider implements AiProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    this.modelName = modelName;

    if (!apiKey) {
      throw new Error(
        "SWIFTROUTER_API_KEY is not configured. Please add it to your settings or .env file."
      );
    }
    this.apiKey = apiKey;
  }

  async ping(): Promise<void> {
    await this.fetchCompletions([{ role: "user", content: "ping" }]);
  }

  private async fetchCompletions(messages: { role: string; content: string | unknown[] }[]) {
    const response = await fetch("https://api.swiftrouter.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`SwiftRouter API Error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  private stripJsonMarkdown(text: string): string {
    let clean = text.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```/, "").replace(/```$/, "").trim();
    }
    return clean;
  }

  async classifyTransaction(item: string): Promise<AiClassificationResult> {
    const content = await this.fetchCompletions([
      { role: "system", content: CATEGORIZATION_SYSTEM_PROMPT },
      { role: "user", content: item }
    ]);

    try {
      return JSON.parse(this.stripJsonMarkdown(content)) as AiClassificationResult;
    } catch {
      throw new Error(`AI returned invalid JSON for item "${item}": ${content}`);
    }
  }

  async scanReceiptImage(base64: string, mimeType: string, translateNames: boolean = false): Promise<ReceiptItem[]> {
    const content = await this.fetchCompletions([
      {
        role: "user",
        content: [
          { type: "text", text: getReceiptScanPrompt(translateNames) },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }
        ]
      }
    ]);

    try {
      return JSON.parse(this.stripJsonMarkdown(content)) as ReceiptItem[];
    } catch {
      throw new Error(`AI returned invalid JSON for receipt image: ${content}`);
    }
  }
}
