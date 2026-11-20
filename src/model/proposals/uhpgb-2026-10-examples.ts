/**
 * The Board's own worked examples, October 2026 drafts: what a household pays
 * today and would pay under each of the five models. The engine is tested
 * against these (see ../uhp-model.spec.ts), each cell within $4.
 */
export interface ScenarioRow {
  income: number;
  /** Wages the board's employer-tax figures imply, where an employer pays. */
  wages?: number;
  /** What the household pays today, per the board. */
  now: number;
  /** What the household would pay under Models 1 to 5. */
  models: readonly [number, number, number, number, number];
}

export interface Scenario {
  id: string;
  tab: string;
  who: string;
  today: string;
  rows: readonly ScenarioRow[];
}

/** Report Tables S1 to S4 (pages 43-47), household-pays rows, verbatim. */
export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'self',
    tab: 'Self-employed',
    who: 'One 45-year-old, self-employed or at a small firm, buying their own insurance.',
    today:
      "Today: a silver marketplace plan at a 45-year-old's price, after subsidies, plus out-of-pocket costs. Older buyers pay more than this today. If you are uninsured, your cost today is whatever you pay for care.",
    rows: [
      { income: 20_000, now: 0, models: [0, 0, 0, 0, 0] },
      { income: 45_000, now: 5_211, models: [1_766, 1_576, 1_006, 1_474, 823] },
      { income: 90_000, now: 6_900, models: [7_841, 6_999, 4_466, 6_462, 3_699] },
      { income: 180_000, now: 6_900, models: [19_991, 17_844, 11_387, 18_701, 11_220] },
    ],
  },
  {
    id: 'private',
    tab: 'Private employer',
    who: 'A household of two, insured through a private employer with an $8.5 million payroll.',
    today:
      'Today: $2,900 in premiums and $1,800 out of pocket. The employer pays another $16,700.',
    rows: [
      { income: 40_000, wages: 40_000, now: 0, models: [0, 0, 0, 0, 203] },
      { income: 85_000, wages: 80_000, now: 4_700, models: [2_032, 1_427, 3_208, 557, 2_263] },
      { income: 110_000, wages: 100_000, now: 4_700, models: [4_507, 3_540, 5_131, 1_907, 3_458] },
      { income: 170_000, wages: 150_000, now: 4_700, models: [10_357, 8_520, 9_745, 6_634, 7_492] },
      { income: 220_000, wages: 200_000, now: 4_700, models: [14_857, 12_295, 13_590, 10_384, 10_992] },
    ],
  },
  {
    id: 'public',
    tab: 'Public employer',
    who: 'One person working for a public employer.',
    today: 'Today: $120 in premiums and $500 out of pocket. The employer pays another $12,000.',
    rows: [
      { income: 40_000, wages: 40_000, now: 620, models: [0, 0, 621, 0, 581] },
      { income: 51_000, wages: 50_000, now: 620, models: [176, 0, 1_467, 0, 1_110] },
      { income: 66_000, wages: 64_000, now: 620, models: [1_529, 0, 2_621, 0, 1_989] },
      { income: 85_000, wages: 80_000, now: 620, models: [3_326, 796, 4_082, 262, 3_319] },
      { income: 110_000, wages: 100_000, now: 620, models: [5_741, 2_409, 6_004, 1_862, 5_069] },
    ],
  },
  {
    id: 'medicare',
    tab: 'On Medicare',
    who: 'A household of two on Medicare, living on Social Security and other non-wage income.',
    today: 'Today: $4,800 in Medicare Part B premiums and $4,800 out of pocket.',
    rows: [
      { income: 45_000, now: 9_600, models: [232, 207, 132, 557, 351] },
      { income: 75_000, now: 9_600, models: [4_282, 3_822, 2_439, 3_257, 1_785] },
      { income: 112_500, now: 9_600, models: [9_345, 8_341, 5_323, 6_632, 3_577] },
      { income: 162_000, now: 9_600, models: [16_027, 14_306, 9_130, 12_424, 6_932] },
      { income: 215_000, now: 9_600, models: [23_182, 20_692, 13_205, 18_784, 10_642] },
    ],
  },
];
