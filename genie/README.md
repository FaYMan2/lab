<div align="center">

# 🧞 Genie

**Intelligent PR demo videos, on autopilot.**

Genie is an open-source GitHub App that watches your pull requests, figures out
whether a change is something a human would want to *see* in action, writes a
[Playwright](https://playwright.dev) automation for that flow, records it, and posts the
demo back to the PR (and its linked issue) — like CodeRabbit or Greptile, but for
demos instead of review comments.

</div>

---

## Why

Reviewers and stakeholders constantly ask *"what does this actually do?"* and end up
checking out branches to find out. Genie answers that automatically: open a PR that
changes a user-visible flow — say, **"the submit button now redirects to the homepage"** —
and Genie replies with a short looping demo of exactly that. Pure-infrastructure PRs —
**"added a Redis cache"** — get a quiet skip notice instead of noise.

## How it works

```
PR opened ──▶ gather context ──▶ triage (is it demoable?) ──┐
              diff · description     cheap model            │ not demoable
              linked issue · threads                        ▼
                              ┌──────────────────────▶ skip notice
                              │ demoable
                              ▼
        boot the app ──▶ generate Playwright script ──▶ record ──▶ publish
        (genie.yml)        capable model · self-heal     mp4+gif    sticky comment
                                                                    + linked issue
```

1. **Context** — Genie reads the diff, PR description, the linked issue(s), and every
   linked conversation.
2. **Triage** — a cheap model decides whether there's a demoable, user-visible *flow*
   change and extracts the steps. Infra-only PRs get a skip notice.
3. **Boot** — Genie starts your app using [`genie.yml`](./genie.example.yml) (or
   auto-detected `package.json` scripts).
4. **Generate & record** — a capable model writes a Playwright script for the flow;
   Genie runs it with video recording and self-heals failures by feeding errors back
   to the model.
5. **Publish** — an autoplaying GIF is embedded directly in a single sticky PR comment,
   with the full-resolution mp4 linked for download. The demo is mirrored to the linked
   issue.

## Bring your own model

Genie is **provider-agnostic by design**. Business logic never imports an LLM SDK — it
calls a single `AIService`, and a `ModelRouter` resolves *which* provider and model to
use per task from config (and the admin panel). Ships with **Claude** and **Gemini**;
adding a provider is a new module under [`packages/ai/src/providers`](./packages/ai/src/providers)
with zero changes to business logic.

Defaults are cheap-first: a small model (e.g. `claude-haiku-4-5`) for the high-volume
triage step, a stronger model (e.g. `claude-sonnet-4-6`) only for script generation.

## Repo layout

| Path | What |
| --- | --- |
| `apps/server` | Probot GitHub App — verifies webhooks, enqueues jobs, serves the API |
| `apps/worker` | BullMQ consumer — runs the full demo pipeline |
| `apps/admin` | Next.js panel — model routing config + run history |
| `packages/ai` | `AIService`, `AnthropicProvider`, `GeminiProvider`, `ModelRouter` |
| `packages/core` | Business logic: context → triage → scriptgen → publish |
| `packages/github` | Octokit helpers + sticky-comment renderer |
| `packages/recorder` | App boot, Playwright runner + self-heal, mp4/GIF pipeline |
| `packages/db` | Prisma schema + client |
| `packages/config` | Shared types, `TaskKind`, env loading |

## Local development

```bash
pnpm install
cp .env.example .env          # fill in GitHub App + at least one AI key
docker compose up -d          # postgres + redis
pnpm db:migrate
pnpm dev                      # server + worker
```

Point your dev GitHub App's webhook at the server (use [smee.io](https://smee.io) to
tunnel to localhost), install it on a test repo, and open a PR with a flow change.

## Status

Early scaffold. The architecture, AI abstraction, pipeline orchestration, and GitHub
UX rendering are in place; the live recorder boot path and admin panel are the active
work. Contributions welcome — see the issues.

## License

MIT
