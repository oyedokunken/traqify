export type MockTransaction = { status: string; amount: number; currency: string; reference?: string };

export interface PaystackMockOptions {
  /** Transactions Paystack "knows about", keyed by reference. */
  transactions?: Record<string, MockTransaction>;
  initializeFails?: boolean;
  verifyThrows?: boolean;
  /** Whether Paystack accepts refund requests. Defaults to true. */
  refundOk?: boolean;
}

/**
 * Mocks Paystack at the HTTP boundary by replacing global fetch. Any other URL
 * fails the test, so nothing can reach the network by accident.
 */
export function mockPaystack(options: PaystackMockOptions = {}) {
  const transactions = options.transactions ?? {};
  const calls = {
    verify: [] as string[],
    initialize: [] as Record<string, unknown>[],
    refund: [] as Record<string, unknown>[],
  };

  const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

  const spy = jest.spyOn(global, "fetch").mockImplementation(async (input: string | URL | { url: string }, init?: RequestInit) => {
    const url = typeof input === "object" && "url" in input ? input.url : String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;

    if (method === "GET" && url.startsWith("https://api.paystack.co/transaction/verify/")) {
      if (options.verifyThrows) throw new Error("network down");
      const reference = decodeURIComponent(url.slice("https://api.paystack.co/transaction/verify/".length));
      calls.verify.push(reference);
      const tx = transactions[reference];
      return json(tx ? { status: true, data: { ...tx, reference: tx.reference ?? reference } } : { status: false, message: "Transaction reference not found" });
    }

    if (method === "POST" && url === "https://api.paystack.co/transaction/initialize") {
      calls.initialize.push(body);
      if (options.initializeFails) return json({ status: false, message: "Invalid key" });
      return json({
        status: true,
        data: {
          authorization_url: `https://checkout.paystack.com/${body.reference}`,
          access_code: `ac_${body.reference}`,
          reference: body.reference,
        },
      });
    }

    if (method === "POST" && url === "https://api.paystack.co/refund") {
      calls.refund.push(body);
      return json({ status: options.refundOk !== false });
    }

    throw new Error(`Unexpected network call in test: ${method} ${url}`);
  });

  return {
    spy,
    calls,
    /** Marks a reference as paid on the fake Paystack. */
    setTransaction(reference: string, tx: MockTransaction) {
      transactions[reference] = tx;
    },
  };
}
