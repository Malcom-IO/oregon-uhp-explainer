# Oregon Universal Health Plan calculator

> **Work in progress.** This repository is being extracted from the explainer at
> [www.malcom.io/oregon-universal-health-plan](https://www.malcom.io/oregon-universal-health-plan).
> Until the first release, treat its numbers as unverified and use that page instead.

A plain-language explainer and household calculator for Oregon's proposed Universal
Health Plan, built on the revenue models published by the Universal Health Plan
Governance Board. It is independent work and is not affiliated with or endorsed by
the State of Oregon or the Board.

## What is here so far

`src/model/` holds the calculation engine in plain TypeScript, with no framework. Its
tests reproduce the Board's own worked examples (Tables S1–S4 of the October 2026
legislative report draft) for all five revenue models, each cell within $4, except one
cell the report appears to misprint (Table S1, $90,000, Model 5: the report prints
3,699 where its own schedule gives 3,669). The tests also check that the statewide
cost tables add up.

## Run the tests

Requires Node 24 or later.

```sh
npm install
npm test
npm run typecheck
```

## License

Code: [MIT](LICENSE). Figures are transcribed from the Board's draft documents,
published on oregon.gov, and cited in the source.
