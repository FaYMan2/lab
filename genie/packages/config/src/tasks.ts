/**
 * The discrete AI tasks Genie performs. The {@link ModelRouter} maps each one to a
 * concrete provider + model, so business logic refers to *what* it wants done
 * (a "task") rather than *which* model does it.
 */
export const TASK_KINDS = ["triage", "script_gen", "summarize", "heal"] as const;

export type TaskKind = (typeof TASK_KINDS)[number];

/** The AI providers Genie ships with. Adding one is a new module + a value here. */
export const PROVIDERS = ["anthropic", "gemini"] as const;

export type ProviderName = (typeof PROVIDERS)[number];

/** A fully-resolved model choice, e.g. `{ provider: "anthropic", model: "claude-haiku-4-5" }`. */
export interface ModelRef {
  provider: ProviderName;
  model: string;
}

/**
 * Parse a `"<provider>:<model>"` string (the env/admin wire format) into a {@link ModelRef}.
 * Throws on an unknown provider so a typo fails fast at startup rather than mid-pipeline.
 */
export function parseModelRef(value: string): ModelRef {
  const idx = value.indexOf(":");
  if (idx === -1) {
    throw new Error(`Invalid model ref "${value}" — expected "<provider>:<model>"`);
  }
  const provider = value.slice(0, idx).trim();
  const model = value.slice(idx + 1).trim();
  if (!PROVIDERS.includes(provider as ProviderName)) {
    throw new Error(`Unknown provider "${provider}" in "${value}" — one of ${PROVIDERS.join(", ")}`);
  }
  if (!model) {
    throw new Error(`Missing model name in "${value}"`);
  }
  return { provider: provider as ProviderName, model };
}

export function formatModelRef(ref: ModelRef): string {
  return `${ref.provider}:${ref.model}`;
}
