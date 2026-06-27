import type { ProviderName, TaskKind } from "@genie/config";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { Provider } from "./provider.js";
import { ModelRouter, type RoutingContext } from "./router.js";
import { UsageMeter } from "./cost.js";

export interface StructuredCall<T extends z.ZodTypeAny> {
  schema: T;
  /** Stable name for the schema (tool name for Anthropic). Defaults to the task kind. */
  schemaName?: string;
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface TextCall {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * The single AI entrypoint for all business logic. Callers name a {@link TaskKind} and
 * pass a Zod schema; the service resolves the model via the {@link ModelRouter}, dispatches
 * to the right {@link Provider}, validates the result, and records token usage. No business
 * code ever touches a vendor SDK.
 */
export class AIService {
  constructor(
    private readonly providers: Map<ProviderName, Provider>,
    private readonly router: ModelRouter,
    private readonly usage = new UsageMeter(),
  ) {}

  /** Usage accumulated across every call made through this instance. */
  get usageSummary() {
    return this.usage.summary();
  }

  async generateStructured<T extends z.ZodTypeAny>(
    task: TaskKind,
    call: StructuredCall<T>,
    ctx: RoutingContext = {},
  ): Promise<z.infer<T>> {
    const ref = await this.router.resolve(task, ctx);
    const provider = this.providerFor(ref.provider);
    const jsonSchema = zodToJsonSchema(call.schema, { target: "openApi3" }) as Record<string, unknown>;

    const res = await provider.generateStructured({
      model: ref.model,
      system: call.system,
      prompt: call.prompt,
      maxTokens: call.maxTokens,
      temperature: call.temperature,
      jsonSchema,
      schemaName: call.schemaName ?? task,
    });

    this.usage.add(ref.provider, ref.model, res.usage);
    // Final guarantee: the parsed value really matches the caller's schema.
    return call.schema.parse(res.value);
  }

  async generateText(task: TaskKind, call: TextCall, ctx: RoutingContext = {}): Promise<string> {
    const ref = await this.router.resolve(task, ctx);
    const provider = this.providerFor(ref.provider);
    const res = await provider.generateText({
      model: ref.model,
      system: call.system,
      prompt: call.prompt,
      maxTokens: call.maxTokens,
      temperature: call.temperature,
    });
    this.usage.add(ref.provider, ref.model, res.usage);
    return res.text;
  }

  private providerFor(name: ProviderName): Provider {
    const p = this.providers.get(name);
    if (!p) {
      throw new Error(
        `Provider "${name}" is selected but not configured — set its API key (e.g. ${name.toUpperCase()}_API_KEY).`,
      );
    }
    return p;
  }
}
