/**
 * The provider boundary. Everything below this interface is LLM-vendor-specific;
 * everything above it (the {@link AIService}, all of `@genie/core`) is not. To add a
 * provider, implement this interface and register it — no business logic changes.
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateTextRequest {
  model: string;
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateStructuredRequest extends GenerateTextRequest {
  /**
   * JSON Schema describing the required shape of the output. Providers enforce this
   * natively (Anthropic tool-use, Gemini responseSchema) so the model can't drift.
   */
  jsonSchema: Record<string, unknown>;
  /** A short name for the schema, used as the tool name where the provider needs one. */
  schemaName: string;
}

export interface GenerateTextResult {
  text: string;
  usage: TokenUsage;
}

export interface GenerateStructuredResult {
  /** Parsed JSON object conforming to the requested schema. Caller validates with Zod. */
  value: unknown;
  usage: TokenUsage;
}

export interface Provider {
  readonly name: string;
  generateText(req: GenerateTextRequest): Promise<GenerateTextResult>;
  generateStructured(req: GenerateStructuredRequest): Promise<GenerateStructuredResult>;
}
