import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readdir, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { GenieAppConfig, RunResult } from "./types.js";

export interface RunScriptOptions {
  script: string;
  baseUrl: string;
  cfg: GenieAppConfig;
  /** Working dir for this attempt; a fresh temp dir is created when omitted. */
  workdir?: string;
}

/**
 * Run one generated Playwright script with video recording on. We materialise a tiny,
 * throwaway Playwright project (config + single spec), invoke the test runner, and pull the
 * recorded .webm out of its output dir. Failures are returned (not thrown) so the pipeline
 * can self-heal.
 */
export async function runScript(opts: RunScriptOptions): Promise<RunResult> {
  const dir = opts.workdir ?? (await mkdtemp(join(tmpdir(), "genie-run-")));
  const testsDir = join(dir, "tests");
  const outDir = join(dir, "output");
  await mkdir(testsDir, { recursive: true });

  await writeFile(join(testsDir, "demo.spec.ts"), opts.script, "utf8");
  await writeFile(join(dir, "playwright.config.ts"), playwrightConfig(opts), "utf8");

  const { code, log } = await runPlaywright(dir, opts.baseUrl);

  const videoPath = await findFirstVideo(outDir);
  if (code === 0 && videoPath) {
    // Stabilise the path so the caller doesn't depend on Playwright's hashed dirs.
    const stable = join(dir, "demo.webm");
    await copyFile(videoPath, stable).catch(() => {});
    return { success: true, videoPath: stable, log };
  }
  return { success: false, videoPath, error: log.slice(-6000), log };
}

function playwrightConfig(opts: RunScriptOptions): string {
  const { width, height } = opts.cfg.record.viewport;
  const storageState = opts.cfg.auth.storageState
    ? `storageState: ${JSON.stringify(opts.cfg.auth.storageState)},`
    : "";
  return `import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  outputDir: './output',
  timeout: 120_000,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: process.env.GENIE_BASE_URL,
    headless: true,
    viewport: { width: ${width}, height: ${height} },
    video: { mode: 'on', size: { width: ${width}, height: ${height} } },
    ${storageState}
  },
});
`;
}

function runPlaywright(dir: string, baseUrl: string): Promise<{ code: number; log: string }> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["playwright", "test"], {
      cwd: dir,
      env: { ...process.env, GENIE_BASE_URL: baseUrl },
      shell: true,
    });
    let log = "";
    child.stdout?.on("data", (c) => (log += c));
    child.stderr?.on("data", (c) => (log += c));
    child.on("exit", (code) => resolve({ code: code ?? 1, log }));
    child.on("error", (err) => resolve({ code: 1, log: log + String(err) }));
  });
}

async function findFirstVideo(outDir: string): Promise<string | undefined> {
  try {
    const stack = [outDir];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const entry of await readdir(cur, { withFileTypes: true })) {
        const full = join(cur, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.name.endsWith(".webm")) return full;
      }
    }
  } catch {
    // no output dir => no video
  }
  return undefined;
}
