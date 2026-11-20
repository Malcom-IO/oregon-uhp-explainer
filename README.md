# Oregon Universal Health Plan explainer and calculator

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

The engine holds no rates or thresholds of its own. Each revenue model is a proposal: a
data file that states its exemption, brackets, rates, payroll tiers, public-employer rule
and worker credit, with the source of its thresholds and of each rule. `src/model/proposal.ts` defines what a proposal
can express and checks a file against it. `src/model/proposals/uhpgb-2026-10.ts` holds the
Board's five models from the October 2026 drafts. A revised model or a "what if" that fits
the schema is a new data file, not a code change:

```ts
import { parseProposal } from './src/model/proposal';
import { bill } from './src/model/uhp-model';

const proposal = parseProposal(JSON.parse(text)); // throws, listing every problem
const result = bill(proposal, 85_000, 2, 'private', 8_500_000);
// result.household, result.gross, result.credit, result.employer
```

## Run the tests

Requires Node 24 or later.

```sh
npm install
npm test
npm run typecheck
```

## Run the calculator

With Node 24, run `npm ci` and `npm run dev`. For a static build, run
`npm run build` and serve `dist/`. To host under a subpath, pass that path to
Vite, for example `npm run build -- --base=/oregon-uhp-explainer/`. Use
`npm run preview` to check the default build locally, or pass the same
`--base` flag to preview a subpath build.

A TypeScript host that bundles CSS imports can use `mount(host, options)` from
`src/widget/index.ts`. The optional settings supply initial household income,
household size, employer kind, and employer payroll. The mount returns a
function that removes the widget and stops observing its chart size. An iframe
can point to the calculator page directly. Give it the title “Oregon Universal
Health Plan calculator” and enough height for the available space. The
calculator scrolls inside the frame as needed.

## License

Code: [MIT](LICENSE). Figures are transcribed from the Board's draft documents,
published on oregon.gov, and cited in the source.
