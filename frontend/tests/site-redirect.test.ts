import { describe, expect, it } from "vitest";
import nextConfig from "../next.config.mjs";
import { SITE_URL } from "../lib/site";

describe("the old address redirects to the new domain", () => {
  it("has one permanent redirect, from every path on traqify.vercel.app to the same path on the site URL", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];

    expect(redirects).toHaveLength(1);
    expect(redirects[0]).toMatchObject({
      source: "/:path*",
      has: [{ type: "host", value: "traqify.vercel.app" }],
      destination: `${SITE_URL}/:path*`,
      permanent: true,
    });
  });

  it("only matches the old host, so the new domain, previews and local development are never redirected", async () => {
    const [rule] = (await nextConfig.redirects?.()) ?? [];
    const hosts = (rule.has ?? []).map((condition) => ("value" in condition ? condition.value : undefined));

    expect(hosts).toEqual(["traqify.vercel.app"]);
    expect(SITE_URL).toBe("https://traqify.oyedokun.dev");
  });
});
