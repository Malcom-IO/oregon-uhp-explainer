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

[Check the numbers](numbers.md) lists every input and sets each of the Board's worked
examples beside the calculator's result.

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

The calculator's cards also show the amount before the worker credit and the credit
itself. The Board publishes no credit amounts, so these are the project's arithmetic.
The card prints the credit as the rounded amount before it minus the rounded bill, so
the three figures add up; that can differ by $1 from the unrounded credit the engine
returns, and a credit under 50 cents is not shown.

## How to report a problem

If a number is wrong or a description is unfair, open an
[issue](https://github.com/Malcom-IO/oregon-uhp-explainer/issues/new?body=%3C!--%0AThis%20project%20explains%20what%20the%20Universal%20Health%20Plan%20Governance%20Board%27s%20documents%20say.%20It%0Atakes%20no%20position%20on%20the%20plan%2C%20it%20is%20not%20run%20by%20the%20Board%2C%20and%20the%20Board%20does%20not%20see%20these%0Aissues.%20To%20tell%20the%20Board%20what%20it%20should%20decide%2C%20use%20its%20public%20comment%20process%3A%0Ahttps%3A%2F%2Fwww.oregon.gov%2Fuhpgb%2FPages%2Fpublic-comment.aspx%0A%0AIssues%20here%20are%20for%20making%20the%20site%20accurate%20and%20clear%3A%20a%20wrong%20number%2C%20a%20missing%20source%2C%20or%0Aa%20sentence%20that%20misreads%20a%20document.%20Fill%20in%20what%20you%20can%3B%20it%27s%20fine%20to%20leave%20a%20line%20blank.%0AEach%20section%20of%20the%20explainer%20has%20its%20own%20address%20you%20can%20paste%20below%2C%20such%20as%0Ahttps%3A%2F%2Fmalcom-io.github.io%2Foregon-uhp-explainer%2F%23coverage%0APlease%20use%20made-up%20household%20figures%2C%20not%20your%20own.%0A--%3E%0A%0A**Where%20on%20the%20site%3A**%0A%0A**What%20it%20says%20now%3A**%0A%0A**What%20it%20should%20say%2C%20and%20why%3A**%0A%0A**Source%20%28document%2C%20page%20and%20table%29%2C%20if%20you%20have%20one%3A**%0A). Issues and the
changes that answer them are visible to everyone. Please use made-up household figures
in a report, not your own.

## Impartial and unofficial

The project takes no position on the plan. For the same household, some models cost
more than what people pay today and some cost less, and the calculator shows whichever
it is. The explainer describes what the Board's documents say, including what they
leave unsettled.

It is unofficial while it is being reviewed. The Board has asked for the calculator's numbers
to be checked before deciding whether to host it. Until then, it is not published,
reviewed or endorsed by the Board or the State of Oregon.

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
