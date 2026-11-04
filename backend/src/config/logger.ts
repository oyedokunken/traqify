import { AsyncLocalStorage } from "node:async_hooks";
import pino from "pino";

const taps = new Set<(line: string) => void>();

// pino writes through this object. It goes to stdout (Vercel collects it) except under test, where it stays silent
// unless a test taps it with captureLogs().
const destination = {
  write(line: string): void {
    taps.forEach((tap) => tap(line));
    if (process.env.NODE_ENV !== "test") process.stdout.write(line);
  },
};

/** Test helper: records every log line written until stop() is called. */
export function captureLogs() {
  const lines: string[] = [];
  const tap = (line: string) => lines.push(line);
  taps.add(tap);
  return {
    lines,
    entries: () => lines.map((line) => JSON.parse(line) as Record<string, unknown>),
    stop: () => void taps.delete(tap),
  };
}

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    base: { service: "traqify-api" },
    serializers: { err: pino.stdSerializers.err },
    // Headers and bodies are never logged on purpose; this is a second layer in case one is attached by mistake.
    redact: {
      paths: ["password", "token", "refreshToken", "authorization", "cookie", "*.password", "*.token", "*.refreshToken", "*.authorization", "*.cookie", "headers.authorization", "headers.cookie", "req.headers"],
      censor: "[redacted]",
    },
  },
  destination
);

interface RequestContext {
  requestId: string;
  log: pino.Logger;
}

const context = new AsyncLocalStorage<RequestContext>();

/** Everything that runs inside fn (including awaited work) logs with the request's id. */
export const runWithRequest = <T>(requestId: string, fn: () => T): T =>
  context.run({ requestId, log: logger.child({ requestId }) }, fn);

export const getLogger = (): pino.Logger => context.getStore()?.log ?? logger;
export const currentRequestId = (): string | undefined => context.getStore()?.requestId;

/**
 * For work that must not fail the request (an email, an audit entry) but must never fail silently either:
 * `.catch(logAndIgnore("audit log"))` records the failure with the request id and carries on.
 */
export const logAndIgnore = (what: string) => (err: unknown): void => {
  getLogger().warn({ err }, `${what} failed`);
};
