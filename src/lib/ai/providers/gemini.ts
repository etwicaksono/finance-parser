import { GoogleGenerativeAI } from "@google/generative-ai";
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

export class GeminiProvider implements AiProvider {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    this.modelName = modelName;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Please add it to your settings or .env file.\n" +
          "Get a free key from: https://aistudio.google.com/app/apikey"
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async ping(): Promise<void> {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    await model.generateContent("ping");
  }

  async classifyTransaction(item: string): Promise<AiClassificationResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: CATEGORIZATION_SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const result = await model.generateContent(item);
    const text = result.response.text();

    try {
      return JSON.parse(text) as AiClassificationResult;
    } catch {
      throw new Error(`AI returned invalid JSON for item "${item}": ${text}`);
    }
  }

  async scanReceiptImage(base64: string, mimeType: string, translateNames: boolean = false): Promise<ReceiptItem[]> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const result = await model.generateContent([
      getReceiptScanPrompt(translateNames),
      {
        inlineData: { mimeType, data: base64 },
      },
    ]);

    const text = result.response.text().trim();
    return JSON.parse(text) as ReceiptItem[];
  }
}
