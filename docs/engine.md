# The calculation engine

`src/model/` holds the calculation engine in plain TypeScript, with no framework. Its
tests reproduce the Board's own worked examples (Tables S1–S4 of the October 2026
legislative report draft) for all five revenue models; see
[How to check this project](review.md#how-the-math-is-tested).

The engine holds no rates or thresholds of its own. Each revenue model is a proposal: a
data file that states its exemption, brackets, rates, payroll tiers, public-employer
rule and worker credit, with the source of its thresholds and of each rule.
`src/model/proposal.ts` defines what a proposal can express and checks a file against
it. `src/model/proposals/uhpgb-2026-10.ts` holds the Board's five models from the
October 2026 drafts. A revised model or a "what if" that fits the schema is a new data
file, not a code change:

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
