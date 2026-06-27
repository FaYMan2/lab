import type { ProviderName } from "@genie/config";
import type { TokenUsage } from "./provider.js";

/** USD per 1M tokens. Kept here as a rough estimate for the admin usage view; not billing. */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-8": { input: 15, output: 75 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
};

export function estimateCostUsd(model: string, usage: TokenUsage): number {
  const price = PRICES[model];
  if (!price) return 0;
  return (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000;
}

/** Accumulates usage across the many AI calls in a single demo run. */
export class UsageMeter {
  private rows: Array<{ provider: ProviderName; model: string; usage: TokenUsage; costUsd: number }> = [];

  add(provider: ProviderName, model: string, usage: TokenUsage): void {
    this.rows.push({ provider, model, usage, costUsd: estimateCostUsd(model, usage) });
  }

  summary() {
    const totalCostUsd = this.rows.reduce((a, r) => a + r.costUsd, 0);
    const inputTokens = this.rows.reduce((a, r) => a + r.usage.inputTokens, 0);
    const outputTokens = this.rows.reduce((a, r) => a + r.usage.outputTokens, 0);
    return { totalCostUsd, inputTokens, outputTokens, calls: this.rows.length, rows: this.rows };
  }
}
