import { authed, createTenant } from "./helpers/factories";
import { sentMail } from "./helpers/mail";

describe("emailing a report", () => {
  it.each([[""], ["not-an-email"], ["a@b.com, c@d.com"], [undefined]])("rejects recipient %p", async (to) => {
    const { owner } = await createTenant();
    const res = await authed(owner).post("/api/reports/products/email").send({ to });
    expect(res.status).toBe(400);
    expect(sentMail()).toHaveLength(0);
  });

  it("rejects a malformed date range", async () => {
    const { owner } = await createTenant();
    const res = await authed(owner).post("/api/reports/orders/email").send({ to: "accountant@example.com", from: "yesterday-ish" });
    expect(res.status).toBe(400);
  });

  it("sends the report to a valid recipient", async () => {
    const { owner } = await createTenant();
    const res = await authed(owner).post("/api/reports/products/email").send({ to: "accountant@example.com" });
    expect(res.status).toBe(200);
    expect(sentMail().some((m) => m.to === "accountant@example.com")).toBe(true);
  });

  it("is not available to cashiers", async () => {
    const { cashier } = await createTenant();
    expect((await authed(cashier).post("/api/reports/products/email").send({ to: "a@example.com" })).status).toBe(403);
  });
});
