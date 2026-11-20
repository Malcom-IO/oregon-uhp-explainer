export const locale = 'en-US';

export const copy = {
  title: 'Oregon Universal Health Plan calculator',
  snapshot: 'Source snapshot · October 2026 drafts',
  intro: 'Independent estimates based on the Universal Health Plan Governance Board’s five draft financing models.',
  household: 'Household calculator',
  size: 'People in your household',
  income: 'Yearly household income ($)',
  incomeHint: 'Use adjusted gross income excluding Social Security. For self-employment, use profit after expenses.',
  slider: 'Adjust yearly household income',
  wageSource: 'Who pays your wages',
  payroll: 'Employer’s total yearly payroll ($)',
  payrollHint: 'Use the employer’s payroll for all workers. With two earners, use the larger employer.',
  allWages: 'The estimate treats all household income as wages when you select an employer.',
  currentCost: 'What you pay for health care now ($ per year, optional)',
  currentCostHint: 'Include your share of premiums and what you pay out of pocket.',
  amountPrompt: (label: string) => `Enter a nonnegative dollar amount for ${label}.`,
  enterIncome: 'Enter a valid yearly household income to see results.',
  enterPayroll: 'Enter your employer’s total yearly payroll to see results.',
  enterBusinessPayroll: 'Enter a valid total yearly payroll to see results.',
  results: 'Estimated yearly household contribution',
  unchangedPay: 'These estimates assume your pay stays the same and your employer drops its health plan if it offers one.',
  model: (id: string | number) => `Model ${id}`,
  range: (low: string, high: string) => `Estimated household contribution across the five models is ${low} to ${high} per year.`,
  singleAmount: (amount: string) => `Estimated household contribution is ${amount} per year in all five models.`,
  perYear: '/ year',
  gross: 'Before credit',
  credit: 'Worker credit used',
  employerOnWages: 'Payroll tax paid by your employer on your wages',
  householdContext: (income: string, size: number, employer: string, payroll?: string) =>
    [`Yearly income ${income}, household size ${size}. ${employer}.`, payroll && `Employer payroll ${payroll}.`]
      .filter(Boolean).join(' '),
  comparisonSummary: (amount: string) => `Compared with ${amount} in yearly spending today.`,
  difference: (amount: string, more: boolean) => `${amount} ${more ? 'more' : 'less'} than today`,
  noDifference: 'Same as today',
  chart: 'Household contribution by income',
  chartDescription: (limit: string) => `Yearly household contribution under all five models at incomes up to ${limit}. A table of sample values follows.`,
  inspectIncome: 'Look up yearly income on the chart ($)',
  inspectHint: (limit: string) => `Enter a dollar amount from $0 to ${limit}.`,
  chartTable: 'Show sample values as a table',
  chartIncome: 'Yearly income',
  chartContribution: 'Yearly contribution',
  selectedIncome: 'Your income',
  currentLine: 'What you pay now',
  chartSample: (income: string) => `At ${income} in yearly income`,
  chartComparison: (amount: string) => `Current yearly health care cost for comparison is ${amount}.`,
  business: 'Employer payroll tax calculator',
  businessKind: 'Type of employer',
  businessPayroll: 'Total yearly payroll ($)',
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
