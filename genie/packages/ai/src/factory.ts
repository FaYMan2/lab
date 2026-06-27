import {
  defaultModelRouting,
  loadEnv,
  type Env,
  type ProviderName,
} from "@genie/config";
import type { Provider } from "./provider.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { GeminiProvider } from "./providers/gemini.js";
import { ModelRouter, type RoutingOverrideStore } from "./router.js";
import { AIService } from "./service.js";

/**
 * Build the provider registry from whatever API keys are present. A provider is only
 * registered if its key exists, so an install with just `ANTHROPIC_API_KEY` works, and
 * routing to an unconfigured provider fails with a clear message (see AIService).
 */
export function buildProviderRegistry(env: Env = loadEnv()): Map<ProviderName, Provider> {
  const registry = new Map<ProviderName, Provider>();
  if (env.ANTHROPIC_API_KEY) registry.set("anthropic", new AnthropicProvider(env.ANTHROPIC_API_KEY));
  if (env.GEMINI_API_KEY) registry.set("gemini", new GeminiProvider(env.GEMINI_API_KEY));
  if (registry.size === 0) {
    throw new Error("No AI provider configured — set ANTHROPIC_API_KEY and/or GEMINI_API_KEY");
  }
  return registry;
}

/**
 * Convenience constructor used by the worker. Pass a {@link RoutingOverrideStore} (DB-backed)
 * to honour admin-panel overrides; omit it to use env defaults only.
 */
export function createAIService(opts: { store?: RoutingOverrideStore; env?: Env } = {}): AIService {
  const env = opts.env ?? loadEnv();
  const registry = buildProviderRegistry(env);
  const router = new ModelRouter(defaultModelRouting(env), opts.store);
  return new AIService(registry, router);
}
