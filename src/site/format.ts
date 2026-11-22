/**
 * How the explainer page writes numbers. Shared by the figures in the prose
 * (figures.ts) and the prerendered tables and charts (blocks.ts).
 */
const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** "$4,700" */
export function usd(value: number): string {
  return USD.format(Math.round(value));
}

/** Dollars rounded to the nearest hundred. */
export function usd100(dollars: number): string {
  return USD.format(Math.round(dollars / 100) * 100);
}

/** "13.5%", "12%": up to `digits` decimals, trailing zeros dropped. */
export function pct(value: number, digits = 1): string {
  return `${Number((value * 100).toFixed(digits))}%`;
}

/** Always one decimal, so 9.0% sits beside 9.4% without looking like a different kind of number. */
export function pct1(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** "$78.3B" */
export function bn(billions: number): string {
  return `$${billions.toFixed(1)}B`;
}

/** "+$7.2B" or "−$1.3B", with a real minus sign. */
export function signed(billions: number): string {
  return `${billions < 0 ? '−' : '+'}$${Math.abs(billions).toFixed(1)}B`;
}

/** "$7.2B more" or "$0.6B less". */
export function moreLess(billions: number): string {
  return `$${Math.abs(billions).toFixed(1)}B ${billions < 0 ? 'less' : 'more'}`;
}
