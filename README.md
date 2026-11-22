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
`npm run build` and serve `dist/`. To host the page under a subpath, set
`BASE_PATH`, for example `BASE_PATH=/oregon-uhp-explainer/ npm run build`.
Use `npm run preview` to check a build locally, with the same `BASE_PATH`.

The build produces the calculator two ways.

**As a page, for an iframe.** `dist/index.html` is the calculator alone. Point
an iframe at it, give the iframe the title “Oregon Universal Health Plan
calculator” and enough height for the space available. The calculator scrolls
inside the frame as needed. Nothing on the host page has to run a script. The
page follows the reader's light or dark system setting; add `?theme=light` or
`?theme=dark` to the iframe's address to fix its look.

**As a module, mounted in your own page.** `dist/lib/oregon-uhp.js` exports
`mount`, and `dist/lib/oregon-uhp.css` holds the styles. Copy both files to
your site. The script carries the MIT license notice in a comment; keep it.
The page build includes the same notice as `dist/LICENSE.txt`.

```html
<link rel="stylesheet" href="/your-path/oregon-uhp.css">
<div id="uhp-calculator"></div>
<script type="module">
  import { mount } from '/your-path/oregon-uhp.js';
  mount(document.getElementById('uhp-calculator'), { theme: 'light', headingLevel: 2 });
</script>
```

`mount(host, options)` replaces the host element's contents and returns a
function that removes the calculator. A project that bundles TypeScript and
CSS imports can import `mount` from `src/widget/index.ts` instead. Options, all
optional:

| Option | Meaning |
| --- | --- |
| `theme` | `'light'`, `'dark'` or `'auto'`. `auto`, the default, follows the reader's system setting. Name a theme if your page has one fixed look. |
| `headingLevel` | `1`, `2` or `3`: the heading level of the calculator's title. The default is `2`. Headings inside the calculator follow from it. |
| `initialIncome`, `initialHouseholdSize`, `initialEmployer`, `initialPayroll` | Starting values. A value the matching field would not accept is ignored. |

Every style rule is scoped under the `.oregon-uhp` class and every inner class
starts with `uhp-`, so the calculator's styles do not reach the host page. The
reverse is not complete: a host rule that uses an id or `!important`, or that
sets a property the calculator leaves alone, still applies inside it. Check the
result on your page, or use the iframe. Text and spacing follow the host element's font size, except
the chart's axis labels, which are a fixed 12 pixels. The
calculator sends nothing over the network and stores nothing: entries stay in
the reader's browser.

## License

Code: [MIT](LICENSE). Figures are transcribed from the Board's draft documents,
published on oregon.gov, and cited in the source.
