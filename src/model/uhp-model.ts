/**
 * The calculation engine behind the Oregon Universal Health Plan explainer.
 *
 * The engine holds no rates, thresholds or tiers of its own. It computes from a
 * proposal (see proposal.ts for what one can express), and the Board's five
 * models are data in proposals/uhpgb-2026-10.ts, each figure with its source.
 * The Board's worked examples in proposals/uhpgb-2026-10-examples.ts are what
 * the engine is tested against (see uhp-model.spec.ts).
 *
 * Framework-free, with no dependencies.
 */
import { Proposal, ProposalId, PublishedFigures, thresholdFor } from './proposal';
import { BOARD_PROPOSALS, BoardProposal } from './proposals/uhpgb-2026-10';

export { FPL_138, FPL_200, PAYROLL_EXEMPT, PAYROLL_UPPER_TIER } from './proposals/uhpgb-2026-10';
export { SCENARIOS } from './proposals/uhpgb-2026-10-examples';
export type { Scenario, ScenarioRow } from './proposals/uhpgb-2026-10-examples';

/** The Board numbers its models 1 to 5; any other proposal brings its own ID. */
export type ModelId = ProposalId;

/**
 * A board model as the explainer reads it: the proposal itself, plus its
 * headline figures laid flat. The flat fields are derived from the proposal
 * and the Board's published figures, never stated twice.
 */
export interface RevenueModel extends Proposal {
  /** Employer payroll tax tiers, in plain words. */
  employerTax: string;
  /** Share of the employer's payroll tax on your wages credited back to you. */
  creditShare: number;
  /** Income exempt from the household contribution, as a share of FPL. */
  exemption: string;
  /** Number of brackets, counting the exempt one. */
  brackets: number;
  /** Top marginal household rate (appendix). For two-bracket models, the only rate. */
  topRate: number;
  /** The "maximum" rate the report's summary table lists, where it differs. */
  reportRate?: number;
  /** Marginal rates above the exemption, lowest first. */
  rates: readonly number[];
  /** Share of Oregon tax returns that would owe no household contribution. */
  returnsOwingNothing: number;
  /** Average net household contribution rate for the middle fifth of incomes. */
  middleFifthRate: number;
  /** Share of all household contributions paid by the top 1% of incomes (Table R5). */
  top1Share: number;
  /** Income exempt for a family of four, in dollars (Table R2). */
  exemptFamilyOf4: number;
  /**
   * Average COMBINED rate (household contribution plus the employer payroll tax
   * attributed to wages) for each fifth of incomes, lowest first
   * (Appendix FR Figure AFR4Fi; report Table R8).
   */
  combinedByFifth: PublishedFigures['combinedByFifth'];
}

function revenueModel(proposal: BoardProposal): RevenueModel {
  const { household, payroll, published } = proposal;
  const rates = Object.freeze(household.brackets.map((b) => b.rate));
  const model: RevenueModel = {
    ...proposal,
    employerTax: payroll.summary,
    creditShare: household.creditShare,
    exemption: household.exemption,
    brackets: rates.length + 1,
    topRate: rates[rates.length - 1],
    rates,
    returnsOwingNothing: published.returnsOwingNothing,
    middleFifthRate: published.middleFifthRate,
    top1Share: published.top1Share,
    exemptFamilyOf4: thresholdFor(household.brackets[0].from, 4),
    combinedByFifth: published.combinedByFifth,
  };
  if (published.reportRate !== undefined) model.reportRate = published.reportRate;
  return Object.freeze(model);
}

/** The Board's five models (report Tables R3, R4 and R7; brief pages 8-9). */
export const MODELS: readonly RevenueModel[] = Object.freeze(BOARD_PROPOSALS.map(revenueModel));

/** A proposal, or the ID of one of the Board's models. */
export type ProposalRef = Proposal | ProposalId;

function resolve(ref: ProposalRef): Proposal {
  if (typeof ref === 'object') return ref;
  const model = MODELS.find((m) => m.id === ref);
  if (!model) throw new RangeError(`No board model with ID ${JSON.stringify(ref)}.`);
  return model;
}

/**
 * Who pays the household's wages. It decides the payroll tax an employer would
 * owe on those wages, which is what the worker credit is based on.
 */
export type EmployerKind = 'none' | 'private' | 'public';

export interface EmployerOption {
  kind: EmployerKind;
  label: string;
}

export const EMPLOYERS: readonly EmployerOption[] = [
  { kind: 'private', label: 'A private employer' },
  { kind: 'public', label: 'A public employer (state, city, school district, university)' },
  { kind: 'none', label: 'Self-employed, or no wages' },
];

/**
 * Employer payroll tax on a year's payroll. Marginal: each tier's rate applies
 * only to the payroll inside that tier, and payroll below the first tier is
 * untaxed, so there is no cliff (Appendix FR: rates are marginal "to avoid
 * fiscal cliffs").
 */
export function payrollTax(payroll: number, model: ProposalRef): number {
  const { tiers } = resolve(model).payroll;
  let total = 0;
  tiers.forEach((tier, i) => {
    const top = tiers[i + 1]?.above ?? Infinity;
    total += Math.max(0, Math.min(payroll, top) - tier.above) * tier.rate;
  });
  return total;
}

/**
 * Effective employer payroll tax rate on a worker's wages.
 *
 * Private: the firm's tax divided by its payroll. At the Board's $8.5 million
 * example this is 9.04%, which the report rounds to 9.0%.
 * Public: what the proposal's public-employer rule says. Under the Board's
 * models that is the highest tier rate from the first dollar: 9.6% in Model 1
 * and 14% in the others.
 *
 * `payroll` is the employer's total yearly payroll. It is needed whenever the
 * rate depends on it: always for a private employer, and for a public one
 * under the `same-as-private` rule. Left out, it is taken as zero, and an
 * employer with no payroll owes no tax, so the rate is 0 and there is no
 * worker credit. A calculator should ask for it, not default it.
 */
export function employerRate(kind: EmployerKind, model: ProposalRef, payroll = 0): number {
  if (kind === 'none') return 0;
  const proposal = resolve(model);
  if (kind === 'public' && proposal.payroll.publicEmployer === 'top-rate-from-first-dollar') {
    return Math.max(0, ...proposal.payroll.tiers.map((t) => t.rate));
  }
  return payroll > 0 ? payrollTax(payroll, proposal) / payroll : 0;
}

export interface BillInput {
  /** Household adjusted gross income. */
  income: number;
  /** The part of that income that is wages from the employer above. */
  wages: number;
  /** Household size, 1 to 5. */
  size: number;
  /** Income exempt from the contribution. */
  exemption: number;
  /** Household contribution rate on income above the exemption. */
  rate: number;
  /** Share of the employer's payroll tax credited to the household. */
  creditShare: number;
  /** Employer payroll tax rate on the wages. */
  employerRate: number;
}

/**
 * Household health care contribution for a two-bracket model:
 * rate x (income above the exemption), less the credit, never below zero.
 */
export function householdContribution(input: Omit<BillInput, 'size'>): number {
  const gross = Math.max(0, input.income - input.exemption) * input.rate;
  const credit = input.creditShare * input.employerRate * Math.max(0, input.wages);
  return Math.max(0, gross - credit);
}

export interface Bracket {
  /** Income at which this marginal rate starts, in current dollars. */
  from: number;
  rate: number;
}

/**
 * The household contribution schedule for a proposal and household size: where
 * each marginal rate starts, lowest first. Throws a RangeError for a household
 * size the proposal gives no thresholds for.
 */
export function schedule(model: Proposal, size: number): Bracket[] {
  return model.household.brackets.map((b) => ({ from: thresholdFor(b.from, size), rate: b.rate }));
}

/** Contribution before any credit: each slice of income taxed at its own rate. */
export function grossContribution(income: number, brackets: readonly Bracket[]): number {
  let total = 0;
  brackets.forEach((b, i) => {
    const top = brackets[i + 1]?.from ?? Infinity;
    total += Math.max(0, Math.min(income, top) - b.from) * b.rate;
  });
  return total;
}

/**
 * What a household owes: the gross contribution less the worker credit, never
 * below zero. Negative wages earn no credit, so a loss never raises the bill.
 */
export function contribution(
  model: Proposal,
  income: number,
  wages: number,
  size: number,
  employerTaxRate: number,
): number {
  const gross = grossContribution(income, schedule(model, size));
  const credit = model.household.creditShare * employerTaxRate * Math.max(0, wages);
  return Math.max(0, gross - credit);
}

export interface Bill<P extends Proposal = RevenueModel> {
  model: P;
  /** What the household would owe per year. */
  household: number;
  /** The contribution before the worker credit. */
  gross: number;
  /** The worker credit actually used (never more than the gross contribution). */
  credit: number;
  /** What the employer would pay in payroll tax on this household's wages. */
  employer: number;
}

/**
 * A household's yearly bill under one proposal, treating all income as wages when
 * there is an employer. `payroll` is the employer's total yearly payroll.
 */
export function bill<P extends Proposal>(
  model: P,
  income: number,
  size: number,
  kind: EmployerKind,
  payroll = 0,
): Bill<P> {
  const eRate = employerRate(kind, model, payroll);
  const wages = kind === 'none' ? 0 : Math.max(0, income);
  const gross = grossContribution(income, schedule(model, size));
  const household = contribution(model, income, wages, size, eRate);
  return { model, household, gross, credit: gross - household, employer: eRate * wages };
}
