import type { DemoFlow, RunStatus } from "@genie/config";

/** Hidden HTML marker used to find-and-update Genie's single comment. */
export const STICKY_MARKER = "<!-- genie:pr-comment -->";

export interface DemoCommentModel {
  status: RunStatus;
  flows?: DemoFlow[];
  /** Verdict text, shown on the skip notice. */
  reasoning?: string;
  gifUrl?: string;
  mp4Url?: string;
  script?: string;
  /** Tail of the recorder log, shown in a collapsible block. */
  log?: string;
  /** Failure reason when status = failed. */
  detail?: string;
  headSha?: string;
  costUsd?: number;
  /** Resolved model names, for transparency in the footer. */
  models?: { triage?: string; scriptGen?: string };
}

const HEADER = "### 🧞 Genie";

const STATUS_LINE: Record<RunStatus, string> = {
  queued: "⏳ Queued…",
  gathering: "⏳ Reading the PR, linked issue and conversations…",
  triaging: "🔍 Deciding whether there's a flow worth demoing…",
  skipped: "💤 No demoable flow change detected.",
  booting: "🚀 Booting your app…",
  recording: "🎬 Recording the flow with Playwright…",
  publishing: "📦 Preparing the demo…",
  posted: "✅ Demo ready.",
  failed: "⚠️ Couldn't record a demo.",
};

function details(summary: string, body: string, open = false): string {
  return `<details${open ? " open" : ""}>\n<summary>${summary}</summary>\n\n${body}\n\n</details>`;
}

function flowsBlock(flows: DemoFlow[]): string {
  return flows
    .map((f, i) => {
      const steps = f.steps.map((s) => `   ${s}`).join("\n");
      return `${i + 1}. **${f.name}** — ${f.description}\n   \`${f.entrypoint}\`\n${steps}`;
    })
    .join("\n\n");
}

function footer(m: DemoCommentModel): string {
  const bits: string[] = [];
  if (m.headSha) bits.push(`\`${m.headSha.slice(0, 7)}\``);
  if (m.models?.triage) bits.push(`triage: ${m.models.triage}`);
  if (m.models?.scriptGen) bits.push(`script: ${m.models.scriptGen}`);
  if (typeof m.costUsd === "number") bits.push(`~$${m.costUsd.toFixed(4)}`);
  const meta = bits.length ? `<sub>${bits.join(" · ")}</sub>\n\n` : "";
  return `${meta}<sub>🧞 Genie records demos for demoable PRs. \`/genie rerun\` to retry · \`/genie skip\` to mute.</sub>`;
}

/** Render the full sticky comment body for the current run state. */
export function renderComment(m: DemoCommentModel): string {
  const parts: string[] = [STICKY_MARKER, HEADER, "", STATUS_LINE[m.status]];

  if (m.status === "skipped") {
    if (m.reasoning) parts.push("", `> ${m.reasoning}`);
    parts.push("", footer(m));
    return parts.join("\n");
  }

  if (m.status === "failed") {
    if (m.detail) parts.push("", "```\n" + m.detail.trim() + "\n```");
    if (m.flows?.length) parts.push("", details("Detected flows", flowsBlock(m.flows)));
    if (m.log) parts.push("", details("Run log", "```\n" + m.log.trim() + "\n```"));
    parts.push("", footer(m));
    return parts.join("\n");
  }

  // posted / in-progress states
  if (m.gifUrl) {
    parts.push("", `![demo](${m.gifUrl})`);
    if (m.mp4Url) parts.push("", `▶️ [Watch full-resolution mp4](${m.mp4Url})`);
  }
  if (m.flows?.length) {
    parts.push("", details("Detected flows", flowsBlock(m.flows), m.status !== "posted"));
  }
  if (m.script) {
    parts.push("", details("Generated Playwright script", "```ts\n" + m.script.trim() + "\n```"));
  }
  if (m.log) {
    parts.push("", details("Run log", "```\n" + m.log.trim() + "\n```"));
  }
  parts.push("", footer(m));
  return parts.join("\n");
}

/** A compact variant for posting the finished demo into the linked issue. */
export function renderIssueDemo(m: DemoCommentModel, prNumber: number): string {
  const lines = [STICKY_MARKER, `### 🧞 Demo for #${prNumber}`, ""];
  if (m.gifUrl) lines.push(`![demo](${m.gifUrl})`);
  if (m.mp4Url) lines.push("", `▶️ [Watch full-resolution mp4](${m.mp4Url})`);
  if (m.flows?.length) lines.push("", details("Flow", flowsBlock(m.flows)));
  return lines.join("\n");
}
