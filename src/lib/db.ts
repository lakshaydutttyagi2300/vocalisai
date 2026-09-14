import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton: prevents exhausting the SQLite
// connection pool from hot-reload creating a new PrismaClient per edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
