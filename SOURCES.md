# Sources

This calculator uses the October 2026 draft materials the Oregon Universal Health Plan Governance
Board posted on Oregon.gov. The project is independent of the State of Oregon and the Board.
These estimates describe the proposals in that snapshot.

The byte sizes and SHA-256 fingerprints below are for PDFs fetched on November 19, 2026
(Pacific time). To check for a change at the same URL, download the PDF again and run
`shasum -a 256` on the downloaded file. A different hash means the file bytes changed.
Page numbers below refer to printed pages unless a PDF page is specified.

In the tables, [proposal data](src/model/proposals/uhpgb-2026-10.ts) refers to the model inputs
and published statistics, [examples](src/model/proposals/uhpgb-2026-10-examples.ts) to
`SCENARIOS`, [households](src/model/uhp-households.ts) to the fixed comparison households,
and [statewide](src/model/uhp-statewide.ts) to the statewide projections.
`HHCC` means household health care contribution and `EPT` means employer payroll tax.

## UHPGB Legislative Report

Draft dated October 13, 2026 and posted for October 15. The PDF cover marks this copy as a
draft pending Board approval. **2,885,869 bytes.** SHA-256
`76d4d5451bd25aecd8805316fd3b469ae40930cad25152191afebf87221c7f68`.
[Legislative report draft PDF](https://www.oregon.gov/uhpgb/Documents/board-meetings/2026/20261015/20261015-legislative-report-draft.pdf)

| Location | What it provides and spot check | Units and year | Use in this repo |
| --- | --- | --- | --- |
| Table E2, p. 18 | Projected population, 4,423,000 | Oregon residents in 2032 | Statewide `POPULATION_2032`, denominator for `perPerson` |
| Table E3, p. 19 | Current-system cost components and best total, $78.3 billion | Billions of dollars projected for 2032 | Statewide `BEST.statusQuo*` |
| Table E4, p. 20 | Current-system cost components and low total, $72.8 billion | Billions of dollars projected for 2032 | Statewide `LOW.statusQuo*` |
| Table E5, pp. 21–22 | Cost of increased coverage and use, including the best-estimate addition of $7.2 billion | Billions of dollars projected for 2032 | Statewide `BEST.addedUse`, `LOW.addedUse` |
| Table E6, p. 22 | Benefits and administration before provider savings, including the $85.5 billion best total | Billions of dollars projected for 2032 | Statewide `BEST` and `LOW` fields `planDentalVisionMore`, `planAdmin`, and `planGross` |
| Table E7, p. 23 | Savings from improved collections and reduced provider administration, and revised costs, including the $86.5 billion high total | Billions of dollars projected for 2032 | Statewide `BEST` and `LOW` fields `collectability`, `providerAdmin`, and `plan`, plus `HIGH_PLAN` |
| Table E8, p. 26 | Additional Board savings applied to the low estimate, yielding $66.2 billion. The surrounding text gives the low estimate's 5.3% annual growth assumption. | Billions of dollars projected for 2032 and annual growth percent | Statewide `BOARD` and the `LOW` comment |
| Table E9, p. 28 | Summary of status quo and plan estimates. The best estimate's $0.6 billion difference agrees with the source totals used by the code. | Billions of dollars projected for 2032 | Statewide `BEST`, `LOW`, `BOARD`, and published comparisons in `SCENARIOS_STATEWIDE` |
| Table E10, p. 29 | Continuing state and federal funding, including the best estimate of $42.2 billion | Billions of dollars projected for 2032 | Statewide `BEST.publicFunding`, `LOW.publicFunding` |
| p. 30 | $3.5 billion annual Medicare Part B premium payment, including income-related adjustments | Billions of dollars projected for 2032 | Statewide `PART_B` |
| Table E11, p. 31 | Revenue replacement target after adding Part B and subtracting public funding, $39.0 billion in the best estimate | Billions of dollars projected for 2032 | Statewide `REVENUE_TARGET` |
| Table R2, p. 37 | Poverty level and income exemptions by household size. For four people, 200% of the poverty level is $66,000. | Annual 2026 dollars | Proposal data `FPL_138`, `FPL_200`, `AT_138_FPL`, `AT_200_FPL`, and the 2026 value in `INDEX_2022_TO_2026` |
| Table R3, pp. 37–38 | Design by model, including Model 4's 50% credit and 138% FPL exemption | Rates, shares of the poverty level, and bracket counts including the zero-rate bracket | Proposal data `household` and `payroll` rules |
| Table R4, p. 38 | Payroll rates, household credit and exemptions, summary maximum rates, and share of returns with no contribution. Model 3's listed rate is 7.69%. | Percent of payroll, income, or returns, as labeled | Proposal data `PAYROLL_SOURCE`, `HOUSEHOLD_SOURCE`, `published.reportRate`, and `published.returnsOwingNothing` |
| Table R5, p. 39 | Share of HHCC liability by income group. Model 4 assigns 39.9% to the top 1%. | Percent of modeled household contribution | Proposal data `published.top1Share` |
| Table R7, p. 41 | Average net household contribution by income group. Model 4's middle-fifth rate is 0.8%. | Percent of income | Proposal data `published.middleFifthRate`. The top 1% row also identifies the averages discussed under Known discrepancies. |
| Table R8, pp. 41–42 | Average combined HHCC and EPT rate by income fifth. Model 4's middle-fifth rate is 8.6%. | Percent of income | Proposal data `published.combinedByFifth` |
| Table S1, p. 43 | A self-employed person or worker at a small firm. At $45,000 of income, the Model 3 household payment is $1,006. | Annual 2026 dollars | Examples `self`, households' self-employed status quo, [`uhp-model.spec.ts`](src/model/uhp-model.spec.ts), and [README](README.md) |
| Table S2, p. 44, with setup on p. 43 | Two people with private-employer coverage and a rounded 9% EPT rate on an $8.5 million employer payroll. At $85,000 of income, Model 1's household payment is $2,032. | Annual 2026 dollars and effective payroll percent | Examples `private`, households' `BOARD_PRIVATE_RATE` and private-employer couple, and model example tests |
| Table S3, pp. 45–46 | A public employee. At $51,000 of income, Model 3's payment is $1,467. Page 45 gives the effective public rates of 9.6% for Model 1 and 14% for Models 2–5. | Annual 2026 dollars and effective payroll percent | Examples `public`, model example tests, and the report page referenced in `PAYROLL_SOURCE` |
| Table S4, pp. 46–47 | Two people on Medicare. At $75,000 of income, Model 2's payment is $3,822. | Annual 2026 dollars, with AGI excluding federally taxed Social Security | Examples `medicare`, households' retired couple, and model example tests |

The [statewide spec](src/model/uhp-statewide.spec.ts) checks the arithmetic across the
report's E tables and allows $0.15 billion for rounding of inputs displayed to one decimal.
The [model spec](src/model/uhp-model.spec.ts) uses the S tables as regression fixtures and allows
$4 per household payment, with the one listed S1 exception.

## Expenditure and Revenue Appendix (Appendix FR)

Draft dated October 13, 2026 and posted for October 15. The October 29 meeting links
to the same file. **2,435,582 bytes.** SHA-256
`d72a3d2801476238d5d6d016543fc31cb71a7c4166ce1aec6edb7bca65eba4f4`.
[Expenditure and Revenue Appendix PDF](https://www.oregon.gov/uhpgb/Documents/board-meetings/2026/20261015/expenditure-revenue-appendix-10142026.pdf)

| Location | What it provides and spot check | Units and year | Use in this repo |
| --- | --- | --- | --- |
| p. 27 | Intended public-employer rule applies the highest marginal payroll rate from the first dollar. The page also describes inflation-adjusted bracket boundaries. | Rate on payroll and inflation-adjusted thresholds | Proposal data `publicEmployer` in `ONE_TIER` and `TWO_TIERS`, plus the index assumption described below |
| pp. 31–33 | The first three household schedules and their payroll and credit design. Model 1 shows a 13.5% household rate and Model 2 introduces the 14% payroll tier above $10 million. | Marginal rates and thresholds in the appendix's 2022 model | Proposal data `ONE_TIER`, `TWO_TIERS`, and Models 1–3 `household` |
| pp. 34–35 | Models 4 and 5 household schedules. For one exemption, Model 5's 12% bracket begins at $200,000 in the appendix schedule. | Marginal rates and bracket thresholds in the appendix's 2022 model | Proposal data `dollars2022`, `STEPS`, and Models 4–5 `household` |
| Figure AFR4Fb, p. 38 | Single-person wages and current costs by coverage. The $45,000 AGI row gives $42,300 of wages and $2,150 of private-coverage costs. | AGI and wages printed in thousands of dollars, annual costs in dollars | Households `HOUSEHOLD_EXAMPLES`, one-person employee rows |
| Figure AFR4Fc, p. 40 | Four-person wages and current costs by coverage. The $110,000 AGI row gives $99,000 of wages, with $4,000 of costs under public-employer coverage. | AGI and wages printed in thousands of dollars, annual costs in dollars | Households `HOUSEHOLD_EXAMPLES` and `FAMILY_MARKET` |
| Figure AFR4Fi, p. 44 | Combined HHCC and EPT by income fifth. Model 4's middle-fifth rate is 8.6%, matching report Table R8. | Percent of income in the modeled distributions | Proposal data `published.combinedByFifth` |

## Legislative Brief

October 15 meeting version. The filename carries October 14, 2026 and the cover is dated
December 2026. It is the earlier briefing copy, followed by a revised brief in the October 29
materials. **686,974 bytes.** SHA-256
`05afbf38af8f23f7d485469ebd1de5cfb587640bfbdb11c29fb1b28c982ad34d`.
[October 15 Legislative Brief PDF](https://www.oregon.gov/uhpgb/Documents/board-meetings/2026/20261015/legislative-brief-10142026.pdf)

| Location | What it provides and spot check | Units and year | Use in this repo |
| --- | --- | --- | --- |
| pp. 8–9 (PDF pp. 9–10), model design table | Counts of tiers and brackets, worker credit, and exemption levels. Model 5 has six household brackets including the exempt bracket. | Counts, percentages, and shares of the poverty level | Proposal data `PUBLISHED_SOURCE` and model design cross-check |
| p. 9 (PDF p. 10), distribution comparison table | Zero-liability share, middle-fifth average net rate, summary maximum, and top 1% liability share. Model 2 has 60.4% of returns with no contribution. | Percent of modeled returns, income, or liability, as labeled | Proposal data `PUBLISHED_SOURCE` and `published` statistics |

## Our calculations, not published figures

- The index `15,960 / 13,590` scales the appendix's fixed bracket thresholds from 2022 to
  2026 using the change in the one-person poverty level. The 2026 amount is in report Table R2.
  The repository inferred the choice of index by matching the 2026 worked examples. The
  repository uses the report's 2026 poverty-level thresholds directly.
- The [proposal spec](src/model/proposal.spec.ts) works out the upper brackets for Model 5 by
  hand at $300,000 for one person and $600,000 for two, plus Model 4 at $600,000 for two.
  The synthetic proposal in that spec is also project-authored.
- The proposal names and blurbs are project wording. The Board identifies its models by
  number. The S-table fixtures' wages are inferred from the employer payment and displayed
  tax rate where applicable. The household comparisons select their own cases, use the
  appendix's $400,000 marketplace cost for the cases beyond that income, and calculate
  model payments using the same schedules as the engine. The 9% rate for private employers
  in those comparisons comes from the Board's worked example. The engine can separately
  calculate the effective rate from annual payroll.
- The statewide bridge, provider-rate adjustment, per-person figures, private spending
  comparisons, and the two sensitivities without a provider-rate change are project
  calculations from the report's inputs. The report's published scenarios supply the
  baseline totals for those comparisons.

## Known discrepancies

- **Table S1, report p. 43.** For $90,000 of income under Model 5, the report prints $3,699.
  The engine gives $3,669 when rounded. The fixture retains the printed value and the
  spec checks the computed result separately.
- **Model 3 rate.** Report Table R4 (p. 38) and the brief (p. 9) give 7.69%. Appendix FR
  p. 33 prints 7.7%. The engine uses 7.69%, which reproduces the scenario payments.
- **Maximum household rates.** Report Table R4 and the brief list 12.0%, 11.7%, and 10.4%
  for Models 1, 4, and 5, respectively. The engine uses the Appendix FR marginal rates
  of 13.5%, 14.3%, and 12.0% (pp. 31, 34, and 35). For Model 1, the report's 12.0% rate
  and 9.89% payroll rate are part of the 2032 Legislative Revenue Office estimate
  (pp. 35–36). The numerical values listed as maxima for Models 4 and 5 equal their
  average net rates for the top 1% in report Table R7.
- **Model 4 distribution.** The quintile block on Appendix FR p. 34 repeats values from
  the Model 3 block on p. 33. Its Model 4 middle-fifth household rate and top 1% liability
  share read 2.5% and 25.3%. The code matches report Tables R7 and R5 and the brief at
  0.8% and 39.9%. The code's 8.6% middle-fifth combined rate agrees with report Table R8
  and Appendix FR Figure AFR4Fi, while the p. 34 block gives 10.4%.
- **Other labels in the draft.** Table E4's internal heading says best estimate. Its
  caption, row total, and Table E9 identify the low estimate used in the code. The
  prose above Table S3 places Model 2 on both sides of the $51,000 comparison. The
  fixture uses the table, where Model 2 is $0 against $620 today. The scenario
  introduction on p. 42 describes AGI as wage-based. In S2 and S3, some reported
  payroll payments imply wages below reported AGI, as reflected in the fixtures.

## Open questions

- The code's public-employer citation pairs the Appendix FR wording with report p. 45.
  The wording is on Appendix FR p. 27. Report p. 45 gives the corresponding effective
  rates in the worked public-employer scenario. Appendix FR also describes applying
  the payroll tiers to each pay period. The code estimates tax from a year's payroll
  using the annual thresholds discussed in the report.
- A Board-specified factor for the fixed bracket thresholds was not verified. The
  Appendix FR figures the code uses for current spending and wages give their
  displayed units, but do not label a common dollar year for those two tables.
- The report does not establish whether continuing public funding is net of Medicare
  Part B premiums paid by Oregonians. The statewide comparison presents Part B
  separately to avoid assuming a treatment the report does not specify.

## Version check

The October 29 entry in the [Board's 2026 meeting archive](https://www.oregon.gov/uhpgb/board-meetings/Pages/2026-meetings.aspx)
points to the October 15 URLs for both appendices. The October 15 draft executive summary
records a vote to approve the report as an account of the Board's work. The downloaded
report still carries its draft label. The October 22 brief and executive summary are newer
versions of those briefing materials. The newer brief repeats the model comparison figures
used here and adds preliminary 2032 revenue projections that are outside this snapshot.
The newer executive summary's $81.2 billion estimate matches the report's $77.7 billion
plan estimate plus $3.5 billion for Part B. The November 19 meeting presentation addresses
report delivery without supplying a replacement set of rates or statewide estimates.
A replacement for the cited report or Appendix FR was not found in the Board materials
reviewed through November 19.

The following PDFs were checked for version history. The numeric source catalog above
follows the code's citations. The separate Appendix Scenarios is distinct from the
report's Tables S1–S4.

| Document and version | Bytes | SHA-256 |
| --- | ---: | --- |
| [Executive Summary draft, posted October 15](https://www.oregon.gov/uhpgb/Documents/board-meetings/2026/20261015/20261015-executive-summary.pdf) | 369,250 | `78398548935e5e06af44a4c1279a433ec6f80c026ae1dd9c9f7e2cdc02e27dcb` |
| [Appendix Scenarios, October 12 draft, posted October 15](https://www.oregon.gov/uhpgb/Documents/board-meetings/2026/20261015/appendix-scenarios-10142026.pdf) | 1,838,384 | `4f33a8f4e7bedd805acf4b1e1d95eb1fd88774a536e073f098fb927be7951979` |
| [Executive Summary, October 22 revision, posted for October 29](https://www.oregon.gov/uhpgb/Documents/board-meetings/2026/20261029/20261022-exec-summ.pdf) | 267,801 | `49eb85bc9f05516cca0787773539bf492232e4cd904b5d612a98320bb2d16080` |
| [Legislative Brief, October 22 revision, posted for October 29](https://www.oregon.gov/uhpgb/Documents/board-meetings/2026/20261029/20261022-legislative-brief.pdf) | 986,291 | `4899e3adf89da1e8c9533452bef6e2a0f2ac90bf6d7521c82aac78b0c23d553d` |
| [November 19 Board meeting presentation](https://www.oregon.gov/uhpgb/Documents/board-meetings/2026/20261119/20261119-UHPGB-board-meeting-presentation.pdf) | 673,166 | `d10e7bc452611d83e70fea407c0bbbbf7adb412f4a8ce9a935259b6ff229f510` |
