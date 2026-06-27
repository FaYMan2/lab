import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Worker } from "bullmq";
import { createAIService } from "@genie/ai";
import { defaultModelRouting, loadEnv, parseModelRef, type PullRequestRef } from "@genie/config";
import {
  runDemoPipeline,
  publishProgress,
  publishToIssues,
  gatherContext,
  linkedIssuesOf,
} from "@genie/core";
import { installationOctokit } from "@genie/github";
import { DEMO_QUEUE, createRedis, type DemoJob } from "@genie/queue";
import { checkoutPrHead } from "./checkout.js";
import { createUploader } from "./uploader.js";
import { DbRoutingStore } from "./routingStore.js";
import { ensureRepo, recordRun } from "./persist.js";

const env = loadEnv();
const connection = createRedis();
const routing = defaultModelRouting(env);

const modelNames = {
  triage: parseModelRef(routing.triage).model,
  scriptGen: parseModelRef(routing.script_gen).model,
};

const worker = new Worker<DemoJob>(
  DEMO_QUEUE,
  async (job) => {
    const data = job.data;
    const octokit = installationOctokit(data.installationId, env);
    const pr: PullRequestRef = {
      owner: data.owner,
      repo: data.repo,
      number: data.prNumber,
      headSha: data.headSha,
    };

    // A fresh, per-job AIService so usage/cost is scoped to this run; DB-backed routing
    // honours any admin-panel overrides for this repo.
    const repoId = await ensureRepo(data).catch(() => undefined);
    const ai = createAIService({ store: new DbRoutingStore(), env });
    const uploader = createUploader(octokit, env);
    const workdir = await mkdtemp(join(tmpdir(), "genie-job-"));

    try {
      const model = await runDemoPipeline(pr, {
        octokit,
        ai,
        routing: { installationId: String(data.installationId), repoId },
        checkout: (prRef, dir) => checkoutPrHead(octokit, prRef, dir),
        uploader,
        models: { triage: modelNames.triage, scriptGen: modelNames.scriptGen },
        maxHealAttempts: env.GENIE_MAX_HEAL_ATTEMPTS,
        workdir,
        onProgress: (m) => publishProgress(octokit, pr, m),
      });

      // Mirror a successful demo into linked issues.
      if (model.status === "posted") {
        const ctx = await gatherContext(octokit, pr).catch(() => undefined);
        const issues = ctx ? linkedIssuesOf(ctx.body) : [];
        await publishToIssues(octokit, pr, issues, model);
      }

      if (repoId) await recordRun(repoId, data, model, ai.usageSummary).catch(() => {});
      return model.status;
    } finally {
      await rm(workdir, { recursive: true, force: true }).catch(() => {});
    }
  },
  { connection, concurrency: 2 },
);

worker.on("completed", (job, status) => console.log(`✅ ${job.id} → ${status}`));
worker.on("failed", (job, err) => console.error(`❌ ${job?.id}: ${err.message}`));
console.log("🧞 Genie worker ready");
