/**
 * docs/numbers.md, the page a reviewer opens to check the calculator's numbers:
 * every input, where it comes from, and the Board's own worked examples beside
 * the calculator's results. It is generated from the same data the calculator
 * runs on (`npm run numbers`), and src/site/numbers.spec.ts fails if the
 * committed page and the data disagree.
 */
import { BOARD_PROPOSALS, INDEX_2022_TO_2026, PAYROLL_EXEMPT } from '../model/proposals/uhpgb-2026-10';
import { EXAMPLE_SETUP, KNOWN_MISPRINTS, SCENARIOS } from '../model/proposals/uhpgb-2026-10-examples';
import { contribution, MODELS, payrollTax, schedule } from '../model/uhp-model';
import { BUSINESS_PAYROLLS } from './blocks';
import { NEW_ISSUE_URL } from './issue';

const REPO = 'https://github.com/Malcom-IO/oregon-uhp-explainer';
const SIZES = [1, 2, 3, 4, 5] as const;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const pct = (value: number, digits = 2) => `${Number((value * 100).toFixed(digits))}%`;

function table(headings: readonly string[], rows: readonly (readonly string[])[], align?: readonly ('l' | 'r')[]): string {
  const rule = headings.map((_, i) => ((align?.[i] ?? 'l') === 'r' ? '---:' : '---'));
  return [headings, rule, ...rows].map((cells) => `| ${cells.join(' | ')} |`).join('\n');
}

function householdInputs(): string {
  const rows = BOARD_PROPOSALS.map((model) => [
    `Model ${model.id}`,
    model.household.exemption,
    model.household.brackets.map((b) => pct(b.rate)).join(', '),
    model.household.creditShare ? `${pct(model.household.creditShare, 0)} of the employer's payroll tax on your wages` : 'None',
  ]);
  return table(['Model', 'No contribution below', 'Rates above that, lowest first', 'Worker credit'], rows);
}

function bracketStarts(): string {
  const rows: string[][] = [];
  for (const model of MODELS) {
    const bySize = SIZES.map((size) => schedule(model, size));
    model.household.brackets.forEach((bracket, i) => {
      rows.push([
        i === 0 ? `Model ${model.id}` : '',
        pct(bracket.rate),
        ...bySize.map((brackets) => usd.format(brackets[i].from)),
      ]);
    });
  }
  return table(['Model', 'Rate', ...SIZES.map((size) => `${size} ${size === 1 ? 'person' : 'people'}`)], rows,
    ['l', 'r', 'r', 'r', 'r', 'r', 'r']);
}

function payrollInputs(): string {
  const rows = BOARD_PROPOSALS.map((model) => [
    `Model ${model.id}`,
    model.payroll.summary,
    model.payroll.publicEmployer === 'top-rate-from-first-dollar'
      ? `${pct(Math.max(...model.payroll.tiers.map((t) => t.rate)), 1)} from the first dollar`
      : 'Same as private',
  ]);
  return table(['Model', 'Private employers', 'Public employers'], rows);
}

function payrollExamples(): string {
  const rows = BUSINESS_PAYROLLS.map((payroll) => [
    usd.format(payroll),
    ...MODELS.map((model) => `${usd.format(payrollTax(payroll, model))} (${pct(payrollTax(payroll, model) / payroll, 1)})`),
  ]);
  return table(['Yearly payroll', ...MODELS.map((m) => `Model ${m.id}`)], rows, ['l', 'r', 'r', 'r', 'r', 'r']);
}

function publishedFigures(): string {
  const rows = BOARD_PROPOSALS.map((model) => [
    `Model ${model.id}`,
    pct(model.published.returnsOwingNothing, 1),
    pct(model.published.middleFifthRate, 1),
    pct(model.published.top1Share, 1),
    model.published.combinedByFifth.map((v) => pct(v, 1)).join(', '),
  ]);
  return table(
    ['Model', 'Tax returns owing nothing', 'Middle fifth: household contribution, share of income',
      'Top 1%: share of all household contributions', 'With the payroll tax, share of income, lowest to top fifth'],
    rows,
  );
}

/** The Board's worked examples, each cell beside the calculator's figure. */
function examples(): { text: string; worst: number; cells: number; misprints: string } {
  let worst = 0;
  let cells = 0;
  const notes: string[] = [];
  const parts = SCENARIOS.map((scenario) => {
    const setup = EXAMPLE_SETUP[scenario.id];
    const rows: string[][] = [];
    for (const row of scenario.rows) {
      MODELS.forEach((model, i) => {
        const ours = Math.round(contribution(model, row.income, row.wages ?? 0, setup.size, setup.rate(i)));
        const board = row.models[i];
        const misprint = KNOWN_MISPRINTS.has(`${scenario.id}:${row.income}:${model.id}`);
        const difference = ours - board;
        if (!misprint) {
          worst = Math.max(worst, Math.abs(difference));
          cells++;
        } else {
          notes.push(`${setup.table.replace(/, report .*/, '')} at ${usd.format(row.income)}, Model ${model.id}: the report ` +
            `prints ${whole.format(board)} where its own schedule gives ${whole.format(ours)}.`);
        }
        rows.push([
          i === 0 ? usd.format(row.income) : '',
          i === 0 && row.wages !== undefined ? usd.format(row.wages) : '',
          `Model ${model.id}`,
          whole.format(board),
          whole.format(ours),
          `${difference > 0 ? '+' : ''}${whole.format(difference)}${misprint ? ' (likely misprint, see below)' : ''}`,
        ]);
      });
    }
    return [
      `### ${setup.table}: ${scenario.tab}`,
      '',
      `${scenario.who} ${setup.assumption}`,
      '',
      table(['Income', 'Wages', 'Model', 'Board', 'Calculator', 'Difference'], rows, ['l', 'r', 'l', 'r', 'r', 'r']),
    ].join('\n');
  });
  const one = notes.length === 1;
  const misprints = `${one ? 'The one cell' : 'The cells'} outside $${worst}, which ${one ? 'looks like a misprint' : 'look like misprints'} ` +
    `in the report: ${notes.join(' ')} The same model fits the Board's other cells, so the calculator keeps its own figure. ` +
    `${one ? 'It is' : 'Each is'} listed under "Known discrepancies" in [SOURCES.md](../SOURCES.md).`;
  return { text: parts.join('\n\n'), worst, cells, misprints };
}

export function renderNumbers(): string {
  const worked = examples();
  return `<!-- Generated from the calculator's data by \`npm run numbers\`. Do not edit by hand. -->

# Check the numbers

Everything the calculator computes from, and the Board's own worked examples beside
the calculator's results, on one page. It is generated from the same data the
calculator runs on, and a test fails if this page and that data ever disagree, so
what you check here is what the calculator uses.

Source snapshot: the Universal Health Plan Governance Board's October 2026 draft
documents. Each document's address, date and checksum are in
[SOURCES.md](../SOURCES.md).

The calculator is unofficial while it is being reviewed. The Board has asked for the
calculator's numbers to be checked before deciding whether to host it. Until then, it
is not published, reviewed or endorsed by the Board or the State of Oregon.

**The quickest check is section 4:** the Board printed what a household would pay
under each model in report Tables S1 to S4.
The calculator reproduces ${worked.cells} of those cells, each within $${worked.worst}.
One more cell appears to be a misprint in the report.

## 1. The household contribution

The tax each household would pay on its income, in place of premiums. Each slice of
income above the exemption is taxed at that slice's rate; the worker credit is then
subtracted, and the result is never below zero.

${householdInputs()}

Where each rate starts, in 2026 dollars, by household size:

${bracketStarts()}

- The exemptions are 200% and 138% of the 2026 federal poverty level, from report
  Table R2.
- The appendix gives the higher brackets in 2022 dollars (Appendix FR, pages 31 to
  35), for one person and twice that for two or more. The calculator brings them to
  2026 by ${whole.format(INDEX_2022_TO_2026.to)} / ${whole.format(INDEX_2022_TO_2026.from)}, the growth in the one-person poverty level. **This
  factor is the project's inference, not a published figure**: the appendix says the
  brackets are inflation adjusted without giving a factor, and this one reproduces the
  Board's examples.
- The rates are from Appendix FR and report Tables R3 and R4. Model 3 uses 7.69%, the
  unrounded figure in Table R4; the appendix prints 7.7%. The report's summary table
  lists different top rates for Models 1, 4 and 5; [SOURCES.md](../SOURCES.md)
  explains why the calculator uses the appendix's.

## 2. The employer payroll tax

${payrollInputs()}

Payroll up to ${usd.format(PAYROLL_EXEMPT)} is untaxed for private employers, and each rate applies
only to the payroll above its threshold, so there is no cliff. Source: report Table
R4; for public employers, Appendix FR page 27, with the effective rates in the
report's worked example on page 45.

The tax at five payroll sizes, and its share of payroll:

${payrollExamples()}

When an employer pays the household's wages, the worker credit is the model's credit
share times the employer's tax rate on those wages: the employer's whole tax divided
by its whole payroll.

## 3. Figures the Board published for each model

Quoted on the explainer page, not computed by the calculator. Source: report Tables
R4, R5, R7 and R8, the legislative brief (page 9) and Appendix FR Figure AFR4Fi. The
middle-fifth and payroll-tax columns are shares of income; the top 1% column is that
group's share of all household contributions.

${publishedFigures()}

## 4. The Board's worked examples beside the calculator

Each row is one cell of the Board's tables: what the Board printed, what the
calculator's engine gives for the same household, and the difference in dollars. The
figures use each table's own setup, stated above it. In Table S2 that is the Board's
rounded 9% payroll tax rate; the calculator page works the rate out from the payroll
($8.5 million gives 9.04%), so typing the same couple into it gives figures that
differ from this table by up to about $35.

${worked.text}

${worked.misprints}

## 5. Found a problem?

Open an [issue](${NEW_ISSUE_URL}). Say which number, where you saw it (this page, the
calculator or the explainer), what you expected and the document and page you are
checking against. Please use made-up household figures, not your own. Issues and the
changes that answer them are public.

To run the same checks yourself: install Node 24, then \`npm install\` and \`npm test\`.
The tests that reproduce the Board's tables are in
[src/model/uhp-model.spec.ts](../src/model/uhp-model.spec.ts), and the five models
are in [src/model/proposals/uhpgb-2026-10.ts](../src/model/proposals/uhpgb-2026-10.ts).
`;
}
