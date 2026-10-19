import { randomUUID } from "node:crypto";
import { IncomingMessage, ServerResponse } from "node:http";
import { NextFunction, Request, Response } from "express";
import pinoHttp from "pino-http";
import { logger, runWithRequest } from "../config/logger";
import { redactUrl } from "../utils/redact";

const SAFE_ID = /^[\w.:-]{1,128}$/;

/** Reuses the platform's request id when it is well formed, otherwise makes one. */
function requestId(req: IncomingMessage): string {
  const incoming = req.headers["x-request-id"] ?? req.headers["x-vercel-id"];
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return value && SAFE_ID.test(value) ? value : randomUUID();
}

const httpLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage, res: ServerResponse) => {
    const id = requestId(req);
    res.setHeader("X-Request-Id", id);
    return id;
  },
  autoLogging: { ignore: (req: IncomingMessage) => req.url === "/health" },
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) =>
    err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
  // Only these fields are logged: no headers, no cookies, no body, and a redacted URL.
  serializers: {
    req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: redactUrl(req.url) }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
  customProps: (req: IncomingMessage) => {
    const user = (req as Request & { user?: { id: string; organizationId: string | null } }).user;
    return user ? { userId: user.id, organizationId: user.organizationId } : {};
  },
});

export const requestLogger = [
  httpLogger,
  (req: Request, _res: Response, next: NextFunction): void => runWithRequest(String(req.id), next),
];
