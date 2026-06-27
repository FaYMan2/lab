import { spawn, type ChildProcess } from "node:child_process";
import { chromium, type Browser } from "playwright";
import type { BootedApp, GenieAppConfig } from "./types.js";

const LOG_TAIL_LINES = 200;

/**
 * Boot a checked-out app: run install/build, spawn the long-running start command, wait
 * for the healthcheck to go green, then hand back a {@link BootedApp} that can snapshot
 * pages and be stopped. The caller is responsible for having cloned the PR head into
 * `repoDir` first.
 */
export async function bootApp(repoDir: string, cfg: GenieAppConfig): Promise<BootedApp> {
  const env = { ...process.env, ...cfg.env };

  if (cfg.install) await runToCompletion(cfg.install, repoDir, env);
  if (cfg.build) await runToCompletion(cfg.build, repoDir, env);
  if (cfg.auth.seed) await runToCompletion(cfg.auth.seed, repoDir, env);

  const logLines: string[] = [];
  const record = (chunk: Buffer) => {
    for (const line of chunk.toString().split("\n")) {
      logLines.push(line);
      if (logLines.length > LOG_TAIL_LINES) logLines.shift();
    }
  };

  const child = spawnShell(cfg.start, repoDir, env);
  child.stdout?.on("data", record);
  child.stderr?.on("data", record);

  await waitForHealthy(cfg.healthcheck, cfg.startTimeoutSeconds, () => logLines.join("\n"));

  let browser: Browser | undefined;
  return {
    baseUrl: cfg.baseUrl,
    logTail: () => logLines.join("\n"),
    async snapshot(path: string) {
      browser ??= await chromium.launch();
      const page = await browser.newPage({ viewport: cfg.record.viewport });
      try {
        await page.goto(new URL(path, cfg.baseUrl).toString(), { waitUntil: "networkidle" });
        // An aria snapshot is compact and gives the model real, role-based selectors.
        return await page.locator("body").ariaSnapshot();
      } finally {
        await page.close();
      }
    },
    async stop() {
      await browser?.close().catch(() => {});
      await killTree(child);
    },
  };
}

async function waitForHealthy(url: string, timeoutSeconds: number, log: () => string): Promise<void> {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok || (res.status >= 200 && res.status < 500)) return;
    } catch {
      // not up yet
    }
    await sleep(1000);
  }
  throw new Error(`App did not become healthy at ${url} within ${timeoutSeconds}s.\n${log()}`);
}

function runToCompletion(cmd: string, cwd: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawnShell(cmd, cwd, env);
    let out = "";
    child.stdout?.on("data", (c) => (out += c));
    child.stderr?.on("data", (c) => (out += c));
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`\`${cmd}\` exited ${code}\n${out.slice(-4000)}`)),
    );
    child.on("error", reject);
  });
}

function spawnShell(cmd: string, cwd: string, env: NodeJS.ProcessEnv): ChildProcess {
  return spawn(cmd, { cwd, env, shell: true, detached: true });
}

async function killTree(child: ChildProcess): Promise<void> {
  if (child.pid == null) return;
  try {
    // Negative pid kills the whole process group started with detached: true.
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
