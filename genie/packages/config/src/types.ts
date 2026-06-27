/** Shared domain types used across packages (kept SDK-free on purpose). */

/** Lifecycle of a single demo job, surfaced in the sticky comment + admin panel. */
export type RunStatus =
  | "queued"
  | "gathering"
  | "triaging"
  | "skipped"
  | "booting"
  | "recording"
  | "publishing"
  | "posted"
  | "failed";

/** A user-visible flow the triage step extracted from a PR. */
export interface DemoFlow {
  /** Short, human label, e.g. "Sign-up redirects to dashboard". */
  name: string;
  /** What changed and what the demo should show. */
  description: string;
  /** Where the flow starts, relative to baseUrl, e.g. "/signup". */
  entrypoint: string;
  /** Ordered, plain-English steps a human would take. */
  steps: string[];
}

/** Output of the triage task. */
export interface TriageResult {
  demoable: boolean;
  flows: DemoFlow[];
  /** One or two sentences on the verdict — shown in the skip notice. */
  reasoning: string;
}

/** Identifies a pull request across the system. */
export interface PullRequestRef {
  owner: string;
  repo: string;
  number: number;
  /** Head SHA the demo was recorded against. */
  headSha: string;
}
