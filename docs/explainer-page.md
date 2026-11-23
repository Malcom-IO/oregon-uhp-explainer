# The explainer page

`index.html` at the repository root is the explainer: its prose is plain HTML
that reads complete with JavaScript off, inside one element with the class
`uhp-page`. Its code is in `src/site/`. To build and preview it, see
[Reuse the calculator](reuse.md#run-it-locally).

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
  households (all four show without it), a light and dark button that is not
  remembered (delete the `data-uhp-theme-switch` element to leave it out), the
  page title in the bar at the top once the title scrolls away (delete the
  `data-uhp-bar` element to leave the bar out), and `?theme=light` or
  `?theme=dark` (`src/site/main.ts`).
- **Styles** are in `src/site/site.css`, every rule under `.uhp-page`, with the
  calculator's `--uhp-*` color properties and the same defaults. Set them on
  `.uhp-page` or above it and the page and both calculators follow. The page
  opens in light colors because `.uhp-page` carries `data-uhp-theme="light"`;
  set it to `"dark"` to open dark, or remove it to follow the reader's device
  setting. The light and dark button still switches either way.

The page's text is under [CC BY 4.0](../LICENSE-CONTENT.md); its markup, styles
and scripts are under the [MIT license](../LICENSE).
