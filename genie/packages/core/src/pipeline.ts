import type { Octokit } from "octokit";
import type { AIService, RoutingContext } from "@genie/ai";
import type { DemoCommentModel } from "@genie/github";
import { loadAppConfig, bootApp, runScript, makeMedia, type BootedApp } from "@genie/recorder";
import type { PullRequestRef } from "@genie/config";
import { gatherContext, parseLinkedIssueNumbers } from "./context.js";
import { runTriage } from "./triage.js";
import { generateScript } from "./scriptgen.js";

/** Uploads produced media and returns public URLs for the comment. Implemented by the worker. */
export interface MediaUploader {
  upload(pr: PullRequestRef, mp4Path: string, gifPath: string): Promise<{ gifUrl: string; mp4Url: string }>;
}

export interface PipelineDeps {
  octokit: Octokit;
  ai: AIService;
  routing?: RoutingContext;
  /** Clone the PR head into `dir` and return the repo root to boot from. */
  checkout(pr: PullRequestRef, dir: string): Promise<string>;
  uploader: MediaUploader;
  /** Called on every state transition so the worker can update the sticky comment live. */
  onProgress?(model: DemoCommentModel): Promise<void>;
  /** Resolved model names for the comment footer. */
  models?: { triage?: string; scriptGen?: string };
  maxHealAttempts: number;
  workdir: string;
}

/**
 * The full demo pipeline: gather → triage → boot → (generate → record → heal)* → media →
 * publish-ready model. Returns the terminal {@link DemoCommentModel}; the worker persists it
 * and posts it. Pure orchestration — every vendor concern lives behind an injected dependency.
 */
export async function runDemoPipeline(
  prRef: PullRequestRef,
  deps: PipelineDeps,
): Promise<DemoCommentModel> {
  const routing = deps.routing ?? {};
  const emit = async (m: DemoCommentModel) => {
    await deps.onProgress?.(m);
    return m;
  };

  await emit({ status: "gathering", headSha: prRef.headSha, models: deps.models });
  const ctx = await gatherContext(deps.octokit, prRef);
  const pr = ctx.pr; // headSha now resolved

  await emit({ status: "triaging", headSha: pr.headSha, models: deps.models });
  const triage = await runTriage(deps.ai, ctx, routing);

  if (!triage.demoable) {
    return emit({
      status: "skipped",
      reasoning: triage.reasoning,
      headSha: pr.headSha,
      models: deps.models,
      costUsd: deps.ai.usageSummary.totalCostUsd,
    });
  }

  const flow = triage.flows[0]!; // most representative flow
  let booted: BootedApp | undefined;
  try {
    await emit({ status: "booting", flows: triage.flows, headSha: pr.headSha, models: deps.models });
    const repoDir = await deps.checkout(pr, deps.workdir);
    const cfg = loadAppConfig(repoDir);
    booted = await bootApp(repoDir, cfg);

    const domSnapshot = await booted.snapshot(flow.entrypoint);

    let lastError: string | undefined;
    let lastScript: string | undefined;
    let video: string | undefined;
    let runLog = "";

    for (let attempt = 1; attempt <= deps.maxHealAttempts; attempt++) {
      const script = await generateScript(
        deps.ai,
        {
          baseUrl: booted.baseUrl,
          entrypoint: flow.entrypoint,
          flowName: flow.name,
          flowDescription: flow.description,
          steps: flow.steps,
          domSnapshot,
          previousScript: lastScript,
          previousError: lastError,
        },
        routing,
      );
      lastScript = script;

      await emit({ status: "recording", flows: triage.flows, script, headSha: pr.headSha, models: deps.models });
      const result = await runScript({ script, baseUrl: booted.baseUrl, cfg });
      runLog = result.log;

      if (result.success && result.videoPath) {
        video = result.videoPath;
        break;
      }
      lastError = result.error;
    }

    if (!video) {
      return emit({
        status: "failed",
        flows: triage.flows,
        script: lastScript,
        detail: `Couldn't get a clean recording after ${deps.maxHealAttempts} attempts.`,
        log: tail(runLog),
        headSha: pr.headSha,
        models: deps.models,
        costUsd: deps.ai.usageSummary.totalCostUsd,
      });
    }

    await emit({ status: "publishing", flows: triage.flows, script: lastScript, headSha: pr.headSha, models: deps.models });
    const { mp4Path, gifPath } = await makeMedia(video);
    const { gifUrl, mp4Url } = await deps.uploader.upload(pr, mp4Path, gifPath);

    return emit({
      status: "posted",
      flows: triage.flows,
      script: lastScript,
      gifUrl,
      mp4Url,
      log: tail(runLog),
      headSha: pr.headSha,
      models: deps.models,
      costUsd: deps.ai.usageSummary.totalCostUsd,
    });
  } catch (err) {
    return emit({
      status: "failed",
      flows: triage.flows,
      detail: (err as Error).message,
      headSha: pr.headSha,
      models: deps.models,
      costUsd: deps.ai.usageSummary.totalCostUsd,
    });
  } finally {
    await booted?.stop();
  }
}

/** Convenience: which issues a finished demo should be mirrored to. */
export function linkedIssuesOf(body: string): number[] {
  return parseLinkedIssueNumbers(body);
}

function tail(log: string, lines = 60): string {
  return log.split("\n").slice(-lines).join("\n");
}
