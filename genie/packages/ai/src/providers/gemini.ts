import { GoogleGenAI } from "@google/genai";
import type {
  GenerateStructuredRequest,
  GenerateStructuredResult,
  GenerateTextRequest,
  GenerateTextResult,
  Provider,
} from "../provider.js";

const DEFAULT_MAX_TOKENS = 4096;

/**
 * Gemini provider. Structured output uses `responseMimeType: application/json` plus a
 * `responseSchema`, so the model emits JSON conforming to the requested shape.
 */
export class GeminiProvider implements Provider {
  readonly name = "gemini";
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("GeminiProvider requires GEMINI_API_KEY");
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateText(req: GenerateTextRequest): Promise<GenerateTextResult> {
    const res = await this.client.models.generateContent({
      model: req.model,
      contents: req.prompt,
      config: {
        systemInstruction: req.system,
        maxOutputTokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: req.temperature,
      },
    });
    return { text: res.text ?? "", usage: usageOf(res) };
  }

  async generateStructured(req: GenerateStructuredRequest): Promise<GenerateStructuredResult> {
    const res = await this.client.models.generateContent({
      model: req.model,
      contents: req.prompt,
      config: {
        systemInstruction: req.system,
        maxOutputTokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: req.temperature,
        responseMimeType: "application/json",
        // Gemini accepts JSON-Schema-shaped objects here.
        responseSchema: req.jsonSchema as object,
      },
    });
    const text = res.text ?? "";
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (err) {
      throw new Error(
        `Gemini returned non-JSON for "${req.schemaName}": ${(err as Error).message}\n${text.slice(0, 500)}`,
      );
    }
    return { value, usage: usageOf(res) };
  }
}

function usageOf(res: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }) {
  return {
    inputTokens: res.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
  };
}
