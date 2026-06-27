import type { Octokit } from "octokit";

type CheckState = "queued" | "in_progress" | "completed";
type Conclusion = "success" | "failure" | "neutral" | "skipped";

/**
 * Surface Genie's progress as a Checks API run ("Genie / demo") on the PR head, so the
 * status shows up alongside CI without needing a green/red gate.
 */
export async function upsertCheck(
  octokit: Octokit,
  args: {
    owner: string;
    repo: string;
    headSha: string;
    status: CheckState;
    conclusion?: Conclusion;
    title: string;
    summary: string;
  },
): Promise<void> {
  await octokit.rest.checks.create({
    owner: args.owner,
    repo: args.repo,
    name: "Genie / demo",
    head_sha: args.headSha,
    status: args.status,
    conclusion: args.status === "completed" ? args.conclusion ?? "neutral" : undefined,
    output: { title: args.title, summary: args.summary },
  });
}
