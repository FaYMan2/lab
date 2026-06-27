/** Resolved run config for an app, after merging genie.yml with auto-detected defaults. */
export interface GenieAppConfig {
  install?: string;
  build?: string;
  start: string;
  baseUrl: string;
  healthcheck: string;
  startTimeoutSeconds: number;
  env: Record<string, string>;
  auth: { seed?: string; storageState?: string };
  record: {
    viewport: { width: number; height: number };
    skipTitlePatterns: string[];
  };
}

/** A running app instance Playwright can point at. */
export interface BootedApp {
  baseUrl: string;
  /** Navigate to `path` (relative to baseUrl) and return a trimmed DOM/aria snapshot. */
  snapshot(path: string): Promise<string>;
  /** Tail of combined stdout/stderr from the app process. */
  logTail(): string;
  /** Stop the app and free the port. */
  stop(): Promise<void>;
}

/** Result of executing one generated Playwright script. */
export interface RunResult {
  success: boolean;
  /** Path to the recorded .webm when the run produced one. */
  videoPath?: string;
  /** The failure output, fed back into the self-heal loop. */
  error?: string;
  /** Combined runner log (always present). */
  log: string;
}

/** Produced media after the ffmpeg pass. */
export interface MediaResult {
  mp4Path: string;
  gifPath: string;
}
