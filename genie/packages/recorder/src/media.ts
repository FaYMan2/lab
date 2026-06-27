import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import type { MediaResult } from "./types.js";

/**
 * Turn the recorded .webm into the two artefacts the comment needs: a compressed mp4 for
 * the download link, and a downscaled, looping GIF that autoplays inline on GitHub.
 * Requires ffmpeg on PATH (present in the worker image).
 */
export async function makeMedia(
  webmPath: string,
  opts: { gifWidth?: number; fps?: number } = {},
): Promise<MediaResult> {
  const dir = dirname(webmPath);
  const mp4Path = join(dir, "demo.mp4");
  const gifPath = join(dir, "demo.gif");
  const palette = join(dir, "palette.png");
  const gifWidth = opts.gifWidth ?? 800;
  const fps = opts.fps ?? 12;

  // webm -> mp4 (H.264, faststart so it streams in the browser player).
  await ffmpeg([
    "-y", "-i", webmPath,
    "-movflags", "+faststart",
    "-pix_fmt", "yuv420p",
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-crf", "26",
    mp4Path,
  ]);

  // webm -> GIF via a two-pass palette for clean colours at small size.
  await ffmpeg(["-y", "-i", webmPath, "-vf", `fps=${fps},scale=${gifWidth}:-1:flags=lanczos,palettegen`, palette]);
  await ffmpeg([
    "-y", "-i", webmPath, "-i", palette,
    "-lavfi", `fps=${fps},scale=${gifWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
    "-loop", "0",
    gifPath,
  ]);

  return { mp4Path, gifPath };
}

function ffmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args);
    let err = "";
    child.stderr?.on("data", (c) => (err += c));
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}\n${err.slice(-2000)}`)),
    );
    child.on("error", reject);
  });
}
