import { AppError } from "../middleware/error.middleware";

export interface PaystackTransaction {
  status: string;
  amountKobo: number;
  currency: string;
  reference: string;
}

const VERIFY_URL = "https://api.paystack.co/transaction/verify/";

/**
 * Asks Paystack about a transaction. Returns null when Paystack does not know
 * the reference. Throws a 502 when Paystack cannot be reached, so callers never
 * mistake an outage for a failed payment.
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction | null> {
  let body: { status?: boolean; data?: { status?: string; amount?: number; currency?: string; reference?: string } };
  try {
    const res = await fetch(`${VERIFY_URL}${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      signal: AbortSignal.timeout(10_000),
    });
    body = (await res.json()) as typeof body;
  } catch {
    throw new AppError("Payment verification is temporarily unavailable. Please try again.", 502);
  }

  if (!body?.status || !body.data) return null;
  const { status, amount, currency, reference: returnedReference } = body.data;
  if (typeof status !== "string" || typeof amount !== "number" || typeof currency !== "string" || typeof returnedReference !== "string") {
    return null;
  }
  return { status, amountKobo: amount, currency, reference: returnedReference };
}
