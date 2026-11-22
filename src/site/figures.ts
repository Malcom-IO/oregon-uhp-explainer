/**
 * Static prose carries literal figures in keyed spans. The site spec compares
 * those figures with this map, so a model change that affects the prose fails
 * the build checks. Figures sourced only from documents are tracked in SOURCES.md.
 */
import { BOARD_PRIVATE_RATE, HOUSEHOLD_ROWS } from '../model/uhp-households';
import { bill, employerRate, FPL_138, FPL_200, MODELS, PAYROLL_EXEMPT, PAYROLL_UPPER_TIER, payrollTax, SCENARIOS } from '../model/uhp-model';
import {
  BEST, BOARD, HIGH_PLAN, LOW, PART_B, RATE_RESET, REVENUE_TARGET, SCENARIOS_STATEWIDE,
} from '../model/uhp-statewide';
import { pct, pct1, usd } from './format';

const [model1, model2, , model4, model5] = MODELS;
const firstPayrollRates = MODELS.map(model => model.payroll.tiers[0].rate);
const topPayrollRates = MODELS.slice(1).map(model => model.payroll.tiers.at(-1)!.rate);
const otherPublicRates = MODELS.slice(1).map(model => employerRate('public', model));
const payrollExample = 520_000;
const singleWorker = HOUSEHOLD_ROWS.find(row => row.size === 1 && row.employer === 'private')!;
const couple = HOUSEHOLD_ROWS.find(row => row.source === 'S2')!;
const privateFamily = HOUSEHOLD_ROWS.filter(row => row.size === 4 && row.employer === 'private');
const selfExample = HOUSEHOLD_ROWS.find(row => row.source === 'S1')!;
const selfScenario = SCENARIOS.find(scenario => scenario.id === 'self')!;
const privateScenario = SCENARIOS.find(scenario => scenario.id === 'private')!;
const privateExample = privateScenario.rows[1];
const privateHighExample = privateScenario.rows.at(-1)!;
const [singleModel1, singleModel2, singleModel4] = [model1, model2, model4]
  .map(model => usd(bill(model, singleWorker.income, singleWorker.size, 'none').household));
const reportedSelfExample = selfScenario.rows.find(row => row.income === selfExample.income)!;

/** A common display value. If sources diverge, the prose must name the differences. */
function common(values: readonly number[], format: (value: number) => string): string {
  return [...new Set(values)].map(value => format(value)).join(', ');
}

function percentRange(rates: readonly number[], lowDigits = 0, highDigits = 0): string {
  return `${pct(Math.min(...rates), lowDigits)} to ${pct(Math.max(...rates), highDigits)}`;
}

function billions(amount: number): string {
  return `$${amount.toFixed(1)} billion`;
}

const publishedSavings = SCENARIOS_STATEWIDE.filter(row => row.published)
  .map(row => -row.delta / row.baseline);
const noResetIncreases = SCENARIOS_STATEWIDE.filter(row => !row.published)
  .map(row => row.delta / row.baseline);

export const figures: Readonly<Record<string, string>> = Object.freeze({
  'household.exemption200Single': usd(FPL_200[1]),
  'household.exemption200Family': usd(FPL_200[4]),
  'household.exemption138Family': usd(FPL_138[4]),
  'household.singleWithoutCredit': `${singleModel1}, ${singleModel2} and ${singleModel4}`,
  'household.exampleSinglePrivatePayment': common([0, 1, 3].map(index => singleWorker.models[index]), usd),
  'household.exemptionChoices': [...new Set(MODELS.map(model => model.exemption.split(' ')[0]))].join(' or '),
  'household.workerCreditShare': common(MODELS.map(model => model.creditShare).filter(Boolean),
    rate => rate === 0.5 ? 'half' : pct(rate)),
  'household.model5At90000': usd(bill(model5, selfExample.income, selfExample.size, 'none').household),
  'household.reportedModel5At90000': usd(reportedSelfExample.models[4]),
  'household.combinedRange': percentRange(MODELS.flatMap(model => model.combinedByFifth), 0, 1),
  'household.middleFifthRange': percentRange(MODELS.map(model => model.middleFifthRate), 0, 1),
  'household.middleFifthCombinedRange': percentRange(MODELS.map(model => model.combinedByFifth[2])),
  'household.topShareRange': percentRange(MODELS.map(model => model.top1Share)),
  'household.reportRateRange': percentRange(MODELS.map(model => model.reportRate ?? model.topRate), 2, 2),
  'household.model1ReportRate': pct1(model1.reportRate!),
  'household.model4ReportRate': pct(model4.reportRate!),
  'household.model5ReportRate': pct(model5.reportRate!),
  'household.model1TopRate': pct(model1.topRate),
  'household.model4TopRate': pct(model4.topRate),
  'household.model5TopRate': pct(model5.topRate),
  'household.examplePrivateWages': usd(couple.wages),
  'household.examplePrivateIncome': usd(privateExample.income),
  'household.examplePrivateFamilyIncome': usd(Math.max(...privateFamily.map(row => row.income))),
  'household.examplePrivateHighIncome': usd(privateHighExample.income),
  'household.exampleSelfIncome': usd(selfExample.income),
  'household.highestReportExampleIncome': usd(Math.max(...SCENARIOS.flatMap(scenario => scenario.rows.map(row => row.income)))),

  'payroll.exemption': usd(PAYROLL_EXEMPT),
  'payroll.upperTier': `$${PAYROLL_UPPER_TIER / 1_000_000} million`,
  'payroll.exampleAmount': usd(payrollExample),
  'payroll.taxExample': usd(payrollTax(payrollExample, model1)),
  'payroll.taxableExample': usd(payrollExample - PAYROLL_EXEMPT),
  'payroll.firstPrivateRate': common(firstPayrollRates, pct),
  'payroll.topPrivateRate': common(topPayrollRates, pct),
  'payroll.firstRateCents': common(firstPayrollRates, rate => pct(rate).slice(0, -1)),
  'payroll.topRateCents': common(topPayrollRates, rate => pct(rate).slice(0, -1)),
  'payroll.publicRateModel1': pct(employerRate('public', model1)),
  'payroll.publicRateOtherModels': common(otherPublicRates, pct),
  'payroll.examplePrivateRate': pct(BOARD_PRIVATE_RATE),
  'payroll.examplePrivateTax': usd(privateExample.wages! * BOARD_PRIVATE_RATE),
  'payroll.examplePrivateHighTax': usd(privateHighExample.wages! * BOARD_PRIVATE_RATE),

  'statewide.highPlan': String(HIGH_PLAN),
  'statewide.rateResetBest': pct(RATE_RESET.best, 0),
  'statewide.providerSavings': billions(BEST.collectability + BEST.providerAdmin),
  'statewide.publishedSavingsRange': percentRange(publishedSavings),
  'statewide.noResetIncreaseRange': percentRange(noResetIncreases),
  'statewide.bestStatusQuo': billions(BEST.statusQuo),
  'statewide.lowStatusQuo': billions(LOW.statusQuo),
  'statewide.boardSavings': billions(LOW.statusQuo - BOARD.plan),
  'statewide.boardSavingsRate': pct((LOW.statusQuo - BOARD.plan) / LOW.statusQuo, 0),
  'statewide.publicFundingRange': `${usd(LOW.publicFunding)} to ${usd(BEST.publicFunding)} billion`,
  'statewide.partB': `$${PART_B.toFixed(1)}`,
  'statewide.bestIncreaseWithPartB': billions(BEST.plan + PART_B - BEST.statusQuo),
  'statewide.bestSavings': billions(BEST.statusQuo - BEST.plan),
  'statewide.boardRevenueTarget': `${usd(REVENUE_TARGET.board)} billion`,
  'statewide.bestRevenueTarget': `${usd(REVENUE_TARGET.best)} billion`,
  'statewide.revenueIncrease': `${pct((REVENUE_TARGET.best - REVENUE_TARGET.board) / REVENUE_TARGET.board, 0)} more`,
  'statewide.lowAddedCare': `$${LOW.addedUse.toFixed(1)}`,
});
