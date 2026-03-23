/**
 * Compact display for vote/save counts (k / M).
 * Max 1 decimal; drops ".0" (1.0k → 1k).
 * Uses truncation to 1 decimal so e.g. 9999 → "9.9k" (not "10.0k").
 */
export function formatNumber(num: number): string {
  const n = Math.max(0, Math.floor(num));

  if (n < 1000) {
    return `${n}`;
  }

  if (n < 1_000_000) {
    const value = Math.floor((n / 1000) * 10) / 10;
    return `${stripIntegerDecimal(value)}k`;
  }

  const value = Math.floor((n / 1_000_000) * 10) / 10;
  return `${stripIntegerDecimal(value)}M`;
}

function stripIntegerDecimal(value: number): string {
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  const s = value.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
