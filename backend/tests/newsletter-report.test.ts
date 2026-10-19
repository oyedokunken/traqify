import prisma from "../src/config/database";
import { buildReportData } from "../src/controllers/report.controller";
import { createOrganization, createTenant } from "./helpers/factories";

describe("newsletter report is scoped to the organization", () => {
  it("never includes another organization's subscribers", async () => {
    const { org } = await createTenant();
    const other = await createOrganization();
    await prisma.newsletterSubscriber.createMany({
      data: [
        { email: "mine@example.com", organizationId: org.id },
        { email: "theirs@example.com", organizationId: other.id },
        { email: "orphan@example.com", organizationId: null },
      ],
    });

    const rows = (await buildReportData("newsletter", org.id, new Date(0), new Date())) as { email: string }[];

    expect(rows.map((r) => r.email)).toEqual(["mine@example.com"]);
  });
});
