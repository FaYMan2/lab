// Re-export a singleton Prisma client. The generated client lands in ./generated
// after `pnpm db:generate`; until then TS will flag the import — that's expected
// on a fresh checkout.
import { PrismaClient } from "./generated/client/index.js";

export * from "./generated/client/index.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
