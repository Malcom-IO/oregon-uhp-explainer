# Changelog

Each version names two things: the software version, and the source snapshot, the
set of Universal Health Plan Governance Board documents its numbers come from. A
change of snapshot changes numbers; read its notes before relying on a figure.

## Unreleased

- **How the five models compare:** a page at `/compare/` with the five models side by
  side: the Legislative Revenue Office's preliminary 2032 projection for each against the
  $30 billion and $39 billion needs, what a household would pay (the calculator's figure),
  and who pays across incomes, with the top fifth broken down. Its who-pays figures are
  tested against the Board's published ones. The 2032 projections come from the
  October 22 legislative brief, outside the source snapshot. [docs/compare.md](docs/compare.md)

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
