import { describe, expect, it } from "vitest";
import { needsWelcome } from "../lib/welcome";

describe("needsWelcome", () => {
  it("greets a user the server says has not seen it, once they have a workspace", () => {
    expect(needsWelcome({ organizationId: "org1", welcomeSeen: false })).toBe(true);
  });

  it("does not greet someone the server says has seen it, whatever this browser remembers", () => {
    expect(needsWelcome({ organizationId: "org1", welcomeSeen: true })).toBe(false);
  });

  it("does not guess when the server has not said, such as a profile cached before this flag existed", () => {
    expect(needsWelcome({ organizationId: "org1" })).toBe(false);
  });

  it("waits until there is a workspace to be welcomed to", () => {
    expect(needsWelcome({ organizationId: null, welcomeSeen: false })).toBe(false);
    expect(needsWelcome(null)).toBe(false);
  });
});
