import type { CurrencyCode, Money } from "../models";

const MINOR_DIGITS: Record<CurrencyCode, number> = { AMD: 2, USD: 2, EUR: 2, GBP: 2 };
export function minorDigits(currency: CurrencyCode): number {
  return MINOR_DIGITS[currency];
}

/** Parse a user-entered decimal string exactly into integer minor units. */
export function parseMoney(value: string, currency: CurrencyCode): number | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  const digits = minorDigits(currency);
  const fraction = match[2] || "";
  if (fraction.length > digits) return null;
  const whole = Number(match[1]);
  const minor = Number((fraction + "0".repeat(digits)).slice(0, digits) || "0");
  const amount = whole * 10 ** digits + minor;
  return Number.isSafeInteger(amount) ? amount : null;
}

export function formatMoney(money: Money, locale?: string): string {
  const amount = money.amountMinor / 10 ** minorDigits(money.currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: minorDigits(money.currency),
  }).format(amount);
}

export function addMinorUnits(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result))
    throw new RangeError("Money total exceeds the safe integer range.");
  return result;
}
