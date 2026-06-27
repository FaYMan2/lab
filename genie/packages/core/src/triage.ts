import { TriageSchema, type AIService } from "@genie/ai";
import type { RoutingContext } from "@genie/ai";
import type { TriageResult } from "@genie/config";
import type { ChangeContext } from "./context.js";
import { buildTriagePrompt, TRIAGE_SYSTEM } from "./prompts.js";

/**
 * Decide whether a PR is demoable and extract the flow(s). Runs on the cheap model tier
 * (resolved by the router for the `triage` task).
 */
export async function runTriage(
  ai: AIService,
  ctx: ChangeContext,
  routing: RoutingContext = {},
): Promise<TriageResult> {
  const result = await ai.generateStructured(
    "triage",
    {
      schema: TriageSchema,
      schemaName: "triage_result",
      system: TRIAGE_SYSTEM,
      prompt: buildTriagePrompt(ctx),
      temperature: 0,
    },
    routing,
  );
  // Defensive: a true verdict with no flows is treated as not demoable.
  if (result.demoable && result.flows.length === 0) {
    return { ...result, demoable: false };
  }
  return result;
}
