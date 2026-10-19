import { Request, Response, NextFunction } from "express";
import { currentRequestId, getLogger } from "../config/logger";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** The one error shape every response uses. requestId lets a user quote it and lets us find the log line. */
const body = (message: string) => {
  const requestId = currentRequestId();
  return requestId ? { error: message, requestId } : { error: message };
};

/**
 * Sends the message of an AppError, or a generic 500 for anything else. The full error is logged server side with
 * the request id (5xx and unexpected errors only; a 400 or 404 is a normal answer). The text of an unexpected error
 * is never sent to the client.
 */
export const respondWithError = (res: Response, err: unknown, fallbackMessage: string): void => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) getLogger().error({ err }, err.message);
    res.status(err.statusCode).json(body(err.message));
    return;
  }
  getLogger().error({ err }, fallbackMessage);
  res.status(500).json(body(fallbackMessage));
};

/** Express error middleware: anything thrown or passed to next(err) ends up here. */
export const errorHandler = (err: unknown, _req: Request, res: Response, next: NextFunction): void => {
  if (res.headersSent) {
    next(err);
    return;
  }
  // Malformed JSON, oversized bodies and similar are the client's doing, not a server failure.
  const status = (err as { status?: number; statusCode?: number })?.status ?? (err as { statusCode?: number })?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500 && !(err instanceof AppError)) {
    res.status(status).json(body(status === 413 ? "The request is too large." : "The request could not be understood."));
    return;
  }
  respondWithError(res, err, "Something went wrong. Please try again.");
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json(body("The requested resource was not found."));
};
