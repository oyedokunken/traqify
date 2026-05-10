import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function getTransactionModeUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  // Auto-switch session-mode pooler (port 5432) → transaction mode (port 6543)
  // This prevents EMAXCONNSESSION in Vercel serverless environments
  if (url.includes("pooler.supabase.com") && url.includes(":5432/")) {
    const base = url.replace(":5432/", ":6543/");
    const params: string[] = [];
    if (!base.includes("pgbouncer=true")) params.push("pgbouncer=true");
    if (!base.includes("connection_limit=")) params.push("connection_limit=1");
    return params.length ? base + (base.includes("?") ? "&" : "?") + params.join("&") : base;
  }
  return url;
}

const prisma = global.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  datasources: { db: { url: getTransactionModeUrl() } },
});

global.prisma = prisma;

export default prisma;
