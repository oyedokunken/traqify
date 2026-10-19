import prisma from "../src/config/database";

// Email is an external boundary: never send real mail from tests.
jest.mock("../src/config/email", () => ({
  __esModule: true,
  default: {},
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function truncateAll(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");

  // Handlers deliberately fire some writes (audit logs, emails) without awaiting them, so one can still be in
  // flight when the next test starts. Truncation then deadlocks with it; retrying lets the stray write finish.
  for (let attempt = 1; ; attempt++) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
      return;
    } catch (err) {
      if (attempt >= 5 || !String(err).includes("deadlock detected")) throw err;
      await sleep(100 * attempt);
    }
  }
}

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(() => {
  jest.clearAllMocks();
});
