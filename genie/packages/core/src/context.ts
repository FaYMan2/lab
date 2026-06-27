import type { Octokit } from "octokit";
import type { PullRequestRef } from "@genie/config";

/** Everything the triage + scriptgen steps reason over. Kept plain so it's easy to test. */
export interface ChangeContext {
  pr: PullRequestRef;
  title: string;
  body: string;
  /** Unified diff, truncated to a sane size for the model. */
  diff: string;
  changedFiles: string[];
  comments: string[];
  linkedIssues: LinkedIssue[];
}

export interface LinkedIssue {
  number: number;
  title: string;
  body: string;
  comments: string[];
}

const MAX_DIFF_BYTES = 60_000;
const CLOSING_KEYWORDS = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;

/** Pull the issue numbers a PR body says it closes (Closes #12, Fixes #3, …). */
export function parseLinkedIssueNumbers(body: string): number[] {
  const found = new Set<number>();
  for (const m of body.matchAll(CLOSING_KEYWORDS)) {
    if (m[1]) found.add(Number(m[1]));
  }
  return [...found];
}

/**
 * Gather the full picture of a PR: metadata, diff, changed files, conversation, and every
 * issue it links to (with their comments). This is the model's evidence for triage.
 */
export async function gatherContext(octokit: Octokit, pr: PullRequestRef): Promise<ChangeContext> {
  const { owner, repo, number } = pr;

  const { data: prData } = await octokit.rest.pulls.get({ owner, repo, pull_number: number });

  // The diff comes back as text via the `diff` media type.
  const diffRes = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: number,
    mediaType: { format: "diff" },
  });
  const diff = truncate(diffRes.data as unknown as string, MAX_DIFF_BYTES);

  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: number,
    per_page: 100,
  });
  const changedFiles = files.map((f) => f.filename);

  const prComments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: number,
    per_page: 100,
  });
  const comments = prComments
    .filter((c) => !c.body?.includes("genie:pr-comment")) // ignore Genie's own comment
    .map((c) => `${c.user?.login ?? "?"}: ${c.body ?? ""}`);

  const body = prData.body ?? "";
  const linkedIssues = await gatherLinkedIssues(octokit, owner, repo, parseLinkedIssueNumbers(body));

  return {
    pr: { ...pr, headSha: prData.head.sha },
    title: prData.title,
    body,
    diff,
    changedFiles,
    comments,
    linkedIssues,
  };
}

async function gatherLinkedIssues(
  octokit: Octokit,
  owner: string,
  repo: string,
  numbers: number[],
): Promise<LinkedIssue[]> {
  const issues: LinkedIssue[] = [];
  for (const n of numbers) {
    try {
      const { data: issue } = await octokit.rest.issues.get({ owner, repo, issue_number: n });
      const comments = await octokit.paginate(octokit.rest.issues.listComments, {
        owner,
        repo,
        issue_number: n,
        per_page: 100,
      });
      issues.push({
        number: n,
        title: issue.title,
        body: issue.body ?? "",
        comments: comments.map((c) => `${c.user?.login ?? "?"}: ${c.body ?? ""}`),
      });
    } catch {
      // Issue might be in another repo or inaccessible — skip rather than fail the run.
    }
  }
  return issues;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n… (diff truncated at ${max} bytes)`;
}
