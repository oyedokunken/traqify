/**
 * One-off backfill: creates a payment record for legacy approved or completed orders
 * that have none. This used to run on every GET /api/payments; it now runs only when
 * an operator asks for it.
 *
 *   npx tsx scripts/backfill-payments.ts            dry run, prints what would change
 *   npx tsx scripts/backfill-payments.ts --apply    writes the records
 *
 * It uses DATABASE_URL from the environment, so point it at the right database first.
 */
import "../src/config/load-env";
import prisma from "../src/config/database";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  const orders = await prisma.order.findMany({
    where: { payments: { none: {} }, status: { in: ["COMPLETED", "APPROVED"] } },
    select: { id: true, organizationId: true, totalAmount: true, paymentMethod: true, status: true },
  });

  console.log(`${orders.length} order(s) without a payment record.`);
  if (!apply) {
    console.log("Dry run. Re-run with --apply to create them.");
    return;
  }

  const result = await prisma.payment.createMany({
    data: orders.map((o) => ({
      amount: o.totalAmount,
      currency: "NGN",
      status: o.status === "COMPLETED" ? ("COMPLETED" as const) : ("PENDING" as const),
      method: o.paymentMethod || "TRANSFER",
      organizationId: o.organizationId,
      orderId: o.id,
    })),
  });
  console.log(`Created ${result.count} payment record(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
