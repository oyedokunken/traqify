import { AppError } from "../middleware/error.middleware";

const API = "https://api.paystack.co";
const TIMEOUT_MS = 10_000;

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

const unavailable = (): AppError =>
  new AppError("The payment provider is temporarily unavailable. Please try again.", 502);

async function paystackRequest<T>(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
  try {
    const res = await fetch(`${API}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return (await res.json()) as T;
  } catch {
    throw unavailable();
  }
}

/**
 * Asks Paystack about a transaction. Returns null when Paystack does not know
 * the reference. Throws a 502 when Paystack cannot be reached, so callers never
 * mistake an outage for a failed payment.
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction | null> {
  const body = await paystackRequest<{
    status?: boolean;
    data?: { status?: string; amount?: number; currency?: string; reference?: string };
  }>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });

  if (!body?.status || !body.data) return null;
  const { status, amount, currency, reference: returnedReference } = body.data;
  if (typeof status !== "string" || typeof amount !== "number" || typeof currency !== "string" || typeof returnedReference !== "string") {
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
  const body = await paystackRequest<{
    status?: boolean;
    data?: { authorization_url?: string; access_code?: string; reference?: string };
  }>("/transaction/initialize", {
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
  if (!body?.status || !data?.authorization_url || !data.access_code || data.reference !== input.reference) {
    throw unavailable();
  }
  return { authorizationUrl: data.authorization_url, accessCode: data.access_code, reference: data.reference };
}

/** Refunds a successful transaction in full. Returns false if Paystack did not accept the refund. */
export async function refundPaystackTransaction(reference: string): Promise<boolean> {
  try {
    const body = await paystackRequest<{ status?: boolean }>("/refund", {
      method: "POST",
      body: { transaction: reference },
    });
    return body?.status === true;
  } catch {
    return false;
  }
}
