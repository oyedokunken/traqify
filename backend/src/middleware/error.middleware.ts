import { Request, Response, NextFunction } from "express";

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

export const errorHandler = (
  err: AppError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.error(err);
    res.status(500).json({ error: err.message, stack: err.stack });
    return;
  }

  res.status(500).json({ error: "Something went wrong. Please try again." });
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({ error: "The requested resource was not found." });
};
