import { z } from "zod";
import { TASK_KINDS, type TaskKind } from "./tasks.js";

/**
 * Central, validated view of process.env. Importing this anywhere guarantees the
 * required vars exist and are well-typed; a missing/invalid var fails at boot.
 */
const EnvSchema = z.object({
  // GitHub App
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY_PATH: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_CLIENT_ID: z.string().optional(),
  GITHUB_APP_CLIENT_SECRET: z.string().optional(),

  // AI providers
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // Default model routing (provider:model)
  GENIE_MODEL_TRIAGE: z.string().default("anthropic:claude-haiku-4-5"),
  GENIE_MODEL_SCRIPT_GEN: z.string().default("anthropic:claude-sonnet-4-6"),
  GENIE_MODEL_SUMMARIZE: z.string().default("anthropic:claude-haiku-4-5"),
  GENIE_MODEL_HEAL: z.string().default("anthropic:claude-sonnet-4-6"),

  // Infra
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Media
  GENIE_MEDIA_BACKEND: z.enum(["release", "s3"]).default("release"),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),

  // Server
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default("info"),
  GENIE_MAX_HEAL_ATTEMPTS: z.coerce.number().default(3),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (!cached) cached = EnvSchema.parse(source);
  return cached;
}

/** The default `TaskKind -> "provider:model"` map, read from env. */
export function defaultModelRouting(env: Env = loadEnv()): Record<TaskKind, string> {
  const map = {
    triage: env.GENIE_MODEL_TRIAGE,
    script_gen: env.GENIE_MODEL_SCRIPT_GEN,
    summarize: env.GENIE_MODEL_SUMMARIZE,
    heal: env.GENIE_MODEL_HEAL,
  } satisfies Record<TaskKind, string>;
  // Defensive: ensure every task kind is covered if TASK_KINDS grows.
  for (const k of TASK_KINDS) {
    if (!(k in map)) throw new Error(`No default model configured for task "${k}"`);
  }
  return map;
}
