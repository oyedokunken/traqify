import { z } from "zod";

export const MAX_PAGE_SIZE = 100;
/** Hard ceiling for list endpoints that return a plain array instead of pages. */
export const MAX_UNPAGED_ROWS = 500;

/**
 * Query string integers arrive as text. Anything that is not a whole number of at
 * least 1 falls back to the default; values above the maximum are capped.
 */
const lenientInt = (fallback: number, max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string" || value.trim() === "") return undefined;
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : undefined;
  }, z.number().int().min(1).default(fallback));

/** Shared pagination query: page >= 1, limit between 1 and 100 with a per-endpoint default. */
export const paginationSchema = (defaultLimit = 25) =>
  z.object({
    page: lenientInt(1, 1_000_000),
    limit: lenientInt(defaultLimit, MAX_PAGE_SIZE),
  });

export function parsePagination(query: unknown, defaultLimit = 25) {
  const { page, limit } = paginationSchema(defaultLimit).parse(query ?? {});
  return { page, limit, skip: (page - 1) * limit, take: limit };
}
