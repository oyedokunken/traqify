/**
 * Makes a request URL safe to write to a log. Secrets travel in URLs more often than they should: invitation
 * tokens in paths, one-time codes and OAuth state in query strings. This keeps the shape of the URL (so a log
 * line is still useful) and removes the secret.
 */

const SENSITIVE_PARAMS = new Set([
  "code", "state", "token", "sig", "signature", "password", "otp", "key", "secret", "apikey",
  "access_token", "refresh_token", "id_token", "authorization",
]);

// A path segment this long and this plain is a token, not a name or a database id (ids here are 25 characters).
const SECRET_LIKE_SEGMENT = /^[A-Za-z0-9_-]{32,}$/;

export function redactUrl(raw: string): string {
  if (typeof raw !== "string") return "";
  const queryStart = raw.indexOf("?");
  const path = queryStart === -1 ? raw : raw.slice(0, queryStart);
  const query = queryStart === -1 ? "" : raw.slice(queryStart + 1);

  const safePath = path
    .split("/")
    .map((segment) => (SECRET_LIKE_SEGMENT.test(segment) ? "[redacted]" : segment))
    .join("/");
  if (!query) return safePath;

  const safeQuery = query
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq === -1) return pair;
      let name = pair.slice(0, eq);
      try { name = decodeURIComponent(name); } catch { /* keep the raw name */ }
      return SENSITIVE_PARAMS.has(name.toLowerCase()) ? `${pair.slice(0, eq)}=[redacted]` : pair;
    })
    .join("&");
  return `${safePath}?${safeQuery}`;
}
