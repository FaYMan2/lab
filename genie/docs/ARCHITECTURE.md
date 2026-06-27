# Genie architecture

Genie is a hosted **GitHub App** that turns demoable PRs into recorded demo videos. It's
split into a fast webhook **server** and an async **worker**, sharing a set of focused
packages. The defining constraint: **business logic never imports an LLM SDK** — it calls a
single `AIService`, and a `ModelRouter` decides which provider/model runs each task.

## Flow

```
GitHub ──webhook──▶ apps/server (Probot)
                      │  validate + de-dupe + enqueue (BullMQ)
                      ▼
                 Redis queue
                      │
                      ▼
                apps/worker ──▶ @genie/core runDemoPipeline
                                  1. gatherContext   (@genie/github)
                                  2. runTriage       (@genie/ai · cheap tier)
                                  3. bootApp         (@genie/recorder · genie.yml)
                                  4. generateScript  (@genie/ai · capable tier)
                                  5. runScript       (@genie/recorder · Playwright)
                                  6. self-heal loop  (errors → @genie/ai heal tier)
                                  7. makeMedia       (@genie/recorder · ffmpeg → mp4+gif)
                                  8. publish         (@genie/github · sticky comment + check)
```

## Packages

| Package | Responsibility | Imports an LLM SDK? |
| --- | --- | --- |
| `@genie/config` | Shared types, `TaskKind`, env validation, model-ref parsing | no |
| `@genie/ai` | `AIService`, `Provider`, `ModelRouter`, Anthropic + Gemini | **yes (the only place)** |
| `@genie/github` | Octokit auth, sticky-comment renderer, checks | no |
| `@genie/recorder` | App boot, Playwright runner, ffmpeg media | no |
| `@genie/core` | The pipeline + triage/scriptgen/publish business logic | no |
| `@genie/queue` | BullMQ job contract + Redis factory | no |
| `@genie/db` | Prisma schema + client | no |

## The AI boundary

`AIService.generateStructured(task, { schema }, ctx)` is the whole surface business logic
uses. Internally:

1. `ModelRouter.resolve(task, ctx)` returns a `{ provider, model }` — checking DB overrides
   (repo > installation, written by the admin panel) before the env default.
2. The matching `Provider` runs the call (Anthropic forced tool-use / Gemini responseSchema).
3. The result is validated against the caller's Zod schema before returning.

Adding **a third provider** = one new file in `packages/ai/src/providers` + a value in the
`PROVIDERS` list. No change to `@genie/core`, the pipeline, or prompts. Swapping the model
for a task at runtime = one row in `RoutingRule` (a toggle in the admin panel).

## Why this split

- **Server stays fast / always-on.** Webhooks must return quickly; recording can take
  minutes, so it runs in the worker behind a queue with head-SHA de-duplication.
- **Cost control by task.** Triage is high-volume and cheap (small model); script generation
  is rare and hard (stronger model). The router encodes that and the admin panel tunes it.
- **Self-healing.** Generated Playwright scripts fail often on first try; feeding the runner
  error + DOM back to the `heal` task and retrying is what makes the demos reliable.
