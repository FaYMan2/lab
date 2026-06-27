import { parseModelRef, type ModelRef, type TaskKind } from "@genie/config";

/** Scope used to look up overrides — most specific (repo) wins. */
export interface RoutingContext {
  installationId?: string;
  repoId?: string;
}

/**
 * Pluggable source of admin-editable overrides (DB-backed in production, in-memory in
 * tests). Returns a `"provider:model"` string, or undefined to fall through to defaults.
 * Kept as an interface so `@genie/ai` never imports `@genie/db`.
 */
export interface RoutingOverrideStore {
  resolve(task: TaskKind, ctx: RoutingContext): Promise<string | undefined>;
}

/**
 * Resolves which model handles a given task. Precedence:
 *   override store (repo > installation) → env/default map.
 * This is the single source of truth the admin panel writes to.
 */
export class ModelRouter {
  constructor(
    private readonly defaults: Record<TaskKind, string>,
    private readonly store?: RoutingOverrideStore,
  ) {}

  async resolve(task: TaskKind, ctx: RoutingContext = {}): Promise<ModelRef> {
    const override = await this.store?.resolve(task, ctx);
    const raw = override ?? this.defaults[task];
    if (!raw) throw new Error(`No model configured for task "${task}"`);
    return parseModelRef(raw);
  }
}
