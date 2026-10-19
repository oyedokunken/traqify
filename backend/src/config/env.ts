import dotenv from "dotenv";

const REQUIRED_ENV = ["JWT_SECRET", "DATABASE_URL", "PAYSTACK_SECRET_KEY", "FRONTEND_URL"];

// The web app reaches the API through its own server and forwards the visitor's address with this shared secret.
// Without it every visitor would look like the proxy to rate limits, so production refuses to start.
const REQUIRED_IN_PRODUCTION = ["PROXY_SHARED_SECRET"];

export function validateEnv(env: NodeJS.ProcessEnv = process.env): void {
  const required = env.NODE_ENV === "production" ? [...REQUIRED_ENV, ...REQUIRED_IN_PRODUCTION] : REQUIRED_ENV;
  for (const key of required) {
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
