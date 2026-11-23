# How the five models compare

[The comparison page](https://malcom-io.github.io/oregon-uhp-explainer/compare/) puts the
Board's five revenue models side by side: what each would raise against what the plan
needs, what a household like yours would pay, and who pays across incomes.

It is a page of the site, built with the rest: `compare/index.html` is a Vite input, its
shell (top bar, light and dark button, printing) comes from the explainer's
`src/site/main.ts`, and its figures are drawn by [src/compare/main.ts](../src/compare/main.ts).

## Where each figure comes from

| On the page | From | Code |
| --- | --- | --- |
| What you would pay | The calculator's `bill()`, so both pages give the same number | `src/model` |
| What each model raises in 2032 | The Legislative Revenue Office's preliminary projections, revised legislative brief of October 22, 2026, p. 10 (outside the source snapshot; see [SOURCES.md](../SOURCES.md)) | `src/compare/lro.ts` |
| The $30 billion and $39 billion needs | Report Table E11 and the Board's estimate | `REVENUE_TARGET` in `src/model/uhp-statewide.ts` |
| Who pays, by income | The model's household rules applied to every Oregon return in 2022; each model's 2022 payroll tax from Appendix FR, counted against wages | `src/compare/distribution.ts`, `src/compare/population.ts` |

The who-pays chart is on the Board's own basis: 2022, the year its rates were set on, and
fifths of people.
Its rates are shares of income, so they do not depend on the year's dollars. The corporate
taxes are not allocated to income groups.

## Our method, not published figures

- **The population.** The IRS publishes Oregon's 2022 returns by income bracket. Each
  bracket's returns are spread across it (a straight-line density matching the bracket's
  mean, and a Pareto tail for the open top brackets), and each filing status's average
  household size is split between the two whole sizes around it.
- **The fifths are fifths of people,** as the Board defines them (Appendix FR, PDF p. 31):
  Oregonians are ranked by the income of the return they are on, and the "more than
  600,000" residents on no Oregon return go in the lowest fifth. The IRS table has no
  income for them, so they are counted as 600,000 people with no income and no
  contribution, only to place the fifths.
- **The payroll tax** is each model's Appendix FR 2022 total, spread over the IRS table's
  $114.4 billion of resident wages. The Board's own wage base is about $107.0 billion
  ($14,441 million at a 13.5% net rate, PDF p. 31). Using it would put the payroll tax per
  wage dollar at the Board's net rate, but wages are a larger share of income in the IRS
  table (68% against 65%), so every fifth's combined rate would come out about half a point
  above the Board's published one. The page says which base it uses.
- **The groups' starting points**, such as where the top 1% starts (printed on the page, in
  2026 dollars), come from that spread. Within the IRS's open "$1 million or more" bracket,
  the split between the top 0.1% and the rest of the top 1% rests on the Pareto tail.
- **The worker credit** in the statewide figures uses the model's payroll tax per dollar of
  wages statewide.
- **Model 1's rates in the LRO projection.** The brief does not say. Its $15.5 billion
  payroll tax matches 9.89%, report Table R1's rate.

## How it is checked

[src/compare/checks.ts](../src/compare/checks.ts) lists each comparison with the Board once.
[src/compare/compare.spec.ts](../src/compare/compare.spec.ts), with `npm test`, holds every
model inside its band; the page prints the measured differences from the same list; and the
spec checks this table against it. Differences are ours less the Board's.

| Figure | Board source | Allowed | Measured (November 2026) |
| --- | --- | --- | --- |
| Statewide household contribution, 2022 | Appendix FR, PDF pp. 31–35 | −3.0% to +7.0% | +0.8% to +4.8% |
| Combined rate, second to top fifth | Appendix FR Figure AFR4Fi | −1.0 points to +1.0 points | +0.3 to +0.6 points |
| Combined rate, lowest fifth | Appendix FR Figure AFR4Fi | −0.5 points to +1.5 points | +0.6 to +0.8 points |
| Middle fifth's household contribution rate | Legislative brief, p. 9 | −0.3 points to +0.3 points | −0.2 to +0.2 points |
| Top 1%'s share of household contributions | Legislative brief, p. 9 | −5.5 points to −1.0 points | −3.8 to −2.7 points |
| Returns owing no household contribution | Legislative brief, p. 9 | −14.0 points to −4.0 points | −11.7 to −5.9 points |

The spec also checks:
- that the page, built without scripts, shows every figure for the Board's example household;
- that with scripts it shows the calculator's figure, and that "$150,000" is read and
  "150.000" refused, with its message described only while it shows;
- that the LRO's figures are the ones printed on page 10;
- that each "who pays" link names its model, shows it, and moves focus to the chart.

## What it cannot tell you

- The LRO's projections are preliminary and static: no behavioral response, and a tax base
  not adjusted for the change in health coverage. The Board says final rates would be
  recalculated.
- The lowest fifth comes out a little higher than the Board's, and the share of returns owing
  nothing lower. The rules match; the Board's return file likely holds more low-income
  returns than the IRS state tables. The top 1%'s share comes out lower: the Board calls its
  top 1% "roughly" that.
- Who really bears the employer payroll tax is an assumption, the Board's: it is counted
  against workers' pay.
