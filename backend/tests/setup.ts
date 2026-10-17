import prisma from "../src/config/database";

// Email is an external boundary: never send real mail from tests.
jest.mock("../src/config/email", () => ({
  __esModule: true,
  default: {},
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

async function truncateAll(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
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
