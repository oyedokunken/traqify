import { addMoney, fromMinor, lineTotal, roundMoney, sumMoney, toMinor, isValidMoney } from "../src/utils/money";

describe("money utility", () => {
  it("converts naira to kobo without float drift", () => {
    expect(toMinor(19.99)).toBe(1999);
    expect(toMinor(0.1 + 0.2)).toBe(30);
    expect(toMinor(1500.5)).toBe(150050);
  });

  it("converts kobo back to naira", () => {
    expect(fromMinor(1999)).toBe(19.99);
    expect(fromMinor(150050)).toBe(1500.5);
  });

  it("rounds to two decimals", () => {
    expect(roundMoney(10.004)).toBe(10);
    expect(roundMoney(10.006)).toBe(10.01);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it("computes line totals and sums exactly", () => {
    expect(lineTotal(19.99, 3)).toBe(59.97);
    expect(sumMoney([0.1, 0.2, 0.3])).toBe(0.6);
    expect(addMoney(0.1, 0.2)).toBe(0.3);
  });

  it("validates money amounts", () => {
    expect(isValidMoney(10)).toBe(true);
    expect(isValidMoney(0)).toBe(false);
    expect(isValidMoney(-1)).toBe(false);
    expect(isValidMoney(Number.NaN)).toBe(false);
    expect(isValidMoney(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
