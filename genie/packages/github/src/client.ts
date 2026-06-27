import { readFileSync } from "node:fs";
import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import { loadEnv, type Env } from "@genie/config";

/** Resolve the App private key from either the inline env var or a file path. */
function resolvePrivateKey(env: Env): string {
  if (env.GITHUB_APP_PRIVATE_KEY) {
    // Allow \n-escaped single-line PEMs (common in CI secret stores).
    return env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n");
  }
  if (env.GITHUB_APP_PRIVATE_KEY_PATH) {
    return readFileSync(env.GITHUB_APP_PRIVATE_KEY_PATH, "utf8");
  }
  throw new Error("Set GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_PATH");
}

/**
 * An Octokit instance authenticated as a specific installation. This is what the worker
 * uses to read PRs and write comments — scoped to exactly the repos Genie was granted.
 */
export function installationOctokit(installationId: number, env: Env = loadEnv()): Octokit {
  if (!env.GITHUB_APP_ID) throw new Error("GITHUB_APP_ID is required");
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID,
      privateKey: resolvePrivateKey(env),
      installationId,
    },
  });
}

/** App-level Octokit (no installation) — used for app metadata / installation listing. */
export function appOctokit(env: Env = loadEnv()): Octokit {
  if (!env.GITHUB_APP_ID) throw new Error("GITHUB_APP_ID is required");
  return new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: env.GITHUB_APP_ID, privateKey: resolvePrivateKey(env) },
  });
}

export type { Octokit };
