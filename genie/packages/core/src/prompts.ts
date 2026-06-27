import type { ChangeContext } from "./context.js";

export const TRIAGE_SYSTEM = `You are Genie's triage step. Decide whether a pull request changes a
USER-VISIBLE FLOW that would be worth showing in a short demo video.

Demoable (demoable = true): changes a user can SEE or DO in the running app — a button now
redirects somewhere, a new form/page/modal, changed validation, a new visible feature,
altered navigation, a restyled screen with behavioural impact.

NOT demoable (demoable = false): pure backend/infra/tooling with no visible behaviour —
adding Redis, dependency bumps, refactors, CI/build config, tests, docs, types, logging.

When demoable, extract one or a few concrete flows. Each flow needs a start URL path
(entrypoint), and ordered plain-English steps a person would take to exercise the change.
Prefer the single most representative flow over many marginal ones. Be conservative: if
nothing is visibly different, say demoable = false.`;

export function buildTriagePrompt(ctx: ChangeContext): string {
  const issues = ctx.linkedIssues
    .map(
      (i) =>
        `Issue #${i.number}: ${i.title}\n${i.body}\n${i.comments.slice(0, 10).join("\n")}`,
    )
    .join("\n\n---\n\n");

  return [
    `PR #${ctx.pr.number}: ${ctx.title}`,
    ``,
    `Description:\n${ctx.body || "(none)"}`,
    ``,
    `Changed files (${ctx.changedFiles.length}):\n${ctx.changedFiles.join("\n")}`,
    ``,
    ctx.comments.length ? `PR conversation:\n${ctx.comments.join("\n")}\n` : "",
    issues ? `Linked issues:\n${issues}\n` : "",
    `Diff:\n${ctx.diff}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const SCRIPTGEN_SYSTEM = `You are Genie's script-generation step. Write a single, self-contained
Playwright test (TypeScript, using \`@playwright/test\`) that demonstrates ONE user flow in a
running web app, for recording into a demo video.

Rules:
- Export a single test via \`import { test, expect } from '@playwright/test'\`.
- Assume the app is already running; navigate using the provided base URL + entrypoint.
- Drive the UI the way a user would. Prefer role/text/label selectors (getByRole, getByText,
  getByLabel, getByPlaceholder) over brittle CSS. Use the provided DOM snapshot to pick real,
  present selectors — never invent ids that aren't in the snapshot.
- Move at a watchable pace: add short \`await page.waitForTimeout(700)\` pauses between steps so
  the recording is legible. Wait for navigations/elements explicitly.
- Add 1–3 light \`expect\` assertions on the visible outcome of the change.
- No external network calls, no test runner config, no comments-as-narration bloat. Just the test.
Return only the script in the \`script\` field.`;

export interface ScriptGenInput {
  baseUrl: string;
  entrypoint: string;
  flowName: string;
  flowDescription: string;
  steps: string[];
  /** Trimmed accessibility/DOM snapshot of the entrypoint page. */
  domSnapshot: string;
  /** When healing, the previous script + the error it produced. */
  previousScript?: string;
  previousError?: string;
}

export function buildScriptGenPrompt(input: ScriptGenInput): string {
  const heal = input.previousError
    ? [
        ``,
        `The previous script FAILED. Fix it. Error:`,
        "```\n" + input.previousError.trim() + "\n```",
        `Previous script:`,
        "```ts\n" + (input.previousScript ?? "") + "\n```",
      ].join("\n")
    : "";

  return [
    `Base URL: ${input.baseUrl}`,
    `Entrypoint: ${input.entrypoint}`,
    `Flow: ${input.flowName} — ${input.flowDescription}`,
    `Steps:\n${input.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    ``,
    `DOM snapshot of the entrypoint page:`,
    "```\n" + input.domSnapshot.slice(0, 12_000) + "\n```",
    heal,
  ].join("\n");
}
