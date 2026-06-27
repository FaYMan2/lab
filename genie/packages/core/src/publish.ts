import type { Octokit } from "octokit";
import {
  renderComment,
  renderIssueDemo,
  upsertStickyComment,
  upsertCheck,
  type DemoCommentModel,
} from "@genie/github";
import type { PullRequestRef } from "@genie/config";

/** Map a run status to a Checks API conclusion for the terminal states. */
function checkFor(model: DemoCommentModel): {
  status: "in_progress" | "completed";
  conclusion?: "success" | "neutral" | "failure";
  title: string;
} {
  switch (model.status) {
    case "posted":
      return { status: "completed", conclusion: "success", title: "Demo posted" };
    case "skipped":
      return { status: "completed", conclusion: "neutral", title: "No demoable change" };
    case "failed":
      return { status: "completed", conclusion: "neutral", title: "Demo failed" };
    default:
      return { status: "in_progress", title: "Recording demo…" };
  }
}

/** Update Genie's single PR comment and the commit check to reflect the current state. */
export async function publishProgress(
  octokit: Octokit,
  pr: PullRequestRef,
  model: DemoCommentModel,
): Promise<void> {
  await upsertStickyComment(
    octokit,
    { owner: pr.owner, repo: pr.repo, issue_number: pr.number },
    renderComment(model),
  );

  const check = checkFor(model);
  await upsertCheck(octokit, {
    owner: pr.owner,
    repo: pr.repo,
    headSha: model.headSha ?? pr.headSha,
    status: check.status,
    conclusion: check.conclusion,
    title: check.title,
    summary: model.reasoning ?? model.detail ?? check.title,
  }).catch(() => {
    /* checks permission may be absent on some installs; non-fatal */
  });
}

/** Mirror a finished demo into each linked issue so stakeholders see it there too. */
export async function publishToIssues(
  octokit: Octokit,
  pr: PullRequestRef,
  issueNumbers: number[],
  model: DemoCommentModel,
): Promise<void> {
  const body = renderIssueDemo(model, pr.number);
  for (const issue_number of issueNumbers) {
    await upsertStickyComment(octokit, { owner: pr.owner, repo: pr.repo, issue_number }, body).catch(
      () => {},
    );
  }
}
