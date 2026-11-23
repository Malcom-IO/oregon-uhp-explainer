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
  [open an issue](https://github.com/Malcom-IO/oregon-uhp-explainer/issues/new?body=%3C!--%0AThis%20project%20explains%20what%20the%20Universal%20Health%20Plan%20Governance%20Board%27s%20documents%20say.%20It%0Atakes%20no%20position%20on%20the%20plan%2C%20it%20is%20not%20run%20by%20the%20Board%2C%20and%20the%20Board%20does%20not%20see%20these%0Aissues.%20To%20tell%20the%20Board%20what%20it%20should%20decide%2C%20use%20its%20public%20comment%20process%3A%0Ahttps%3A%2F%2Fwww.oregon.gov%2Fuhpgb%2FPages%2Fpublic-comment.aspx%0A%0AIssues%20here%20are%20for%20making%20the%20site%20accurate%20and%20clear%3A%20a%20wrong%20number%2C%20a%20missing%20source%2C%20or%0Aa%20sentence%20that%20misreads%20a%20document.%20Fill%20in%20what%20you%20can%3B%20it%27s%20fine%20to%20leave%20a%20line%20blank.%0AEach%20section%20of%20the%20explainer%20has%20its%20own%20address%20you%20can%20paste%20below%2C%20such%20as%0Ahttps%3A%2F%2Fmalcom-io.github.io%2Foregon-uhp-explainer%2F%23coverage%0APlease%20use%20made-up%20household%20figures%2C%20not%20your%20own.%0A--%3E%0A%0A**Where%20on%20the%20site%3A**%0A%0A**What%20it%20says%20now%3A**%0A%0A**What%20it%20should%20say%2C%20and%20why%3A**%0A%0A**Source%20%28document%2C%20page%20and%20table%29%2C%20if%20you%20have%20one%3A**%0A). Everyone
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

## What this project is not

- **Not the Board.** It is not run, reviewed or endorsed by the Universal Health Plan
  Governance Board or the State of Oregon.
- **Not a way to reach the Board.** Issues here go to this project, and the Board does not
  see them. To tell the Board what it should decide, use its
  [public comment process](https://www.oregon.gov/uhpgb/Pages/public-comment.aspx).
- **Not a place to argue for or against the plan.** Issues are for making the site
  accurate and clear: a wrong number, a missing source, a sentence that misreads a
  document. Requests to recommend a policy, or to favor a model, are closed with a
  pointer to the Board's public comment process.

## Go deeper

| Document | What is in it |
| --- | --- |
| [Check the numbers](docs/numbers.md) | Every input the calculator uses, with its source, and each of the Board's worked examples beside the calculator's result |
| [How to check this project](docs/review.md) | How the numbers are sourced and tested, how to run the tests, and the limits of the results |
| [SOURCES.md](SOURCES.md) | Every Board document used, with addresses, page references, checksums and known discrepancies |
| [Reuse the calculator](docs/reuse.md) | Run it locally, embed it in an iframe or as a module (also on npm as `oregon-uhp-explainer`), its options, colors and themes |
| [The explainer page](docs/explainer-page.md) | How the page is built, and how to edit or translate it without breaking a number |
| [The calculation engine](docs/engine.md) | How the five models are stored as data, and how to add a revised model |
| [CHANGELOG.md](CHANGELOG.md) and [releases](https://github.com/Malcom-IO/oregon-uhp-explainer/releases) | Each version, the source snapshot it is built on, and its downloadable files: the calculator library, the PDF and the site as a ZIP |
| [LICENSE](LICENSE) and [LICENSE-CONTENT.md](LICENSE-CONTENT.md) | What you may do with the code and the text, and how to credit it |

## Cite it

If you publish results, please cite the project and the source snapshot:

> Oregon Universal Health Plan explainer and calculator (unofficial), version 0.1.0,
> October 2026 drafts snapshot. https://github.com/Malcom-IO/oregon-uhp-explainer

Maintained by Marcus Malcom (Malcom IO LLC).
