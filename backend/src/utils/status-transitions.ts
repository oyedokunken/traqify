import { OrderStatus, PaymentStatus } from "@prisma/client";

/**
 * Legal status changes. Anything not listed is rejected, so for example a refunded
 * payment can never become completed again and a delivered order cannot be cancelled.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["APPROVED", "COMPLETED", "CANCELLED"],
  APPROVED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["COMPLETED", "FAILED"],
  COMPLETED: ["REFUNDED"],
  FAILED: ["PENDING"],
  REFUNDED: [],
};

export const canTransitionOrder = (from: OrderStatus, to: OrderStatus): boolean =>
  ORDER_TRANSITIONS[from].includes(to);

export const canTransitionPayment = (from: PaymentStatus, to: PaymentStatus): boolean =>
  PAYMENT_TRANSITIONS[from].includes(to);
