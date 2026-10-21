import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const DEFAULT_CONNECTION_LIMIT = 3;
const MAX_CONNECTION_LIMIT = 10;

function connectionLimit(raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw)) return DEFAULT_CONNECTION_LIMIT;
  const n = Number(raw);
  return n >= 1 && n <= MAX_CONNECTION_LIMIT ? n : DEFAULT_CONNECTION_LIMIT;
}

/**
 * Supabase pooler URLs are switched to transaction mode (port 6543), which avoids EMAXCONNSESSION on serverless, and get
 * a small per-instance connection limit. A limit of 1 made every query in a request wait for the one before it, while a
 * large one multiplies across concurrent serverless instances and can exhaust the pooler's client limit. Other URLs
 * (local, test, direct) are returned untouched. Credentials are never modified.
 */
export function pooledDatabaseUrl(url: string | undefined, limit?: string): string | undefined {
  if (!url || !url.includes("pooler.supabase.com")) return url;
  const queryStart = url.indexOf("?");
  const base = queryStart === -1 ? url : url.slice(0, queryStart);
  const query = queryStart === -1 ? [] : url.slice(queryStart + 1).split("&").filter(Boolean);

  const kept = query.filter((p) => !p.startsWith("pgbouncer=") && !p.startsWith("connection_limit="));
  const params = ["pgbouncer=true", `connection_limit=${connectionLimit(limit)}`, ...kept];
  return `${base.replace(/(@[^/?]*):5432(?=[/?]|$)/, "$1:6543")}?${params.join("&")}`;
}

const prisma = global.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  datasources: { db: { url: pooledDatabaseUrl(process.env.DATABASE_URL, process.env.DB_CONNECTION_LIMIT) } },
});

global.prisma = prisma;

export default prisma;
