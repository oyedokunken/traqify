import { describe, expect, it } from "vitest";
import { isOlderThan } from "../lib/refetch";

describe("isOlderThan", () => {
  it("is false for data that just loaded and true once it reaches the limit", () => {
    expect(isOlderThan(1_000, 60_000, 1_000)).toBe(false);
    expect(isOlderThan(1_000, 60_000, 60_999)).toBe(false);
    expect(isOlderThan(1_000, 60_000, 61_000)).toBe(true);
    expect(isOlderThan(1_000, 60_000, 500_000)).toBe(true);
  });
});
