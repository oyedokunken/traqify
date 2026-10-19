import crypto from "crypto";
import { CheckoutSession, OrderStatus, PaymentStatus } from "@prisma/client";
import prisma from "../config/database";
import { sendEmail } from "../config/email";
import { AppError } from "../middleware/error.middleware";
import { toMinor } from "./money";
import { generateOrderNumber } from "./order-number";
import { OrderLine, placeOrder, quoteOrder } from "./order-placement";
import { initializePaystackTransaction, refundPaystackTransaction, verifyPaystackTransaction } from "./paystack";

const SESSION_TTL_MS = 60 * 60 * 1000;
// checkout_sessions.amountKobo is a 32 bit integer.
const MAX_AMOUNT_KOBO = 2_000_000_000;

export interface StoreCustomer {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface StoreOrg {
  id: string;
  slug: string;
  name: string;
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Prices the cart on the server, creates the Paystack transaction and records a
 * pending session. The browser only ever receives a reference and access code
 * that the server issued, and never chooses an amount.
 */
export async function initializeCheckout(org: StoreOrg, customer: StoreCustomer, items: OrderLine[]) {
  const { total } = await quoteOrder(org.id, items);
  const amountKobo = toMinor(total);
  if (amountKobo > MAX_AMOUNT_KOBO) {
    throw new AppError("This order is too large to pay online. Please reduce the cart.", 400);
  }

  const reference = `TRQ-${crypto.randomBytes(12).toString("hex")}`;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const transaction = await initializePaystackTransaction({
    email: customer.email,
    amountKobo,
    reference,
    callbackUrl: `${frontendUrl}/store/${org.slug}/checkout`,
    metadata: { slug: org.slug },
  });

  await prisma.checkoutSession.create({
    data: {
      reference,
      accessCode: transaction.accessCode,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      notes: customer.notes,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      amountKobo,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      organizationId: org.id,
    },
  });

  return { reference, accessCode: transaction.accessCode, authorizationUrl: transaction.authorizationUrl, amount: total };
}

async function refundFailedCheckout(session: CheckoutSession, org: StoreOrg, reason: string): Promise<boolean> {
  const refunded = await refundPaystackTransaction(session.reference);
  await prisma.checkoutSession.updateMany({
    where: { id: session.id, status: "PENDING" },
    data: { status: refunded ? "REFUNDED" : "REFUND_FAILED", failureReason: reason },
  });

  if (!refunded) {
    console.error(`[checkout] refund failed for ${session.reference} (${session.amountKobo} kobo): ${reason}`);
    const owner = await prisma.user.findFirst({ where: { organizationId: org.id, role: "OWNER" }, select: { email: true } });
    if (owner) {
      sendEmail(
        owner.email,
        `Action needed: refund failed for a ${org.name} store payment`,
        `<p>A customer paid but their order could not be fulfilled (${escapeHtml(reason)}), and the automatic refund failed.</p>` +
          `<p>Please refund this payment manually in Paystack.</p>` +
          `<ul><li>Reference: ${escapeHtml(session.reference)}</li>` +
          `<li>Amount: NGN ${(session.amountKobo / 100).toFixed(2)}</li>` +
          `<li>Customer: ${escapeHtml(session.customerName)} (${escapeHtml(session.customerEmail)})</li></ul>`
      ).catch((e) => console.error("[Email] Refund failure notice failed:", e.message));
    }
  }
  return refunded;
}

async function existingOrder(session: CheckoutSession) {
  const order = session.orderId
    ? await prisma.order.findUnique({ where: { id: session.orderId }, select: { id: true, orderNumber: true, totalAmount: true, status: true } })
    : null;
  if (!order) throw new AppError("This checkout has already been processed.", 409);
  return order;
}

export type CompleteOutcome =
  | { kind: "created"; order: Awaited<ReturnType<typeof placeOrder>>["order"]; session: CheckoutSession }
  | { kind: "existing"; order: { id: string; orderNumber: string; totalAmount: number; status: OrderStatus } };

/**
 * Turns a paid, server-created checkout into an order. Safe to call again for the
 * same reference: a completed checkout returns its existing order. If the charge
 * succeeded but the order cannot be fulfilled (stock gone, price changed), the
 * payment is refunded.
 */
export async function completeCheckout(org: StoreOrg, reference: string, orgOwnerId: string): Promise<CompleteOutcome> {
  const session = await prisma.checkoutSession.findUnique({ where: { reference } });
  if (!session || session.organizationId !== org.id) {
    throw new AppError("Checkout not found.", 404);
  }
  if (session.status === "COMPLETED") {
    return { kind: "existing", order: await existingOrder(session) };
  }
  if (session.status !== "PENDING") {
    throw new AppError("This checkout was cancelled and the payment refunded or is being refunded. Please contact the store.", 409);
  }

  const transaction = await verifyPaystackTransaction(reference);
  if (!transaction || transaction.status !== "success" || transaction.reference !== reference) {
    throw new AppError("Payment not verified. Please complete payment before placing order.", 402);
  }
  if (transaction.currency !== session.currency || transaction.amountKobo !== session.amountKobo) {
    throw new AppError("Payment amount does not match order total. Please contact support.", 402);
  }

  try {
    const { order } = await placeOrder({
      organizationId: org.id,
      createdById: orgOwnerId,
      orderNumber: generateOrderNumber("STR"),
      lines: session.items as unknown as OrderLine[],
      customer: {
        kind: "find-or-create",
        name: session.customerName,
        email: session.customerEmail,
        phone: session.customerPhone ?? undefined,
        address: session.customerAddress ?? undefined,
        source: "PURCHASE",
      },
      status: OrderStatus.APPROVED,
      paymentMethod: "PAYSTACK",
      notes: session.notes,
      payment: { status: PaymentStatus.COMPLETED, reference },
      verifiedAmountKobo: session.amountKobo,
      onPlaced: async (tx, placed) => {
        const claimed = await tx.checkoutSession.updateMany({
          where: { id: session.id, status: "PENDING" },
          data: { status: "COMPLETED", orderId: placed.id },
        });
        if (claimed.count === 0) throw new AppError("This checkout has already been processed.", 409);
      },
    });
    return { kind: "created", order, session };
  } catch (err) {
    if (!(err instanceof AppError)) throw err;

    // A concurrent request for the same reference won the race: return its order.
    if (err.statusCode === 409) {
      const fresh = await prisma.checkoutSession.findUnique({ where: { id: session.id } });
      if (fresh?.status === "COMPLETED") return { kind: "existing", order: await existingOrder(fresh) };
      throw err;
    }

    // The customer has paid but the order cannot be fulfilled: give the money back.
    if (err.statusCode === 400 || err.statusCode === 402) {
      const refunded = await refundFailedCheckout(session, org, err.message);
      throw new AppError(
        refunded
          ? `${err.message} Your payment has been refunded.`
          : `${err.message} We could not refund you automatically. The store has been notified, please contact them quoting ${reference}.`,
        409
      );
    }
    throw err;
  }
}
