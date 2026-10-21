import prisma from "../src/config/database";
import { authed, createTenant } from "./helpers/factories";

// Each database round trip costs time on a serverless deployment, so the dashboard endpoints are held to a budget:
// one lookup to authenticate the caller plus a single query for the data itself.
const operations: string[] = [];
let counting = false;

beforeAll(() => {
  prisma.$use(async (params, next) => {
    if (counting) operations.push(`${params.model ?? "raw"}.${params.action}`);
    return next(params);
  });
});

async function countOperations(path: string): Promise<string[]> {
  const { owner } = await createTenant();
  operations.length = 0;
  counting = true;
  const res = await authed(owner).get(path);
  counting = false;
  expect(res.status).toBe(200);
  return [...operations];
}

describe("dashboard endpoints use few database round trips", () => {
  it("overview: authentication plus one query", async () => {
    const ops = await countOperations("/api/reports/overview");
    expect(ops.length).toBeLessThanOrEqual(2);
  });

  it("revenue chart: authentication plus one query", async () => {
    const ops = await countOperations("/api/reports/revenue-chart?period=30");
    expect(ops.length).toBeLessThanOrEqual(2);
  });

  it("customer chart: authentication plus one query", async () => {
    const ops = await countOperations("/api/reports/customer-chart?period=30");
    expect(ops.length).toBeLessThanOrEqual(2);
  });

  it("unread count: authentication plus one query", async () => {
    const ops = await countOperations("/api/audit/unread-count");
    expect(ops.length).toBeLessThanOrEqual(2);
  });
});

describe("chart periods are bounded", () => {
  it.each([["abc"], ["-5"], ["0"], ["1e9"], ["99999999"], [""]])("period=%p falls back to a sane window instead of looping", async (period) => {
    const { owner } = await createTenant();
    const res = await authed(owner).get(`/api/reports/revenue-chart?period=${period}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.length).toBeLessThanOrEqual(365);
  });

  it("accepts the supported windows exactly", async () => {
    const { owner } = await createTenant();
    for (const days of [7, 30, 60, 90]) {
      const res = await authed(owner).get(`/api/reports/customer-chart?period=${days}`);
      expect(res.body).toHaveLength(days);
    }
  });
});
