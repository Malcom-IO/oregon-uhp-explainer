# Oregon Universal Health Plan explainer and calculator

**Our mission: show any Oregonian, in plain language, what the Board's proposed ways
of paying for the Universal Health Plan would mean for their own household or
business, and do it in the open, so anyone can check every number.**

**[Read the explainer](https://malcom-io.github.io/oregon-uhp-explainer/)** ·
**[Open the calculator](https://malcom-io.github.io/oregon-uhp-explainer/calculator/)** ·
**[Check the numbers](docs/numbers.md)** ·
[See how to embed it](https://malcom-io.github.io/oregon-uhp-explainer/demo/)

> **Draft.** Built on the Universal Health Plan Governance Board's October 2026 draft
> documents. The Board's final report may change the numbers.

## What this project stands for

- **Open source.** All of the code and data are public, and the calculator runs in
  your browser from this code. Nothing is hidden on a server.
  [How it works](docs/engine.md)
- **Every number traces to a public document.** Each rate and figure is cited to the
  Board document, page and table it comes from, with checksums so a changed document
  shows. [SOURCES.md](SOURCES.md)
- **The math is tested against the Board's own examples.** The tests reproduce the
  worked household examples in the Board's draft report for all five models.
  [Every number, and the Board's examples beside the calculator's](docs/numbers.md)
- **Corrections are public.** If a number is wrong or a description is unfair,
  [open an issue](https://github.com/Malcom-IO/oregon-uhp-explainer/issues). Everyone
  can see the report and the change that answers it.
- **Impartial.** The project takes no position on the plan. It shows whatever the
  Board's numbers show, whether a model costs a household more than today or less.
- **Unofficial while it is being reviewed.** The Board has asked for the calculator's numbers
  to be checked before deciding whether to host it. Until then, it is not published,
  reviewed or endorsed by the Board or the State of Oregon.
- **It collects nothing.** No accounts, analytics, advertising or cookies. What you
  type stays in your browser.
- **Free to use.** Anyone may copy, change and republish it, with credit: code under
  the [MIT license](LICENSE), written content under
  [CC BY 4.0](LICENSE-CONTENT.md).

**What it cannot tell you:** the models are drafts, and the results are estimates of
the payments in those drafts, not a prediction of what anyone will finally pay or
save. [The limits, in full](docs/review.md#what-it-cannot-tell-you)

## Go deeper

| Document | What is in it |
| --- | --- |
| [Check the numbers](docs/numbers.md) | Every input the calculator uses, with its source, and each of the Board's worked examples beside the calculator's result |
| [How to check this project](docs/review.md) | How the numbers are sourced and tested, how to run the tests, and the limits of the results |
| [SOURCES.md](SOURCES.md) | Every Board document used, with addresses, page references, checksums and known discrepancies |
| [Reuse the calculator](docs/reuse.md) | Run it locally, embed it in an iframe or as a module, its options, colors and themes |
| [The explainer page](docs/explainer-page.md) | How the page is built, and how to edit or translate it without breaking a number |
| [The calculation engine](docs/engine.md) | How the five models are stored as data, and how to add a revised model |
| [LICENSE](LICENSE) and [LICENSE-CONTENT.md](LICENSE-CONTENT.md) | What you may do with the code and the text, and how to credit it |

## Cite it

If you publish results, please cite the project and the source snapshot:

> Oregon Universal Health Plan explainer and calculator (unofficial), October 2026
> drafts snapshot. https://github.com/Malcom-IO/oregon-uhp-explainer

Maintained by Marcus Malcom (Malcom IO LLC).
