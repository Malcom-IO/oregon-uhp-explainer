# Oregon Universal Health Plan explainer and calculator

> **Draft.** Built on the Board's October 2026 draft documents. There is no tagged
> release yet, and the Board's final report may change the numbers.

A plain-language explainer and household calculator for Oregon's proposed Universal
Health Plan. It applies the five financing models in the Universal Health Plan
Governance Board's October 2026 draft report to a household or an employer and shows
the result under each one.

It is unofficial. It is not published, reviewed or endorsed by the Board or the State
of Oregon, and it takes no position on the plan.

## Open to review

Anyone weighing a proposal like this should be able to check the math, and should not
have to trust whoever built the calculator. So everything here is public:

- **The code and the data are open source.** Every rate, threshold and rule the
  calculator uses is in [`src/model/proposals/`](src/model/proposals/), each with the
  document and table it comes from. Nothing is computed on a server; the calculator
  runs in your browser from this code.
- **The calculator's figures trace to public documents.** [SOURCES.md](SOURCES.md) lists
  each Board document the code uses with its address on oregon.gov, the page and table
  of each figure, and a checksum that shows if a document is changed later. Figures
  quoted only in the explainer's text are not all cataloged there yet. Figures that are this
  project's own arithmetic are labeled as such there.
- **The math is tested against the Board's own examples.** The tests reproduce the
  worked household examples in the Board's draft report (Tables S1–S4) for all five
  models, each within $4, apart from one cell the report appears to misprint. Run
  `npm test` to see it. Where this project and a Board document disagree,
  SOURCES.md says so under "Known discrepancies".
- **It takes no position on the plan.** For the same household, some models cost
  more than what people pay today and some cost less, and the calculator shows
  whichever it is. The explainer describes what the Board's documents say, including
  what they leave unsettled.
- **It collects nothing.** No account, no analytics, no advertising, no cookies. What
  you type stays in your browser.
- **Corrections are public.** If a number is wrong or a description is unfair, open an
  [issue](https://github.com/Malcom-IO/oregon-uhp-explainer/issues). Issues and the
  changes that answer them are visible to everyone. Please use made-up household
  figures in a report, not your own.

What it cannot tell you: the models are drafts and may change; the results are
estimates of the contribution and payroll tax in those drafts, not a prediction of
what a household would finally pay or save; and the calculator makes simplifying
assumptions, stated beside its results (for example, that all household income is
wages when an employer is selected, and that pay stays the same).

Maintained by Marcus Malcom (Malcom IO LLC).

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

The build produces a small site: the explainer at the root, the calculator
alone at `calculator/`, and `demo/`, a page that shows each way of embedding
the calculator with working examples. The demo page loads the built library,
so open it from a build (`npm run build`, then `npm run preview`), not from
`npm run dev`.

The calculator can be reused two ways.

**As a page, for an iframe.** `dist/calculator/index.html` is the calculator
alone. Point an iframe at it, give the iframe the title “Oregon Universal
Health Plan calculator (unofficial)” and enough height for the space available. The calculator scrolls
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
| `show` | `'all'` (the default), `'household'` or `'employer'`: which calculator to show. |
| `header` | `false` leaves out the title, the source snapshot line and the “unofficial” note. The page around the calculator must then state all three itself. |
| `initialIncome`, `initialHouseholdSize`, `initialEmployer`, `initialPayroll` | Starting values. A value the matching field would not accept is ignored. |

**Colors and font.** The defaults are a white background with dark text, and a
dark equivalent. Every color is a CSS custom property that a host can set on
the calculator's element or anywhere above it: `--uhp-surface`, `--uhp-paper`,
`--uhp-ink`, `--uhp-muted`, `--uhp-line`, `--uhp-control-line`, `--uhp-grid`,
`--uhp-accent`, `--uhp-status`, `--uhp-error`, `--uhp-series-1` to
`--uhp-series-5`, and `--uhp-font` for the font family. Unset properties keep
their defaults. If you set colors, also pass `theme: 'light'` or `'dark'`, so
the reader's system setting does not swap in the other defaults, and check the
contrast of what you choose. `demo/` shows an example.

Every style rule is scoped under the `.oregon-uhp` class and every inner class
starts with `uhp-`, so the calculator's styles do not reach the host page. The
reverse is not complete: a host rule that uses an id or `!important`, or that
sets a property the calculator leaves alone, still applies inside it. Check the
result on your page, or use the iframe. Text and spacing follow the host element's font size, except
the chart's axis labels, which are a fixed 12 pixels. The
calculator sends nothing over the network and stores nothing: entries stay in
the reader's browser.

## The explainer page

`index.html` at the repository root is the explainer: its prose is plain HTML
that reads complete with JavaScript off, inside one element with the class
`uhp-page`. Its code is in `src/site/`.

- **To edit or translate the prose,** change `index.html`. Numbers typed there
  are quoted from the Board's documents and stay as typed.
- **A number computed from the model** sits in a keyed span, for example
  `<span data-fig="statewide.rateResetBest">10%</span>`. `src/site/figures.ts`
  maps each key to its text, and `src/site/site.spec.ts` fails if a span and
  the map disagree, if a key is missing from the map, or if a key is unused.
  A translation that writes a number differently changes the span and the map
  together.
- **Tables and charts built from the model** are not in `index.html`. A marker
  comment such as `<!-- uhp:models-table -->` stands where each one goes, and
  a Vite plugin in `vite.config.ts` replaces it with HTML from the matching
  function in `src/site/blocks.ts`, in the dev server and in the build. Their
  wording (captions, column headings, labels) is in `blocks.ts`, and
  `src/site/blocks.spec.ts` checks every cell against the model.
- **Scripts add** the two calculators, a picker over the Board's example
  households (all four show without it), and `?theme=light` or `?theme=dark`
  (`src/site/main.ts`).
- **Styles** are in `src/site/site.css`, every rule under `.uhp-page`, with the
  calculator's `--uhp-*` color properties and the same defaults. Set them on
  `.uhp-page` or above it and the page and both calculators follow; set
  `data-uhp-theme="light"` or `"dark"` on `.uhp-page` to fix the look.

## Use it

The code is under the [MIT license](LICENSE): anyone may use, copy, change and
republish it, including a government agency, a newsroom, an advocacy group on any side,
or a business, as long as the copyright and license notice stays with the copy. You do
not need to ask.

If you publish results or a copy, please cite the project and the source snapshot, so
readers can find the code and the documents behind the numbers:

> Oregon Universal Health Plan explainer and calculator (unofficial), October 2026
> drafts snapshot. https://github.com/Malcom-IO/oregon-uhp-explainer

The figures themselves are transcribed from the Board's draft documents, published on
oregon.gov. See [SOURCES.md](SOURCES.md) for document versions, page references, and
SHA-256 checksums.
