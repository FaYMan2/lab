import { Queue } from "bullmq";
import IORedis from "ioredis";
import { loadEnv } from "@genie/config";

export const DEMO_QUEUE = "genie-demo";

/** The unit of work handed from the webhook server to the worker. */
export interface DemoJob {
  installationId: number;
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;
  /** What triggered this job — affects messaging but not the pipeline. */
  trigger: "opened" | "synchronize" | "reopened" | "command";
}

/** Shared Redis connection factory (BullMQ requires maxRetriesPerRequest: null). */
export function createRedis(url = loadEnv().REDIS_URL): IORedis {
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function createDemoQueue(connection = createRedis()) {
  return new Queue<DemoJob>(DEMO_QUEUE, { connection });
}

/** De-dupe key so re-pushing the same head SHA replaces the in-flight job. */
export function demoJobId(job: DemoJob): string {
  return `${job.owner}/${job.repo}#${job.prNumber}@${job.headSha}`;
}
