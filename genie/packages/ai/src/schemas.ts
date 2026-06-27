import { z } from "zod";

/** Schema the triage task must return. Mirrors `TriageResult` in @genie/config. */
export const DemoFlowSchema = z.object({
  name: z.string().describe("Short human label, e.g. 'Sign-up redirects to dashboard'"),
  description: z.string().describe("What changed and what the demo should show"),
  entrypoint: z.string().describe("Where the flow starts, relative to the app base URL, e.g. '/signup'"),
  steps: z.array(z.string()).describe("Ordered, plain-English steps a user would take"),
});

export const TriageSchema = z.object({
  demoable: z
    .boolean()
    .describe("True only if the PR changes a user-visible flow worth showing in a video"),
  flows: z.array(DemoFlowSchema).describe("Empty when not demoable"),
  reasoning: z.string().describe("One or two sentences explaining the verdict"),
});

export type TriageSchemaType = z.infer<typeof TriageSchema>;

/** Schema the script-generation task must return. */
export const ScriptGenSchema = z.object({
  script: z
    .string()
    .describe("A complete, self-contained Playwright test module (TypeScript) for the flow"),
  notes: z.string().describe("Brief notes on assumptions or selectors used").optional(),
});

export type ScriptGenSchemaType = z.infer<typeof ScriptGenSchema>;
