/**
 * The Universal Health Plan Governance Board's five revenue models, October 2026 drafts.
 *
 * Every figure here is transcribed from the Board's draft legislative report
 * (dated 2026-10-13), its legislative brief, or the report's Appendix FR (draft
 * 2026-10-13, "expenditure-revenue-appendix"), which holds the bracket schedule
 * for each model. The one thing we infer is how the appendix's 2022-dollar
 * brackets are brought to 2026 (see INDEX_2022_TO_2026). When the Board revises
 * its models, this file is where the numbers change.
 *
 * RATES: all five models use the appendix's rates, which were set on one common
 * basis (2022 tax data, the same revenue for each). Model 3 uses 7.69%, the
 * unrounded figure from the report's Table R4; the appendix prints 7.7% and the
 * Board's examples need 7.69%. The report's summary table lists different
 * "maximum" rates for three models: 12.0% for Model 1 (the Legislative Revenue
 * Office's 2032 projection, which also raises the payroll tax to 9.89%) and 11.7% / 10.4% for
 * Models 4 and 5 (which match the AVERAGE rate paid by the top 1%, not the top
 * marginal rate). The Board's own example tables use the appendix rates.
 */
import {
  IndexFactor,
  PayrollRule,
  Proposal,
  PublishedFigures,
  Threshold,
  parseProposal,
} from '../proposal';

/** 200% of the 2026 federal poverty level, by household size (report Table R2). */
export const FPL_200: Readonly<Record<number, number>> = Object.freeze({
  1: 31_920,
  2: 43_280,
  3: 54_640,
  4: 66_000,
  5: 77_360,
});

/** 138% of the 2026 federal poverty level (report Table R2). Models 4 and 5. */
export const FPL_138: Readonly<Record<number, number>> = Object.freeze({
  1: 22_025,
  2: 29_863,
  3: 37_702,
  4: 45_540,
  5: 53_378,
});

/**
 * The appendix states dollar bracket boundaries in 2022 dollars and says they are
 * inflation adjusted, without giving a factor. Growth in the ONE-person poverty
 * level (13,590 to 15,960) is our inference: it reproduces the Board's 2026
 * examples, and the two-person ratio does not.
 */
export const INDEX_2022_TO_2026: IndexFactor = Object.freeze({
  from: 13_590,
  to: 15_960,
  basis:
    'Our inference, not a published factor: growth in the one-person federal poverty level, 2022 to 2026. It reproduces the examples in report Tables S1 to S4.',
});

const AT_200_FPL: Threshold = {
  bySize: FPL_200,
  source: 'Report Table R2, 200% of the 2026 federal poverty level',
};

const AT_138_FPL: Threshold = {
  bySize: FPL_138,
  source: 'Report Table R2, 138% of the 2026 federal poverty level',
};

/**
 * A bracket boundary the appendix states in 2022 dollars for a household of
 * one. It is twice as high for households of two or more.
 */
function dollars2022(single: number): Threshold {
  const joint = single * 2;
  return {
    bySize: { 1: single, 2: joint, 3: joint, 4: joint, 5: joint },
    index: INDEX_2022_TO_2026,
    source: 'Appendix FR, pages 31-35, in 2022 dollars',
  };
}

/** Payroll below this is untaxed in every model. */
export const PAYROLL_EXEMPT = 500_000;
/** Payroll above this is taxed at 14% in Models 2 to 5. */
export const PAYROLL_UPPER_TIER = 10_000_000;

const PAYROLL_SOURCE =
  'Report Table R4. Public employers: Appendix FR, "for public employers, the first dollar of payroll is subject to the highest EPT marginal rate" (report page 45).';

/** Model 1: one rate above the exemption. */
const ONE_TIER: PayrollRule = {
  summary: '9.6% of payroll above $500,000',
  tiers: [{ above: PAYROLL_EXEMPT, rate: 0.096 }],
  publicEmployer: 'top-rate-from-first-dollar',
  source: PAYROLL_SOURCE,
};

/** Models 2 to 5: a 14% tier above $10 million. */
const TWO_TIERS: PayrollRule = {
  summary: '9.6% above $500,000, 14% above $10 million',
  tiers: [
    { above: PAYROLL_EXEMPT, rate: 0.096 },
    { above: PAYROLL_UPPER_TIER, rate: 0.14 },
  ],
  publicEmployer: 'top-rate-from-first-dollar',
  source: PAYROLL_SOURCE,
};

const HOUSEHOLD_SOURCE = 'Appendix FR, pages 31-35; report Tables R3 and R4';
const PUBLISHED_SOURCE =
  'Report Tables R3, R4, R5 and R7; brief pages 8-9; combined rates from Appendix FR Figure AFR4Fi and report Table R8';

/** A board model: a proposal with the Board's published figures. */
export type BoardProposal = Proposal & { published: PublishedFigures };

/** Models 4 and 5 step up at these incomes; Model 4 stops one step short. */
const STEPS: readonly Threshold[] = [
  AT_138_FPL,
  AT_200_FPL,
  dollars2022(50_000),
  dollars2022(100_000),
  dollars2022(200_000),
];

function stepped(rates: readonly number[]) {
  return rates.map((rate, i) => ({ from: STEPS[i], rate }));
}

const TRANSCRIBED: readonly BoardProposal[] = [
  {
    id: 1,
    name: 'One rate, single payroll tier',
    blurb:
      "One household rate above the exemption and one payroll rate above $500,000, with the worker credit. The board calls it the simplest to explain and the least progressive, meaning it asks the least of high earners relative to the others.",
    household: {
      exemption: '200% FPL',
      brackets: [{ from: AT_200_FPL, rate: 0.135 }],
      creditShare: 0.5,
      source: HOUSEHOLD_SOURCE,
    },
    payroll: ONE_TIER,
    published: {
      reportRate: 0.12,
      returnsOwingNothing: 0.545,
      middleFifthRate: 0.02,
      top1Share: 0.307,
      combinedByFifth: [0.076, 0.061, 0.081, 0.104, 0.135],
      source: PUBLISHED_SOURCE,
    },
  },
  {
    id: 2,
    name: 'One rate, two payroll tiers',
    blurb:
      "Model 1 plus a 14% payroll tier above $10 million, which Models 3 to 5 share. More comes from the largest payrolls, so the household rate is lower.",
    household: {
      exemption: '200% FPL',
      brackets: [{ from: AT_200_FPL, rate: 0.1205 }],
      creditShare: 0.5,
      source: HOUSEHOLD_SOURCE,
    },
    payroll: TWO_TIERS,
    published: {
      returnsOwingNothing: 0.604,
      middleFifthRate: 0.011,
      top1Share: 0.339,
      combinedByFifth: [0.097, 0.078, 0.089, 0.105, 0.13],
      source: PUBLISHED_SOURCE,
    },
  },
  {
    id: 3,
    name: 'One rate, no credit',
    blurb:
      "Model 2 without the worker credit. The household rate is the lowest of the five, but more households pay it than under Models 1 and 2, and the middle fifth pays the most of any model.",
    household: {
      exemption: '200% FPL',
      brackets: [{ from: AT_200_FPL, rate: 0.0769 }],
      creditShare: 0,
      source: HOUSEHOLD_SOURCE,
    },
    payroll: TWO_TIERS,
    published: {
      returnsOwingNothing: 0.403,
      middleFifthRate: 0.025,
      top1Share: 0.253,
      combinedByFifth: [0.097, 0.081, 0.104, 0.114, 0.122],
      source: PUBLISHED_SOURCE,
    },
  },
  {
    id: 4,
    name: 'Stepped rates, worker credit',
    blurb:
      "The contribution starts at a lower income and rises in steps to the highest top rate of the five, with the worker credit. The most filers owe nothing, and the top 1% carry the largest share.",
    household: {
      exemption: '138% FPL',
      brackets: stepped([0.03, 0.09, 0.12, 0.143]),
      creditShare: 0.5,
      source: HOUSEHOLD_SOURCE,
    },
    payroll: TWO_TIERS,
    published: {
      reportRate: 0.117,
      returnsOwingNothing: 0.649,
      middleFifthRate: 0.008,
      top1Share: 0.399,
      combinedByFifth: [0.097, 0.078, 0.086, 0.097, 0.135],
      source: PUBLISHED_SOURCE,
    },
  },
  {
    id: 5,
    name: 'Stepped rates, no credit',
    blurb:
      "Five rates above the lower exemption, and no worker credit. The board calls it the most progressive and the most complicated. About 7 in 10 filers would pay something.",
    household: {
      exemption: '138% FPL',
      brackets: stepped([0.02, 0.0478, 0.07, 0.09, 0.12]),
      creditShare: 0,
      source: HOUSEHOLD_SOURCE,
    },
    payroll: TWO_TIERS,
    published: {
      reportRate: 0.104,
      returnsOwingNothing: 0.312,
      middleFifthRate: 0.02,
      top1Share: 0.356,
      combinedByFifth: [0.097, 0.082, 0.099, 0.104, 0.128],
      source: PUBLISHED_SOURCE,
    },
  },
];

/**
 * The Board's five models, checked against the schema and frozen. A
 * transcription slip that breaks the schema fails here, at load, not in a
 * result. The names and blurbs are OURS; the Board only numbers its models.
 */
export const BOARD_PROPOSALS: readonly BoardProposal[] = Object.freeze(
  TRANSCRIBED.map((proposal) => parseProposal<BoardProposal>(proposal)),
);
