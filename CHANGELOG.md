# Changelog

Each version names two things: the software version, and the source snapshot, the
set of Universal Health Plan Governance Board documents its numbers come from. A
change of snapshot changes numbers; read its notes before relying on a figure.

## Unreleased

Still built on the October 2026 drafts. **No figure has changed:** the calculation engine
and its data (`src/model/`) and the calculator (`src/widget/`) are unchanged since 0.1.0,
and the tests still reproduce the Board's worked examples as before. Planned work is in
the [issues labeled `planned`](https://github.com/Malcom-IO/oregon-uhp-explainer/issues?q=is%3Aissue%20state%3Aopen%20label%3Aplanned).

### New

- **How the five models compare** (#1, contributed by Andy McCullough): a page at
  `/compare/` with the five models side by side: the Legislative Revenue Office's
  preliminary 2032 projection for each against the $30 billion and $39 billion needs, what
  a household would pay (the calculator's figure), and who pays across incomes in fifths
  of people, as the Board defines them, with the top fifth broken down. The page reads
  complete without scripts. Its who-pays figures are tested against the Board's published
  ones within stated bands. The 2032 projections come from the October 22 legislative
  brief, outside the source snapshot. The explainer links to the page after its
  five-models table and in its footer. [docs/compare.md](docs/compare.md)

### Corrections to the explainer

- **"A plan you buy yourself"** (#2, #3; reported by Charlie Swanson). The card said
  insurers "could still sell supplemental coverage," which no source supports. It now
  says what the 2022 Joint Task Force on Universal Health Care recommended (Final Report,
  pp. 27–28): that, as far as the law allows, state-regulated insurers not sell plans that
  replace the state plan or buy faster or better access to its care, while still being
  allowed to cover what it leaves out. Beside that, it gives the legislative brief's
  statement (p. 12) that the Board has not discussed the question. Before this, the
  card's "has not discussed" sentence gained its citation to the brief.

### Sources

- **SOURCES.md** lists the Task Force's final report (September 2022): the Legislature's
  approved copy, with its size, SHA-256 and the passage used. It is not part of the
  source snapshot. The compare page's sources (the October 22 brief's 2032 projections
  and the IRS's 2022 Oregon returns) are listed too.
- **SOURCES.md** now calls the project unofficial ("not published, reviewed or endorsed
  by the Board or the State of Oregon") instead of "independent," matching the rest of
  the project.

### Issues and the README

- **One issue form.** New issues open on a single form. It says the project is not run
  by the Board, that the Board does not see these issues, and links the Board's
  [public comment process](https://www.oregon.gov/uhpgb/Pages/public-comment.aspx). It
  asks for made-up household figures, not real ones, offers an optional category (a
  number or calculation, wording, a source, or something else) and takes a description.
  Blank issues are off. Beside the form, the new-issue menu links to the public comment
  process and to [Check the numbers](docs/numbers.md).
- **Every "open an issue" link** in the page, README and docs opens that form. A test
  holds them all to the same address.
- **"What this project is not"** in the README: not the Board, not a way to reach it,
  and not a place to argue for or against the plan.
- **Planned work** is tracked as issues labeled `planned`, and the README links to the
  list.

### Packaging

- **npm.** The calculator library is published to npm as
  [`oregon-uhp-explainer`](https://www.npmjs.com/package/oregon-uhp-explainer), with the
  same `oregon-uhp.js`, `.css` and `.d.ts` as the GitHub Release, plus a README and
  license. Version 0.1.0 was published there on November 22, 2026. An earlier package
  name, `oregon-uhp-calculator`, is deprecated and points to the new one.
- **Release workflow.** Each tagged release now also stages the npm package, with
  provenance, for approval before it is published. See [docs/releasing.md](docs/releasing.md).
- [docs/reuse.md](docs/reuse.md) covers installing from npm, and notes that a host whose
  bundler moves license comments into a separate file should publish that file.

## 0.1.0 · October 2026 drafts

The first release. Built on the Board's October 2026 draft legislative report, its
Appendix FR, the legislative brief and the ECOnorthwest finance and revenue report,
as listed with checksums in [SOURCES.md](SOURCES.md).

- **Household calculator:** what a household would pay under each of the five draft
  models, beside what it pays today, with a chart and table across incomes. It
  opens on the Board's example couple.
- **Employer calculator:** the payroll tax under each model, beside current benefit
  spending.
- **Explainer page:** a plain-language summary of the draft report, with tables and
  charts computed from the same data, and a PDF of the page.
- **Check the numbers:** [docs/numbers.md](docs/numbers.md) lists every input with
  its source and sets each of the Board's worked examples beside the calculator's
  figure. The calculator reproduces 94 of the 95 published cells within $3; the
  95th appears to be a misprint in the report.
- **Reuse:** the calculator as a module (`oregon-uhp.js`, `oregon-uhp.css`,
  `oregon-uhp.d.ts`) or an iframe page, and the whole site as a ZIP to host. Code
  under the MIT license, written content under CC BY 4.0.

Unofficial while it is being reviewed: not published, reviewed or endorsed by the
Board or the State of Oregon.
