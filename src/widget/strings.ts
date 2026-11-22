/**
 * Every string the calculator shows. A translation replaces this module.
 * `employerLabel` and `modelName` pass through the English text that lives
 * with the engine and the proposal data; a translation would map `kind` and
 * `id` to its own wording there.
 */
export const locale = 'en-US';

export const copy = {
  title: 'Oregon Universal Health Plan calculator (unofficial)',
  snapshot: 'Source snapshot · October 2026 drafts',
  intro: (models: number) =>
    `Estimates calculated from the ${countWord(models)} financing models in the Universal Health Plan Governance Board’s ` +
    'October 2026 draft report. Unofficial: not published, reviewed or endorsed by the Board or the State of Oregon.',
  household: 'Household calculator',
  coverage: 'How you are covered today',
  size: 'People in your household',
  exemptFrom: (amount: string, models: string) => `the first ${amount} of income in ${models}`,
  exemptHint: (parts: string) => `Not taxed: ${parts}.`,
  everyModel: 'every model',
  income: 'Household income per year',
  incomeHint:
    'Use the line labeled “adjusted gross income” on your federal tax return. Leave out Social Security. ' +
    'If you are self-employed, that is profit after expenses, not sales.',
  slider: 'Adjust household income',
  wageSource: 'Who pays your wages',
  payroll: 'Its total payroll per year, roughly',
  payrollHint:
    'A rough guess is fine: the number of employees times their typical pay. With two earners, use the larger employer.',
  allWages: 'The estimate treats all household income as wages when you choose an employer.',
  currentCost: 'What you pay for health care now, per year',
  amountPrompt: 'Enter a dollar amount in digits, such as 85,000 or 85000.50.',
  positivePrompt: 'Enter a payroll above $0.',
  enterIncome: 'Enter a yearly household income to see results.',
  fieldMessage: (label: string, message: string) => `${label}: ${message}`,
  enterPayroll: 'Enter your employer’s total yearly payroll to see results.',
  enterBusinessPayroll: 'Enter a total yearly payroll to see results.',
  results: 'Estimated yearly household contribution',
  employerAssumptions:
    'your employer drops its plan, and your pay stays the same. ' +
    'If it keeps its plan, the Board has not said what you would owe. If it drops it, the report expects ' +
    'nothing to force your pay up when premiums go away. Public employee? Choose ' +
    '“A public employer” under “Who pays your wages.”',
  employerAssumptionsLead: 'Two assumptions behind the comparison below:',
  rangeLead: (models: number) => `Your range across the ${countWord(models)} models:`,
  range: (low: string, high: string) =>
    `${low} to ${high} a year, in today’s dollars. None has been chosen, and all of them are drafts that may change.`,
  singleAmount: (amount: string) =>
    `${amount} a year in every model, in today’s dollars. None has been chosen, and all of them are drafts that may change.`,
  sticky: 'Your range:',
  stickyRange: (low: string, high: string) => (low === high ? low : `${low} to ${high}`),
  stickyYear: 'a year',
  stickyGo: 'See all results',
  model: (id: string | number) => `Model ${id}`,
  models: (ids: string) => `Models ${ids}`,
  modelRun: (first: string, last: string) => `Models ${first} to ${last}`,
  topRate: (rate: string, stepped: boolean) => (stepped ? `up to ${rate}` : rate),
  perYear: '/ year',
  lessThanNow: (amount: string) => `${amount} less than you pay now`,
  moreThanNow: (amount: string) => `${amount} more than you pay now`,
  sameAsNow: 'About what you pay now',
  oweNothing: 'You would owe nothing',
  oweNothingCovered: 'You would owe nothing and be covered',
  payAndBeCovered: 'You would pay this and be covered',
  zeroExempt: 'Your income is within this model’s exemption.',
  zeroCredit: 'The worker credit covers the whole bill, if your employer pays the payroll tax shown.',
  creditUsed: (credit: string, gross: string) => `${gross} before a ${credit} worker credit.`,
  employerOnWages: (amount: string) => `Your employer would pay about ${amount} on your wages.`,
  noEmployerNote: 'No employer pays payroll tax on this income, so there is no worker credit.',
  noPayrollTax: 'A payroll of that size owes no payroll tax in any model, so there is no worker credit.',
  lessThan: (amount: string) => `less than ${amount}`,
  rateInEveryModel: (rate: string) => `${rate} of wages in every model`,
  rateUnder: (rate: string, models: string) => `${rate} of wages under ${models}`,
  privateRates: (rates: string) => `On that payroll the tax works out to ${rates}.`,
  publicTopRates: (rates: string) =>
    `Public employers would pay the top payroll rate from the first dollar: ${rates}.`,
  householdContext: (income: string, size: number, employer: string, payroll?: string) =>
    [`Yearly income ${income}, household size ${size}. ${employer}.`, payroll && `Employer payroll ${payroll}.`]
      .filter(Boolean).join(' '),
  comparisonSummary: (amount: string) => `Compared with ${amount} in yearly spending today.`,
  comparisonSkipped: 'The amount to compare with is not a valid dollar amount, so no comparison is shown.',
  chart: 'Household contribution by income',
  chartContext: (size: number, cost?: string) =>
    cost === undefined ? `Household of ${size}` : `Household of ${size}, ${cost} a year today`,
  chartDescription: (limit: string, models: number) =>
    `Line chart of the yearly household contribution under all ${models} models at incomes up to ${limit}. ` +
    'The table below gives the figures.',
  chartTable: 'Show these figures as a table',
  chartIncome: 'Household income per year',
  chartContribution: 'Contribution per year',
  tableIncome: 'Income',
  selectedIncome: 'You',
  currentLine: 'What you pay now',
  tipIncome: (income: string) => `${income} income`,
  business: 'Employer payroll tax calculator',
  businessKind: 'Type of employer',
  businessPayroll: 'Total payroll per year',
  businessSpend: 'What you spend on employee health benefits now, per year',
  businessSpendHint:
    'The figures shown are an example. Count the employer’s share only: premiums, or if you are self-funded, ' +
    'claims, stop-loss and administration, less what employees pay in. Enter 0 if you do not offer coverage.',
  businessResults: 'Estimated yearly employer payroll tax',
  businessAssumption: 'The comparison assumes the employer drops its health plan. The tax is owed either way.',
  businessShare: (rate: string) => `${rate} of payroll.`,
  lessThanSpend: (amount: string) => `${amount} less than you spend now`,
  moreThanSpend: (amount: string) => `${amount} more than you spend now`,
  sameAsSpend: 'About what you spend now',
  businessSummary: (rates: string) => `Estimated yearly payroll tax. ${rates}`,
  modelAmount: (model: string, amount: string) => `${model} ${amount}.`,
  privacy: 'Your entries stay in this browser.',
} as const;

export type CoverageKind = 'employer' | 'own' | 'medicare' | 'ohp' | 'none';

/** Wording for each "how you are covered today" choice. The amounts come from the Board's examples. */
export const coverageCopy: Record<CoverageKind, {
  label: string;
  hint: (typical: string) => string;
  note?: string;
}> = {
  employer: {
    label: 'Through a job',
    hint: typical =>
      'Your share of premiums plus deductibles, copays and prescriptions. Leave out what your employer pays. ' +
      `The Board’s example for a couple is ${typical}.`,
  },
  own: {
    label: 'I buy my own plan',
    hint: typical =>
      'Your premiums after any subsidy, plus deductibles, copays and prescriptions. The Board’s example, ' +
      `a 45-year-old with a silver plan, is ${typical}. Before subsidies, older buyers pay more.`,
  },
  medicare: {
    label: 'Medicare',
    hint: typical =>
      `The Board’s example for a couple is ${typical}: Part B premiums plus out-of-pocket costs. ` +
      'Leave out Medigap and Part D premiums; the report does not say whether you would still need them.',
    note:
      'Leave Social Security out of your income; it does not count toward the contribution. The comparison ' +
      'follows the Board’s example, which assumes the plan pays your Part B premium and your out-of-pocket ' +
      'costs go away. The Board recommends paying Part B, pending further study, and the report does not ' +
      'address Medigap or Part D.',
  },
  ohp: {
    label: 'Oregon Health Plan',
    hint: () => 'Most Oregon Health Plan members pay nothing today, so this is $0.',
    note:
      'You would keep your coverage. The Board says most people who qualify for the Oregon Health Plan by ' +
      'income would have no health care costs under the plan.',
  },
  none: {
    label: 'No insurance',
    hint: () => 'What you spend on care in a typical year, or $0. It is drawn as a line on the chart; with no coverage today, the cards do not compare with it.',
    note:
      'You would be covered. The amounts below are what you would pay toward the plan; in return, care would ' +
      'be covered with no premium and, if the Board keeps its goal, no deductible or copay. If an employer pays ' +
      'you wages, choose it under “Who pays your wages”; in the models with a worker credit, that lowers your bill.',
  },
};

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** A small count in words, as in "the five models"; larger counts stay digits. */
export function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

/** The label for a "who pays your wages" option. */
export function employerLabel(_kind: string, english: string): string {
  return english;
}

/** The descriptive name of a financing model. */
export function modelName(_id: string | number, english: string): string {
  return english;
}

export const dollars = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** An amount written back into a field: digits with group separators, cents only if typed. */
export const fieldAmount = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

export const compactDollars = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const percent = new Intl.NumberFormat(locale, {
  style: 'percent',
  maximumFractionDigits: 2,
});

/** The smallest share the percent format can show. */
const SMALLEST_SHARE = 0.0001;

/** A share of wages or payroll. A share too small to show is never printed as 0%. */
export function share(value: number): string {
  return value > 0 && value < SMALLEST_SHARE / 2
    ? copy.lessThan(percent.format(SMALLEST_SHARE))
    : percent.format(value);
}

export const list = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' });

/** "Model 1", "Models 4 and 5", "Models 2 to 5": a run of three or more is written as a range. */
export function modelsLabel(ids: readonly (string | number)[]): string {
  if (ids.length === 1) return copy.model(ids[0]);
  const numbers = ids.map(Number);
  const run = ids.length >= 3 && numbers.every((n, i) => Number.isInteger(n) && (i === 0 || n === numbers[i - 1] + 1));
  return run
    ? copy.modelRun(String(ids[0]), String(ids[ids.length - 1]))
    : copy.models(list.format(ids.map(String)));
}
