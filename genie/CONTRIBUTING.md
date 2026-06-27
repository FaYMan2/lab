# Contributing to Genie

Thanks for helping build Genie! 🧞

## Setup

```bash
pnpm install
cp .env.example .env          # add a GitHub App + at least one AI key
docker compose up -d          # postgres + redis
pnpm db:migrate
pnpm dev                      # server (:3000) + worker
pnpm --filter @genie/admin dev  # admin panel (:3001)
```

## Project shape

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md). The one rule worth repeating: **only
`packages/ai` may import an LLM SDK.** Everything else talks to `AIService`. PRs that import
`@anthropic-ai/sdk` or `@google/genai` outside `packages/ai` will be asked to refactor.

## Adding an AI provider

1. Implement the `Provider` interface in `packages/ai/src/providers/<name>.ts`.
2. Add `"<name>"` to `PROVIDERS` in `packages/config/src/tasks.ts`.
3. Register it (keyed on its API key) in `packages/ai/src/factory.ts`.
4. Add a price row in `packages/ai/src/cost.ts`.

No other package should change.

## Checks

```bash
pnpm typecheck
pnpm test
```

Please keep new code at the same comment density and naming style as its neighbours.
