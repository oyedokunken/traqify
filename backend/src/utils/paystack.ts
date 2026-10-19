import { AppError } from "../middleware/error.middleware";

const API = "https://api.paystack.co";
const TIMEOUT_MS = 10_000;
const MAX_LOGGED_MESSAGE = 200;

export interface PaystackTransaction {
  status: string;
  amountKobo: number;
  currency: string;
  reference: string;
}

export interface PaystackInitialization {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

type Operation = "initialize" | "verify" | "refund";

const unavailable = (): AppError =>
  new AppError("The payment provider is temporarily unavailable. Please try again.", 502);

/** Keeps Paystack's own words but makes sure the secret key can never end up in a log line. */
function safeMessage(message: unknown): string {
  const text = typeof message === "string" ? message : "(no message)";
  const key = process.env.PAYSTACK_SECRET_KEY;
  const redacted = key ? text.split(key).join("[redacted]") : text;
  return redacted.slice(0, MAX_LOGGED_MESSAGE);
}

/**
 * Records why a Paystack call failed: which operation, the HTTP status and Paystack's message. Never the key,
 * the request body (it holds the customer's email) or the response data.
 */
function logFailure(operation: Operation, details: { http?: number; message?: unknown; reason?: string }): void {
  const parts = [`[paystack] ${operation} failed`];
  if (details.reason) parts.push(details.reason);
  if (details.http !== undefined) parts.push(`HTTP ${details.http}`);
  if (details.message !== undefined) parts.push(`message "${safeMessage(details.message)}"`);
  console.error(parts.join(", "));
}

interface PaystackResult<T> {
  http: number;
  body: T;
}

async function paystackRequest<T>(operation: Operation, path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<PaystackResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause?.code;
    logFailure(operation, { reason: `network error (${(err as Error).name}${cause ? ` ${cause}` : ""})` });
    throw unavailable();
  }

  try {
    return { http: res.status, body: (await res.json()) as T };
  } catch {
    logFailure(operation, { http: res.status, reason: "response was not JSON" });
    throw unavailable();
  }
}

/**
 * Asks Paystack about a transaction. Returns null when Paystack does not know
 * the reference. Throws a 502 when Paystack cannot be reached, so callers never
 * mistake an outage for a failed payment.
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction | null> {
  const { http, body } = await paystackRequest<{
    status?: boolean;
    message?: string;
    data?: { status?: string; amount?: number; currency?: string; reference?: string };
  }>("verify", `/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });

  if (!body?.status || !body.data) {
    // An unknown reference is a normal answer; authentication, rate limit and server errors are not.
    if (http === 401 || http === 403 || http === 429 || http >= 500) logFailure("verify", { http, message: body?.message });
    return null;
  }
  const { status, amount, currency, reference: returnedReference } = body.data;
  if (typeof status !== "string" || typeof amount !== "number" || typeof currency !== "string" || typeof returnedReference !== "string") {
    logFailure("verify", { http, reason: "unexpected response shape" });
    return null;
  }
  return { status, amountKobo: amount, currency, reference: returnedReference };
}

/** Creates a transaction on Paystack. The amount and reference are chosen by the server. */
export async function initializePaystackTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitialization> {
  const { http, body } = await paystackRequest<{
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; access_code?: string; reference?: string };
  }>("initialize", "/transaction/initialize", {
    method: "POST",
    body: {
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    },
  });

  const data = body?.data;
  if (!body?.status) {
    logFailure("initialize", { http, message: body?.message });
    // Paystack validates the address more strictly than we do (it refuses .test and similar domains). That is
    // the customer's to fix, not an outage.
    if (http === 400 && typeof body?.message === "string" && /email/i.test(body.message)) {
      throw new AppError("Please enter a valid email address.", 400);
    }
    throw unavailable();
  }
  if (!data?.authorization_url || !data.access_code || data.reference !== input.reference) {
    logFailure("initialize", { http, reason: "unexpected response shape" });
    throw unavailable();
  }
  return { authorizationUrl: data.authorization_url, accessCode: data.access_code, reference: data.reference };
}

/** Refunds a successful transaction in full. Returns false if Paystack did not accept the refund. */
export async function refundPaystackTransaction(reference: string): Promise<boolean> {
  try {
    const { http, body } = await paystackRequest<{ status?: boolean; message?: string }>("refund", "/refund", {
      method: "POST",
      body: { transaction: reference },
    });
    if (body?.status !== true) {
      logFailure("refund", { http, message: body?.message });
      return false;
    }
    return true;
  } catch {
    // paystackRequest already logged the reason.
    return false;
  }
}
