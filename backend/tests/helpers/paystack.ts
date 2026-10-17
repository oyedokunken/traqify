type PaystackData = { status: string; amount: number; currency: string; reference: string };

/**
 * Mocks the Paystack verify endpoint at the HTTP boundary by replacing global fetch.
 * Any other URL fails the test so nothing can reach the network by accident.
 */
export function mockPaystack(data: Partial<PaystackData> & { reference: string }, httpOk = true) {
  const body = {
    status: httpOk,
    message: "Verification successful",
    data: { status: "success", currency: "NGN", amount: 0, ...data },
  };
  return jest.spyOn(global, "fetch").mockImplementation(async (input: string | URL | { url: string }) => {
    const url = typeof input === "object" && "url" in input ? input.url : String(input);
    if (!url.startsWith("https://api.paystack.co/transaction/verify/")) {
      throw new Error(`Unexpected network call in test: ${url}`);
    }
    return { ok: true, status: 200, json: async () => body } as Response;
  });
}
