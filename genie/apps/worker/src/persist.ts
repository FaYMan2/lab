import { prisma } from "@genie/db";
import type { DemoCommentModel } from "@genie/github";
import type { DemoJob } from "@genie/queue";

/** Ensure Installation + Repo rows exist and return the repo id (for routing scope). */
export async function ensureRepo(job: DemoJob): Promise<string> {
  const installation = await prisma.installation.upsert({
    where: { githubId: BigInt(job.installationId) },
    create: { githubId: BigInt(job.installationId), account: job.owner },
    update: {},
  });
  const repo = await prisma.repo.upsert({
    where: { owner_name: { owner: job.owner, name: job.repo } },
    create: { owner: job.owner, name: job.repo, installationId: installation.id },
    update: {},
  });
  return repo.id;
}

/** Persist the terminal run state for the admin run-history view. Best-effort. */
export async function recordRun(
  repoId: string,
  job: DemoJob,
  model: DemoCommentModel,
  usage: unknown,
): Promise<void> {
  await prisma.run.create({
    data: {
      repoId,
      prNumber: job.prNumber,
      headSha: job.headSha,
      status: model.status,
      triage: model.flows ? (model.flows as unknown as object) : undefined,
      script: model.script,
      gifUrl: model.gifUrl,
      mp4Url: model.mp4Url,
      detail: model.detail ?? model.reasoning,
      usage: usage as object,
    },
  });
}
