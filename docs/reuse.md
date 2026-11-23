# Reuse the calculator

## Run it locally

With Node 24, run `npm ci` and `npm run dev`. For a static build, run
`npm run build` and serve `dist/`. To host the page under a subpath, set
`BASE_PATH`, for example `BASE_PATH=/oregon-uhp-explainer/ npm run build`.
Use `npm run preview` to check a build locally, with the same `BASE_PATH`.

To make the PDF of the explainer, run `npm run pdf` after the build, with the
same `BASE_PATH`. It needs Chrome or Chromium (set `CHROME_PATH` if it is not
in a usual place) and writes `dist/oregon-uhp-explainer.pdf`, which the page's
"Download this page as a PDF" link points to. Set `PUBLIC_URL` to the address
the site is published at, so the PDF's links and its notes about the
calculators point there; without it the links stay relative. The Pages
workflow sets it to the repository's own Pages address.

The build produces a small site: the explainer at the root, the calculator
alone at `calculator/`, and `demo/`, a page that shows each way of embedding
the calculator with working examples. The demo page loads the built library,
so open it from a build (`npm run build`, then `npm run preview`), not from
`npm run dev`.

The calculator can be reused two ways.

## As a page, for an iframe

`dist/calculator/index.html` is the calculator alone. Point an iframe at it,
give the iframe the title “Oregon Universal Health Plan calculator
(unofficial)” and enough height for the space available. The calculator
scrolls inside the frame as needed. Nothing on the host page has to run a
script. The page follows the reader's light or dark system setting; add
`?theme=light` or `?theme=dark` to the iframe's address to fix its look.

## As a module, mounted in your own page

Each [release](https://github.com/Malcom-IO/oregon-uhp-explainer/releases) has these
three files ready to download, with checksums, so you need not build them yourself.
`dist/lib/oregon-uhp.js` exports `mount`, `dist/lib/oregon-uhp.css` holds
the styles, and `dist/lib/oregon-uhp.d.ts` describes them for TypeScript. Copy the files to your site. The script carries the MIT license
notice in a comment; keep it. The page build includes the same notice as
`dist/LICENSE.txt`.

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
| `sectionTitles` | `false` leaves out the section titles ("Household calculator", "Employer payroll tax calculator") under a heading your page already has. Each section keeps the title as its accessible name, and the headings inside move up a level. |
| `initialCoverage` | `'employer'` (the default), `'own'`, `'medicare'`, `'ohp'` or `'none'`: how the household is covered today. It sets the starting “what you pay now” to the Board's example for that coverage, and the employer it implies. |
| `initialIncome`, `initialHouseholdSize`, `initialEmployer`, `initialPayroll`, `initialCurrentCost` | Starting values. A value the matching field would not accept is ignored. |
| `initialBusinessKind`, `initialBusinessPayroll`, `initialBusinessSpend` | Starting values for the employer calculator: `'private'` or `'public'`, a payroll above zero, and current benefit spending. |

The calculator opens with results already showing: the Board's example couple,
with $85,000 of income, a private employer with an $8.5 million payroll, and the
$4,700 a year the Board says such a couple pays today. The employer calculator
opens with an example $1.1 million payroll and $110,000 of benefit spending,
labeled as an example. Readers change any of it and the results follow as they
type.

## Colors and font

The defaults are a white background with dark text, and a dark equivalent.
Every color is a CSS custom property that a host can set on the calculator's
element or anywhere above it: `--uhp-surface`, `--uhp-paper`, `--uhp-ink`,
`--uhp-muted`, `--uhp-line`, `--uhp-control-line`, `--uhp-grid`,
`--uhp-accent`, `--uhp-status`, `--uhp-error`, `--uhp-series-1` to
`--uhp-series-5`, and `--uhp-font` for the font family. The explainer page also
reads `--uhp-font-mono` for its small labels. Unset properties keep
their defaults. The calculator is at most 72em wide, centered, with padding
around it; set `--uhp-max-width: none` and `--uhp-padding: 0` to have it fill
your column flush with the text around it. If you set colors, also pass `theme: 'light'` or `'dark'`, so
the reader's system setting does not swap in the other defaults, and check the
contrast of what you choose. `demo/` shows an example.

## How it fits into a host page

Every style rule is scoped under the `.oregon-uhp` class and every inner class
starts with `uhp-`, so the calculator's styles do not reach the host page. The
reverse is not complete: a host rule that uses an id or `!important`, or that
sets a property the calculator leaves alone, still applies inside it. Check the
result on your page, or use the iframe. The calculator lays itself out by the
width of its host element, so give the host a width: an ordinary block element
works, and so do `flex: 1` or `width: 100%` inside a flex or grid layout. In a
host that shrinks to fit its content, it falls back to 20em. Text and spacing follow the host
element's font size, except the chart's axis labels, which are a fixed 12
pixels. The calculator sends nothing over the network and stores nothing:
entries stay in the reader's browser.
