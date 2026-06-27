import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { GenieAppConfig } from "./types.js";

const DEFAULTS: GenieAppConfig = {
  start: "npm run dev",
  baseUrl: "http://localhost:3000",
  healthcheck: "http://localhost:3000",
  startTimeoutSeconds: 120,
  env: {},
  auth: {},
  record: { viewport: { width: 1280, height: 720 }, skipTitlePatterns: [] },
};

/**
 * Load `genie.yml` from a checked-out repo, falling back to defaults auto-detected from
 * package.json. The goal: zero-config works for common setups, full control when needed.
 */
export function loadAppConfig(repoDir: string): GenieAppConfig {
  const detected = autoDetect(repoDir);
  const file = ["genie.yml", "genie.yaml"].map((f) => join(repoDir, f)).find(existsSync);
  if (!file) return detected;

  const raw = parseYaml(readFileSync(file, "utf8")) ?? {};
  const app = raw.app ?? {};
  return {
    install: app.install ?? detected.install,
    build: app.build ?? detected.build,
    start: app.start ?? detected.start,
    baseUrl: app.baseUrl ?? detected.baseUrl,
    healthcheck: app.healthcheck ?? app.baseUrl ?? detected.healthcheck,
    startTimeoutSeconds: app.startTimeoutSeconds ?? detected.startTimeoutSeconds,
    env: { ...detected.env, ...(app.env ?? {}) },
    auth: { seed: raw.auth?.seed || undefined, storageState: raw.auth?.storageState || undefined },
    record: {
      viewport: raw.record?.viewport ?? detected.record.viewport,
      skipTitlePatterns: raw.record?.skipTitlePatterns ?? [],
    },
  };
}

/** Infer install/start from package.json: pick a sensible package manager + dev script. */
function autoDetect(repoDir: string): GenieAppConfig {
  const pkgPath = join(repoDir, "package.json");
  if (!existsSync(pkgPath)) return DEFAULTS;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const scripts: Record<string, string> = pkg.scripts ?? {};

  const pm = existsSync(join(repoDir, "pnpm-lock.yaml"))
    ? "pnpm"
    : existsSync(join(repoDir, "yarn.lock"))
      ? "yarn"
      : "npm";
  const run = pm === "npm" ? "npm run" : pm;
  const install = pm === "npm" ? "npm install" : `${pm} install`;

  const startScript = scripts.dev ? "dev" : scripts.start ? "start" : "dev";
  const build = scripts.build ? `${run} build` : undefined;

  return {
    ...DEFAULTS,
    install,
    build,
    start: `${run} ${startScript}`,
  };
}
