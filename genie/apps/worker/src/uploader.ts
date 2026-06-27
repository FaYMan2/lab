import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { Octokit } from "@genie/github";
import type { PullRequestRef, Env } from "@genie/config";
import type { MediaUploader } from "@genie/core";

/**
 * Default uploader: stores media as assets on a dedicated `genie-demos` GitHub Release in
 * the same repo. Release asset URLs both render inline (GIF) and download (mp4), so we need
 * no external object store for the common case. Swap `GENIE_MEDIA_BACKEND=s3` for S3.
 */
export class ReleaseMediaUploader implements MediaUploader {
  constructor(private readonly octokit: Octokit) {}

  async upload(pr: PullRequestRef, mp4Path: string, gifPath: string) {
    const releaseId = await this.ensureRelease(pr.owner, pr.repo);
    const stamp = `${pr.number}-${pr.headSha.slice(0, 7)}`;
    const gifUrl = await this.uploadAsset(pr, releaseId, gifPath, `demo-${stamp}.gif`, "image/gif");
    const mp4Url = await this.uploadAsset(pr, releaseId, mp4Path, `demo-${stamp}.mp4`, "video/mp4");
    return { gifUrl, mp4Url };
  }

  private async ensureRelease(owner: string, repo: string): Promise<number> {
    const tag = "genie-demos";
    try {
      const { data } = await this.octokit.rest.repos.getReleaseByTag({ owner, repo, tag });
      return data.id;
    } catch {
      const { data } = await this.octokit.rest.repos.createRelease({
        owner,
        repo,
        tag_name: tag,
        name: "🧞 Genie demo assets",
        body: "Auto-generated demo recordings. Managed by Genie.",
        make_latest: "false",
        prerelease: true,
      });
      return data.id;
    }
  }

  private async uploadAsset(
    pr: PullRequestRef,
    releaseId: number,
    path: string,
    name: string,
    contentType: string,
  ): Promise<string> {
    const data = await readFile(path);
    const res = await this.octokit.rest.repos.uploadReleaseAsset({
      owner: pr.owner,
      repo: pr.repo,
      release_id: releaseId,
      name,
      data: data as unknown as string,
      headers: { "content-type": contentType, "content-length": data.length },
    });
    return res.data.browser_download_url;
  }
}

/** Pick the uploader implementation from env. (S3 backend is a TODO stub for now.) */
export function createUploader(octokit: Octokit, env: Env): MediaUploader {
  if (env.GENIE_MEDIA_BACKEND === "s3") {
    throw new Error("S3 media backend not yet implemented — use GENIE_MEDIA_BACKEND=release");
  }
  return new ReleaseMediaUploader(octokit);
}
