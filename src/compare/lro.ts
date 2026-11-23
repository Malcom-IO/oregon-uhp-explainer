/**
 * The Legislative Revenue Office's preliminary 2032 revenue projections for the five
 * models, $ billions. Revised legislative brief dated October 22, 2026, posted with the
 * October 29 meeting materials, printed page 10, "Legislative Revenue Office 2032
 * Revenue Projections". This brief is later than the October 15 brief in the source
 * snapshot; SOURCES.md lists it separately. The LRO calls it a high-level preliminary,
 * static estimate, with no behavioral response and the tax base not adjusted.
 *
 * The brief does not say which rates each model uses. Model 1's $15.5B payroll tax
 * works out to 9.89%, the rate in report Table R1, not the 9.6% of the draft schedule:
 * that reading is ours.
 */
export interface Projection {
  /** Household health care contribution. */
  hhcc: number;
  /** Employer payroll tax. */
  ept: number;
  /** Corporate income and excise tax, corporate activity tax and lodging tax add-ons together. */
  business: number;
  /** The brief's printed total. */
  total: number;
}

export const LRO_2032: Readonly<Record<number, Projection>> = Object.freeze({
  1: { hhcc: 15.3, ept: 15.5, business: 1.15 + 0.39 + 0.01, total: 32.35 },
  2: { hhcc: 14.0, ept: 19.2, business: 1.15 + 0.39, total: 34.74 },
  3: { hhcc: 14.1, ept: 19.2, business: 1.15 + 0.39, total: 34.84 },
  4: { hhcc: 14.1, ept: 19.2, business: 1.15 + 0.39, total: 34.84 },
  5: { hhcc: 14.1, ept: 19.2, business: 1.15 + 0.39, total: 34.84 },
});
