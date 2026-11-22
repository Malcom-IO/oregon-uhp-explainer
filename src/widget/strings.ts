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
    `Estimates calculated from the ${models} financing models in the Universal Health Plan Governance Board’s ` +
    'October 2026 draft report. Unofficial: not published, reviewed or endorsed by the Board or the State of Oregon.',
  household: 'Household calculator',
  size: 'People in your household',
  income: 'Yearly household income ($, required)',
  incomeHint: 'Use adjusted gross income excluding Social Security. For self-employment, use profit after expenses.',
  slider: 'Adjust yearly household income',
  wageSource: 'Who pays your wages',
  payroll: 'Employer’s total yearly payroll ($, required)',
  payrollHint: 'Use the employer’s payroll for all workers. With two earners, use the larger employer.',
  allWages: 'The estimate treats all household income as wages when you select an employer.',
  currentCost: 'What you pay for health care now ($ per year, optional)',
  currentCostHint: 'Include your share of premiums and what you pay out of pocket.',
  amountPrompt: 'Enter a dollar amount in digits, such as 85,000 or 85000.50.',
  positivePrompt: 'Enter a payroll above $0.',
  enterIncome: 'Enter a yearly household income to see results.',
  fieldMessage: (label: string, message: string) => `${label}: ${message}`,
  enterPayroll: 'Enter your employer’s total yearly payroll to see results.',
  enterBusinessPayroll: 'Enter a total yearly payroll to see results.',
  results: 'Estimated yearly household contribution',
  unchangedPay: 'These estimates assume your pay stays the same and your employer drops its health plan if it offers one.',
  model: (id: string | number) => `Model ${id}`,
  range: (low: string, high: string, models: number) =>
    `Estimated household contribution across the ${models} models is ${low} to ${high} per year.`,
  singleAmount: (amount: string, models: number) =>
    `Estimated household contribution is ${amount} per year in all ${models} models.`,
  perYear: '/ year',
  gross: 'Before credit',
  credit: 'Worker credit used',
  employerOnWages: 'Payroll tax paid by your employer on your wages',
  noEmployerNote: 'No employer pays payroll tax on this income, so there is no worker credit.',
  noPayrollTax: 'A payroll of that size owes no payroll tax in any model, so there is no worker credit.',
  lessThan: (amount: string) => `less than ${amount}`,
  rateInEveryModel: (rate: string) => `${rate} of wages in every model`,
  rateUnder: (rate: string, models: string, several: boolean) =>
    `${rate} of wages under ${several ? 'Models' : 'Model'} ${models}`,
  privateRates: (rates: string) => `On that payroll the tax works out to ${rates}.`,
  publicTopRates: (rates: string) =>
    `Public employers would pay the top payroll rate from the first dollar: ${rates}.`,
  householdContext: (income: string, size: number, employer: string, payroll?: string) =>
    [`Yearly income ${income}, household size ${size}. ${employer}.`, payroll && `Employer payroll ${payroll}.`]
      .filter(Boolean).join(' '),
  comparisonSummary: (amount: string) => `Compared with ${amount} in yearly spending today.`,
  comparisonSkipped: 'The amount to compare with is not a valid dollar amount, so no comparison is shown.',
  difference: (amount: string, more: boolean) => `${amount} ${more ? 'more' : 'less'} than today`,
  noDifference: 'Same as today',
  chart: 'Household contribution by income',
  chartDescription: (limit: string, models: number) =>
    `Yearly household contribution under all ${models} models at incomes up to ${limit}. A table of sample values follows.`,
  inspectIncome: 'Look up yearly income on the chart ($, optional)',
  inspectHint: (limit: string) => `Enter a dollar amount from $0 to ${limit}.`,
  lookupNotUsed: (hint: string) => `${hint} The figures shown here are for your own income.`,
  chartTable: 'Show sample values as a table',
  chartIncome: 'Yearly income',
  chartContribution: 'Yearly contribution',
  selectedIncome: 'Your income',
  currentLine: 'What you pay now',
  chartSample: (income: string) => `At ${income} in yearly income:`,
  chartComparison: (amount: string) => `Current yearly health care cost for comparison is ${amount}.`,
  business: 'Employer payroll tax calculator',
  businessKind: 'Type of employer',
  businessPayroll: 'Total yearly payroll ($, required)',
  businessSpend: 'Current yearly spending on employee health benefits ($, optional)',
  businessSpendHint: 'Use the employer’s share only. The difference shows how the tax compares with that spending.',
  businessResults: 'Estimated yearly employer payroll tax',
  effectiveRate: 'Share of payroll',
  comparison: 'Compared with current spending',
  modelColumn: 'Model',
  businessSummary: (rates: string) => `Estimated yearly payroll tax. ${rates}`,
  modelAmount: (model: string, amount: string) => `${model} ${amount}.`,
  privacy: 'Your entries stay in this browser.',
} as const;

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
