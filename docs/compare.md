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

The who-pays chart is on the Board's own basis, 2022, the year its rates were set on.
Its rates are shares of income, so they do not depend on the year's dollars. The corporate
taxes are not allocated to income groups.

## Our method, not published figures

- **The population.** The IRS publishes Oregon's 2022 returns by income bracket. Each
  bracket's returns are spread across it (a straight-line density matching the bracket's
  mean, and a Pareto tail for the open top brackets), and each filing status's average
  household size is split between the two whole sizes around it.
- **The groups' starting points**, such as about $630,000 for the top 1%, come from that
  spread. Within the IRS's open "$1 million or more" bracket, the split between the top
  0.1% and the rest of the top 1% rests on the Pareto tail.
- **The worker credit** in the statewide figures uses the model's payroll tax per dollar of
  wages statewide.
- **Model 1's rates in the LRO projection.** The brief does not say. Its $15.5 billion
  payroll tax matches 9.89%, report Table R1's rate.

## How it is checked

[src/compare/compare.spec.ts](../src/compare/compare.spec.ts), with `npm test`, holds the
who-pays figures to the Board's published ones for every model. The tolerances are the
known gaps, stated on the page:

| Figure | Board source | Tolerance |
| --- | --- | --- |
| Statewide household contribution, 2022 | Appendix FR, PDF pp. 31–35 | within 5% (comes out 1–5% high) |
| Combined rate, second to top fifth | Figure AFR4Fi | within 1 point |
| Combined rate, lowest fifth | Figure AFR4Fi | 0 to 1.7 points lower |
| Top 1%'s share of household contributions | Brief p. 9 | within 1.5 points |
| Middle fifth's household rate | Brief p. 9 | within 0.5 points |
| Returns owing nothing | Brief p. 9 | 5 to 12 points lower |

The spec also checks that the page shows the calculator's figure for the Board's example
household, that the LRO's parts add up to its printed totals, that "85,000" and "$150,000"
are read and "150.000" is refused, and that the chart's table follows the chosen model.

## What it cannot tell you

- The LRO's projections are preliminary and static: no behavioral response, and a tax base
  not adjusted for the change in health coverage. The Board says final rates would be
  recalculated.
- The share of returns owing nothing comes out lower than the Board's. The rules match;
  the Board's return file likely holds more low-income returns than the IRS state tables.
- Who really bears the employer payroll tax is an assumption, the Board's: it is counted
  against workers' pay.
