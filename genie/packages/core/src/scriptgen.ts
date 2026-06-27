import { ScriptGenSchema, type AIService, type RoutingContext } from "@genie/ai";
import type { TaskKind } from "@genie/config";
import { buildScriptGenPrompt, SCRIPTGEN_SYSTEM, type ScriptGenInput } from "./prompts.js";

/**
 * Generate (or, when `previousError` is set, repair) a Playwright script for one flow.
 * Healing uses the `heal` task tier so retries can route to a stronger model if configured.
 */
export async function generateScript(
  ai: AIService,
  input: ScriptGenInput,
  routing: RoutingContext = {},
): Promise<string> {
  const task: TaskKind = input.previousError ? "heal" : "script_gen";
  const { script } = await ai.generateStructured(
    task,
    {
      schema: ScriptGenSchema,
      schemaName: "playwright_script",
      system: SCRIPTGEN_SYSTEM,
      prompt: buildScriptGenPrompt(input),
      temperature: 0.2,
      maxTokens: 6000,
    },
    routing,
  );
  return script;
}
