import type { Octokit } from "octokit";
import { STICKY_MARKER } from "./render.js";

export interface IssueTarget {
  owner: string;
  repo: string;
  /** Issue or PR number (GitHub treats PRs as issues for comments). */
  issue_number: number;
}

/**
 * Post-or-update a single marker-tagged comment, so Genie keeps exactly one comment per
 * PR (and per linked issue) instead of spamming on every event — the CodeRabbit/Greptile
 * behaviour. Finds an existing Genie comment by {@link STICKY_MARKER} and edits it in place.
 */
export async function upsertStickyComment(
  octokit: Octokit,
  target: IssueTarget,
  body: string,
): Promise<{ id: number; updated: boolean }> {
  const existing = await findStickyComment(octokit, target);
  if (existing) {
    await octokit.rest.issues.updateComment({
      owner: target.owner,
      repo: target.repo,
      comment_id: existing,
      body,
    });
    return { id: existing, updated: true };
  }
  const created = await octokit.rest.issues.createComment({
    owner: target.owner,
    repo: target.repo,
    issue_number: target.issue_number,
    body,
  });
  return { id: created.data.id, updated: false };
}

async function findStickyComment(
  octokit: Octokit,
  target: IssueTarget,
): Promise<number | undefined> {
  for await (const { data } of octokit.paginate.iterator(octokit.rest.issues.listComments, {
    owner: target.owner,
    repo: target.repo,
    issue_number: target.issue_number,
    per_page: 100,
  })) {
    const hit = data.find((c) => c.body?.includes(STICKY_MARKER));
    if (hit) return hit.id;
  }
  return undefined;
}
