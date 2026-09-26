import { PrismaClient } from "@prisma/client";

// Which database to connect to. DATABASE_URL (Neon's pooled address) is the
// normal setting. If it's missing from a deployment's environment but the
// direct address (DATABASE_URL_UNPOOLED, set alongside it by Neon) is there,
// derive the pooled address from it instead of failing every request - a
// removed DATABASE_URL took the live site down on 26 Sep 2026.
export function resolveDatabaseUrl(env: Record<string, string | undefined> = process.env): string | undefined {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const direct = env.DATABASE_URL_UNPOOLED ?? env.POSTGRES_URL_NON_POOLING;
  if (!direct) return env.POSTGRES_PRISMA_URL ?? env.POSTGRES_URL;
  try {
    const url = new URL(direct);
    const [first, ...rest] = url.hostname.split(".");
    if (url.hostname.endsWith(".neon.tech") && !first.endsWith("-pooler")) {
      url.hostname = [`${first}-pooler`, ...rest].join(".");
    }
    return url.toString();
  } catch {
    return direct;
  }
}

// Standard Next.js dev-mode singleton: prevents exhausting the SQLite
// connection pool from hot-reload creating a new PrismaClient per edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const datasourceUrl = resolveDatabaseUrl();

export const db = globalForPrisma.prisma ?? new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
