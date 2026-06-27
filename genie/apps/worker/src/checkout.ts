import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Octokit } from "@genie/github";
import type { PullRequestRef } from "@genie/config";

/**
 * Shallow-clone the PR head into `parentDir` using the installation's short-lived token,
 * so private repos work and the token never lands on disk in remotes (we strip it after).
 */
export async function checkoutPrHead(
  octokit: Octokit,
  pr: PullRequestRef,
  parentDir: string,
): Promise<string> {
  const dir = join(parentDir, `${pr.repo}-${pr.headSha.slice(0, 7)}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const { token } = (await octokit.auth({ type: "installation" })) as { token: string };
  const url = `https://x-access-token:${token}@github.com/${pr.owner}/${pr.repo}.git`;

  await git(["clone", "--depth", "1", "--no-single-branch", url, dir], parentDir);
  await git(["fetch", "--depth", "1", "origin", pr.headSha], dir);
  await git(["checkout", pr.headSha], dir);
  // Drop the tokenised remote so it can't leak into any subprocess.
  await git(["remote", "set-url", "origin", `https://github.com/${pr.owner}/${pr.repo}.git`], dir);
  return dir;
}

function git(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd });
    let err = "";
    child.stderr?.on("data", (c) => (err += c));
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`git ${args[0]} failed (${code}): ${err.slice(-1000)}`)),
    );
    child.on("error", reject);
  });
}
