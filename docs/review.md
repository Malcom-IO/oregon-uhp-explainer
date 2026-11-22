# How to check this project

Anyone weighing a proposal like this should be able to check the math, and should not
have to trust whoever built the calculator. So everything here is public.

## How the numbers are sourced

- **The code and the data are open source.** Every rate, threshold and rule the
  calculator uses is in [`src/model/proposals/`](../src/model/proposals/), each with the
  document and table it comes from. Nothing is computed on a server; the calculator
  runs in your browser from this code.
- **The calculator's figures trace to public documents.** [SOURCES.md](../SOURCES.md)
  lists each Board document the code uses with its address on oregon.gov, the page and
  table of each figure, and a checksum that shows if a document is changed later.
  Figures quoted in the explainer's text are cataloged there with verification notes.
  Figures that are this project's own arithmetic are labeled as such there.
- **Where this project and a Board document disagree,** SOURCES.md says so under
  "Known discrepancies".

## How the math is tested

The tests reproduce the worked household examples in the Board's draft report
(Tables S1–S4 of the October 2026 legislative report draft) for all five models, each
cell within $4, apart from one cell the report appears to misprint (Table S1, $90,000,
Model 5: the report prints 3,699 where its own schedule gives 3,669). The tests also
check that the statewide cost tables add up, and that each figure in the explainer's
text that is marked as computed from the model still matches it.

To run them yourself, with Node 24 or later:

```sh
npm install
npm test
npm run typecheck
```

## How to report a problem

If a number is wrong or a description is unfair, open an
[issue](https://github.com/Malcom-IO/oregon-uhp-explainer/issues). Issues and the
changes that answer them are visible to everyone. Please use made-up household figures
in a report, not your own.

## Impartial and unofficial

The project takes no position on the plan. For the same household, some models cost
more than what people pay today and some cost less, and the calculator shows whichever
it is. The explainer describes what the Board's documents say, including what they
leave unsettled.

It is unofficial. It is not published, reviewed or endorsed by the Board or the State
of Oregon.

## Privacy

No account, no analytics, no advertising, no cookies. The calculator sends nothing
over the network and stores nothing: what you type stays in your browser.

## What it cannot tell you

- The models are drafts and may change. The Board's final report may change the
  numbers.
- The results are estimates of the contribution and payroll tax in those drafts, not a
  prediction of what a household would finally pay or save.
- The calculator makes simplifying assumptions, stated beside its results (for
  example, that all household income is wages when an employer is selected, and that
  pay stays the same).
