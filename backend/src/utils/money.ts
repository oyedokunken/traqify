/**
 * All money arithmetic lives here. Amounts are naira with at most two decimals;
 * calculations run on integer minor units (kobo) so floating point error cannot
 * leak into totals. Paystack also works in kobo, so the same conversion is used
 * when comparing against a verified payment.
 *
 * Keeping every conversion in one module means a future move of the stored
 * representation (Decimal or integer kobo) only has to change this file.
 */

export const toMinor = (amount: number): number => Math.round(amount * 100);

export const fromMinor = (minor: number): number => minor / 100;

export const roundMoney = (amount: number): number => fromMinor(toMinor(amount));

export const addMoney = (a: number, b: number): number => fromMinor(toMinor(a) + toMinor(b));

export const sumMoney = (amounts: number[]): number =>
  fromMinor(amounts.reduce((sum, amount) => sum + toMinor(amount), 0));

export const lineTotal = (unitPrice: number, quantity: number): number =>
  fromMinor(toMinor(unitPrice) * quantity);

/** A usable money amount is a finite number greater than zero. */
export const isValidMoney = (amount: unknown): amount is number =>
  typeof amount === "number" && Number.isFinite(amount) && amount > 0;
