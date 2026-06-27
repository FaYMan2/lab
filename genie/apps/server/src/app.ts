import type { Probot } from "probot";
import { createDemoQueue, demoJobId, type DemoJob } from "@genie/queue";

const queue = createDemoQueue();

/** Slash commands Genie understands in PR/issue comments. */
const COMMAND = /^\/genie\s+(rerun|skip|demo)\b/im;

/**
 * The Probot app: translate GitHub webhooks into demo jobs. All heavy lifting happens in
 * the worker — the webhook handler only validates, de-dupes, and enqueues, so it returns fast.
 */
export function genieApp(app: Probot): void {
  app.on(["pull_request.opened", "pull_request.reopened", "pull_request.synchronize"], async (ctx) => {
    const pr = ctx.payload.pull_request;
    if (pr.draft) return; // skip drafts; they'll fire again on ready_for_review
    await enqueue(ctx, {
      installationId: ctx.payload.installation!.id,
      owner: ctx.payload.repository.owner.login,
      repo: ctx.payload.repository.name,
      prNumber: pr.number,
      headSha: pr.head.sha,
      trigger: ctx.payload.action === "synchronize" ? "synchronize" : ctx.payload.action,
    });
  });

  app.on("pull_request.ready_for_review", async (ctx) => {
    const pr = ctx.payload.pull_request;
    await enqueue(ctx, {
      installationId: ctx.payload.installation!.id,
      owner: ctx.payload.repository.owner.login,
      repo: ctx.payload.repository.name,
      prNumber: pr.number,
      headSha: pr.head.sha,
      trigger: "opened",
    });
  });

  // Slash commands on a PR (issue_comment fires for PRs too).
  app.on("issue_comment.created", async (ctx) => {
    const body = ctx.payload.comment.body ?? "";
    const match = body.match(COMMAND);
    if (!match || !ctx.payload.issue.pull_request) return;
    if (match[1]?.toLowerCase() === "skip") return; // handled as a no-op marker for now

    const pr = await ctx.octokit.rest.pulls.get({
      owner: ctx.payload.repository.owner.login,
      repo: ctx.payload.repository.name,
      pull_number: ctx.payload.issue.number,
    });
    await enqueue(ctx, {
      installationId: ctx.payload.installation!.id,
      owner: ctx.payload.repository.owner.login,
      repo: ctx.payload.repository.name,
      prNumber: pr.data.number,
      headSha: pr.data.head.sha,
      trigger: "command",
    });
  });
}

async function enqueue(ctx: { log: { info: (msg: string) => void } }, job: DemoJob): Promise<void> {
  await queue.add("demo", job, {
    jobId: demoJobId(job), // replaces an in-flight job for the same head SHA
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 1,
  });
  ctx.log.info(`queued demo job ${demoJobId(job)} (${job.trigger})`);
}
