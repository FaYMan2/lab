import type { RoutingContext, RoutingOverrideStore } from "@genie/ai";
import type { TaskKind } from "@genie/config";
import { prisma } from "@genie/db";

/**
 * DB-backed routing overrides written by the admin panel. Resolution order: a repo-scoped
 * rule wins over an installation-scoped one, which wins over the env default (returned as
 * undefined here so the {@link ModelRouter} falls through).
 */
export class DbRoutingStore implements RoutingOverrideStore {
  async resolve(task: TaskKind, ctx: RoutingContext): Promise<string | undefined> {
    const rules = await prisma.routingRule.findMany({
      where: {
        task,
        OR: [
          ctx.repoId ? { repoId: ctx.repoId } : undefined,
          ctx.installationId ? { installationId: ctx.installationId, repoId: null } : undefined,
        ].filter(Boolean) as object[],
      },
    });
    const repoRule = rules.find((r) => r.repoId === ctx.repoId && ctx.repoId);
    const instRule = rules.find((r) => r.installationId === ctx.installationId && !r.repoId);
    return (repoRule ?? instRule)?.modelRef;
  }
}
