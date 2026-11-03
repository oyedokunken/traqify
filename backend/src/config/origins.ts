/** The public address of the web app. The old traqify.vercel.app address only redirects here. */
export const CANONICAL_ORIGIN = "https://traqify.oyedokun.dev";

/** Scheme and host of a URL, or null when it is not a URL. Paths, trailing slashes and ports of other hosts are dropped. */
export const originOf = (value: string | undefined | null): string | null => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

/**
 * Origins that may call the API from a browser: the configured FRONTEND_URL (local development when unset) and the
 * production domain. CORS and the refresh/logout origin check share this list, so they cannot disagree.
 */
export const allowedOrigins = (): string[] => {
  const configured = originOf(process.env.FRONTEND_URL) ?? "http://localhost:3000";
  return configured === CANONICAL_ORIGIN ? [configured] : [configured, CANONICAL_ORIGIN];
};
