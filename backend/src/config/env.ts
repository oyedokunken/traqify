import dotenv from "dotenv";

const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL", "PAYSTACK_SECRET_KEY", "FRONTEND_URL"];

export function validateEnv(env: NodeJS.ProcessEnv = process.env): void {
  for (const key of REQUIRED_ENV) {
    if (!env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

/**
 * Loads .env and fails fast when required variables are missing.
 * Imported first by the server entry point so configuration errors surface
 * before any module that reads process.env at import time is evaluated.
 */
export function loadEnv(): void {
  dotenv.config();
  validateEnv();
}
