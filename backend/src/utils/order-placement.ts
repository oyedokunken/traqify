import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { lineTotal, sumMoney, toMinor } from "./money";

export interface OrderLine {
  productId: string;
  quantity: number;
}

export type CustomerInput =
  | { kind: "existing"; id: string }
  | { kind: "find-or-create"; name: string; email: string | null; phone?: string; address?: string; source: "MANUAL" | "PURCHASE" };

export interface PlaceOrderInput {
  organizationId: string;
  createdById: string;
  orderNumber: string;
  lines: OrderLine[];
  customer: CustomerInput | null;
  status: OrderStatus;
  paymentMethod: string;
  notes?: string | null;
  payment: { status: PaymentStatus; reference?: string | null };
  /** When set, the server-computed total must equal this amount (in kobo) or nothing is written. */
  verifiedAmountKobo?: number;
  /** Runs inside the transaction after the order exists; throwing rolls everything back. */
  onPlaced?: (tx: Prisma.TransactionClient, order: { id: string }) => Promise<void>;
}

type Tx = Prisma.TransactionClient;

async function priceLines(tx: Tx, organizationId: string, lines: OrderLine[]) {
  const products = await tx.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) }, organizationId, isActive: true },
    select: { id: true, name: true, price: true },
  });
  if (products.length !== lines.length) {
    throw new AppError("One or more products were not found or are inactive.", 400);
  }
  const priced = lines.map((line) => {
    const product = products.find((p) => p.id === line.productId)!;
    return {
      productId: product.id,
      name: product.name,
      quantity: line.quantity,
      unitPrice: product.price,
      subtotal: lineTotal(product.price, line.quantity),
    };
  });
  return { priced, total: sumMoney(priced.map((p) => p.subtotal)) };
}

/**
 * Prices an order from current database prices and checks that every line is in
 * stock, without writing anything. Used to fail early, before a customer is
 * asked to pay; placeOrder repeats both checks atomically.
 */
export async function quoteOrder(organizationId: string, lines: OrderLine[]): Promise<{ total: number }> {
  const { priced, total } = await priceLines(prisma, organizationId, lines);
  const stock = await prisma.inventory.findMany({
    where: { productId: { in: priced.map((p) => p.productId) } },
    select: { productId: true, quantity: true },
  });
  for (const line of priced) {
    const available = stock.find((s) => s.productId === line.productId)?.quantity ?? 0;
    if (available < line.quantity) {
      throw new AppError(`Insufficient stock for "${line.name}".`, 400);
    }
  }
  return { total };
}

async function resolveCustomer(
  tx: Tx,
  organizationId: string,
  customer: CustomerInput | null
): Promise<{ id?: string; created: boolean }> {
  if (!customer) return { created: false };
  if (customer.kind === "existing") {
    const found = await tx.customer.findFirst({ where: { id: customer.id, organizationId }, select: { id: true } });
    if (!found) throw new AppError("Customer not found.", 400);
    return { id: found.id, created: false };
  }
  const existing = customer.email
    ? await tx.customer.findFirst({ where: { email: customer.email, organizationId }, select: { id: true } })
    : null;
  if (existing) return { id: existing.id, created: false };
  const created = await tx.customer.create({
    data: {
      name: customer.name,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      address: customer.address || undefined,
      organizationId,
      source: customer.source,
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

function isReferenceConflict(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return false;
  const target = err.meta?.target;
  return Array.isArray(target) ? target.includes("reference") : String(target ?? "").includes("reference");
}

/**
 * Places an order atomically: price from the database, decrement stock with a
 * conditional update, then write customer, order and payment. Any failure rolls
 * back every write, including the stock decrement.
 */
export async function placeOrder(input: PlaceOrderInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const { priced, total } = await priceLines(tx, input.organizationId, input.lines);

      if (input.verifiedAmountKobo !== undefined && toMinor(total) !== input.verifiedAmountKobo) {
        throw new AppError("Payment amount does not match order total. Please contact support.", 402);
      }

      for (const line of priced) {
        const result = await tx.inventory.updateMany({
          where: {
            productId: line.productId,
            quantity: { gte: line.quantity },
            product: { organizationId: input.organizationId },
          },
          data: { quantity: { decrement: line.quantity } },
        });
        if (result.count === 0) {
          throw new AppError(`Insufficient stock for "${line.name}".`, 400);
        }
      }

      const customer = await resolveCustomer(tx, input.organizationId, input.customer);

      const order = await tx.order.create({
        data: {
          orderNumber: input.orderNumber,
          organizationId: input.organizationId,
          createdById: input.createdById,
          customerId: customer.id,
          notes: input.notes || null,
          paymentMethod: input.paymentMethod,
          totalAmount: total,
          status: input.status,
          orderItems: {
            create: priced.map((p) => ({
              productId: p.productId,
              quantity: p.quantity,
              unitPrice: p.unitPrice,
              subtotal: p.subtotal,
            })),
          },
        },
        include: {
          orderItems: { include: { product: true } },
          customer: true,
        },
      });

      await tx.payment.create({
        data: {
          amount: total,
          currency: "NGN",
          status: input.payment.status,
          method: input.paymentMethod,
          reference: input.payment.reference || null,
          organizationId: input.organizationId,
          orderId: order.id,
        },
      });

      if (input.onPlaced) await input.onPlaced(tx, order);

      return { order, customerCreated: customer.created };
    });
  } catch (err) {
    if (isReferenceConflict(err)) {
      throw new AppError("This payment reference has already been used.", 409);
    }
    throw err;
  }
}
