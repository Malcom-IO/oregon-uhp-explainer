# The revenue balancer

[The balancer](https://malcom-io.github.io/oregon-uhp-explainer/balancer/) asks a different
question from the calculator: not "what would I pay under the Board's models?" but "how
should the plan be funded?" Readers pick a mix of taxes and see whether it raises the money
needed, who pays it, and what it costs their own household.

It is a static page in [public/balancer/](../public/balancer/), built without a step:
`index.html` loads `engine.js`, which sets `globalThis.Balancer`.

## The three steps

1. **Existing proposals** (`#board`): the Board's five models, each as one bar split into
   households, employers and business taxes, against the $30 billion and $39 billion
   estimates of what the plan needs. Each model shows what a household like yours would
   pay, and a chart shows who pays by income.
2. **Try your own** (`#try`): five sliders (the richest 1%, high earners, everyone a little,
   employers, shoppers) starting from $0. Ticks mark where the Board's models set each
   rate. When a top-income slider is at its limit and the plan is still short, a note
   says how much more of everything that group earns would close the gap.
3. **Fine-tune every rate** (`#fine`): every bracket rate, the exemption, the worker credit,
   a cap, and other taxes (wages, capital gains, sales, a statewide property levy,
   corporate income and activity tax add-ons, cigarettes), each with a cited estimate.

A plan can be shared as a link: `#try-…` or `#fine-…` followed by short codes for each
setting that differs from an empty plan. The link carries no income or household size.

## How it is calculated

- **Households.** About 7,200 synthetic returns built from the IRS's 2022 Oregon statistics
  (2.03 million returns by income bracket), spread within each bracket, using income less
  taxable Social Security as the Board does. The household rules are applied return by
  return and grown to 2032 with the Legislative Revenue Office's projections for Models 2–5.
- **Employers.** The payroll bases the Board's own 2022 results imply, grown to 2032.
- **Your household.** The same rules as the calculator, in 2026 dollars, with the Board's
  2026 poverty-level thresholds (report Table R2).
- **Who bears what.** Payroll and wage taxes fall on workers in proportion to wages, as in
  the Board's tables. Sales, activity, cigarette and property taxes fall in proportion to
  spending (BLS Consumer Expenditure Survey 2025). Corporate income taxes fall 75% on
  owners of capital and 25% on workers.
- **The richest 1% and the top 20%.** Extra taxes on each return's income above where those
  groups start ($630,000 and $130,000 in 2026 dollars), not doubled for couples.

## How it is checked

[src/model/balancer.spec.ts](../src/model/balancer.spec.ts) runs with `npm test`:

- a household's bill matches the calculator's `bill()` to the dollar, under all five
  models, for households of one to five people and incomes from $25,000 to $2 million;
- the statewide household contribution reproduces Appendix FR's 2022 results within 7%,
  and the payroll tax exactly;
- share links round-trip, and values the page cannot show are ignored or clamped.

`node public/balancer/check.mjs` prints the comparison with the Board as a table.

| Model | Households, 2022: balancer vs Board | 2032 total: balancer vs LRO |
| --- | --- | --- |
| 1 | −0.3% | +7.7% |
| 2 | −2.8% | −0.9% |
| 3 | +3.3% | +1.3% |
| 4 | −1.1% | −0.4% |
| 5 | +5.6% | +2.2% |

## What it cannot tell you

- The estimates are static, like the Board's: no one changes behavior in response.
- Who really pays sales, property and corporate taxes rests on the assumptions above.
- The share of filers who owe nothing runs 6 to 8 points below the Board's in every model.
  The rules match; the Board's return data likely holds more low-income returns than the
  IRS state tables.
- The LRO's Model 1 figure is calculated differently, so growth to 2032 uses Models 2–5.
- The top 0.1% is estimated inside the IRS's open "$1 million or more" bracket.
- At the Board's draft rates the LRO projects $32.4 to $34.8 billion for 2032, so each Board
  model shows more than the Board's $30 billion and less than Milliman's $39 billion.
