import Anthropic from "@anthropic-ai/sdk";
import type {
  GenerateStructuredRequest,
  GenerateStructuredResult,
  GenerateTextRequest,
  GenerateTextResult,
  Provider,
} from "../provider.js";

const DEFAULT_MAX_TOKENS = 4096;

/**
 * Claude provider. Structured output is implemented with forced tool-use: we expose a
 * single tool whose `input_schema` is the requested JSON Schema and force the model to
 * call it, so the returned `input` is guaranteed to match the schema's shape.
 */
export class AnthropicProvider implements Provider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("AnthropicProvider requires ANTHROPIC_API_KEY");
    this.client = new Anthropic({ apiKey });
  }

  async generateText(req: GenerateTextRequest): Promise<GenerateTextResult> {
    const res = await this.client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: req.temperature,
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return { text, usage: usageOf(res) };
  }

  async generateStructured(req: GenerateStructuredRequest): Promise<GenerateStructuredResult> {
    const res = await this.client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: req.temperature,
      system: req.system,
      tools: [
        {
          name: req.schemaName,
          description: `Return the result as structured ${req.schemaName} data.`,
          input_schema: req.jsonSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: req.schemaName },
      messages: [{ role: "user", content: req.prompt }],
    });

    const toolUse = res.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) {
      throw new Error(`Anthropic returned no tool_use block for "${req.schemaName}"`);
    }
    return { value: toolUse.input, usage: usageOf(res) };
  }
}

function usageOf(res: Anthropic.Message) {
  return {
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  };
}
