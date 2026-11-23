<!-- Generated from the calculator's data by `npm run numbers`. Do not edit by hand. -->

# Check the numbers

Everything the calculator computes from, and the Board's own worked examples beside
the calculator's results, on one page. It is generated from the same data the
calculator runs on, and a test fails if this page and that data ever disagree, so
what you check here is what the calculator uses.

Source snapshot: the Universal Health Plan Governance Board's October 2026 draft
documents. Each document's address, date and checksum are in
[SOURCES.md](../SOURCES.md).

The calculator is unofficial while it is being reviewed. The Board has asked for the
calculator's numbers to be checked before deciding whether to host it. Until then, it
is not published, reviewed or endorsed by the Board or the State of Oregon.

**The quickest check is section 4:** the Board printed what a household would pay
under each model in report Tables S1 to S4.
The calculator reproduces 94 of those cells, each within $3.
One more cell appears to be a misprint in the report.

## 1. The household contribution

The tax each household would pay on its income, in place of premiums. Each slice of
income above the exemption is taxed at that slice's rate; the worker credit is then
subtracted, and the result is never below zero.

| Model | No contribution below | Rates above that, lowest first | Worker credit |
| --- | --- | --- | --- |
| Model 1 | 200% FPL | 13.5% | 50% of the employer's payroll tax on your wages |
| Model 2 | 200% FPL | 12.05% | 50% of the employer's payroll tax on your wages |
| Model 3 | 200% FPL | 7.69% | None |
| Model 4 | 138% FPL | 3%, 9%, 12%, 14.3% | 50% of the employer's payroll tax on your wages |
| Model 5 | 138% FPL | 2%, 4.78%, 7%, 9%, 12% | None |

Where each rate starts, in 2026 dollars, by household size:

| Model | Rate | 1 person | 2 people | 3 people | 4 people | 5 people |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Model 1 | 13.5% | $31,920 | $43,280 | $54,640 | $66,000 | $77,360 |
| Model 2 | 12.05% | $31,920 | $43,280 | $54,640 | $66,000 | $77,360 |
| Model 3 | 7.69% | $31,920 | $43,280 | $54,640 | $66,000 | $77,360 |
| Model 4 | 3% | $22,025 | $29,863 | $37,702 | $45,540 | $53,378 |
|  | 9% | $31,920 | $43,280 | $54,640 | $66,000 | $77,360 |
|  | 12% | $58,720 | $117,439 | $117,439 | $117,439 | $117,439 |
|  | 14.3% | $117,439 | $234,879 | $234,879 | $234,879 | $234,879 |
| Model 5 | 2% | $22,025 | $29,863 | $37,702 | $45,540 | $53,378 |
|  | 4.78% | $31,920 | $43,280 | $54,640 | $66,000 | $77,360 |
|  | 7% | $58,720 | $117,439 | $117,439 | $117,439 | $117,439 |
|  | 9% | $117,439 | $234,879 | $234,879 | $234,879 | $234,879 |
|  | 12% | $234,879 | $469,757 | $469,757 | $469,757 | $469,757 |

- The exemptions are 200% and 138% of the 2026 federal poverty level, from report
  Table R2.
- The appendix gives the higher brackets in 2022 dollars (Appendix FR, pages 31 to
  35), for one person and twice that for two or more. The calculator brings them to
  2026 by 15,960 / 13,590, the growth in the one-person poverty level. **This
  factor is the project's inference, not a published figure**: the appendix says the
  brackets are inflation adjusted without giving a factor, and this one reproduces the
  Board's examples.
- The rates are from Appendix FR and report Tables R3 and R4. Model 3 uses 7.69%, the
  unrounded figure in Table R4; the appendix prints 7.7%. The report's summary table
  lists different top rates for Models 1, 4 and 5; [SOURCES.md](../SOURCES.md)
  explains why the calculator uses the appendix's.

## 2. The employer payroll tax

| Model | Private employers | Public employers |
| --- | --- | --- |
| Model 1 | 9.6% of payroll above $500,000 | 9.6% from the first dollar |
| Model 2 | 9.6% above $500,000, 14% above $10 million | 14% from the first dollar |
| Model 3 | 9.6% above $500,000, 14% above $10 million | 14% from the first dollar |
| Model 4 | 9.6% above $500,000, 14% above $10 million | 14% from the first dollar |
| Model 5 | 9.6% above $500,000, 14% above $10 million | 14% from the first dollar |

Payroll up to $500,000 is untaxed for private employers, and each rate applies
only to the payroll above its threshold, so there is no cliff. Source: report Table
R4; for public employers, Appendix FR page 27, with the effective rates in the
report's worked example on page 45.

The tax at five payroll sizes, and its share of payroll:

| Yearly payroll | Model 1 | Model 2 | Model 3 | Model 4 | Model 5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| $420,000 | $0 (0%) | $0 (0%) | $0 (0%) | $0 (0%) | $0 (0%) |
| $1,100,000 | $57,600 (5.2%) | $57,600 (5.2%) | $57,600 (5.2%) | $57,600 (5.2%) | $57,600 (5.2%) |
| $8,500,000 | $768,000 (9%) | $768,000 (9%) | $768,000 (9%) | $768,000 (9%) | $768,000 (9%) |
| $20,000,000 | $1,872,000 (9.4%) | $2,312,000 (11.6%) | $2,312,000 (11.6%) | $2,312,000 (11.6%) | $2,312,000 (11.6%) |
| $190,000,000 | $18,192,000 (9.6%) | $26,112,000 (13.7%) | $26,112,000 (13.7%) | $26,112,000 (13.7%) | $26,112,000 (13.7%) |

When an employer pays the household's wages, the worker credit is the model's credit
share times the employer's tax rate on those wages: the employer's whole tax divided
by its whole payroll.

## 3. Figures the Board published for each model

Quoted on the explainer page, not computed by the calculator. Source: report Tables
R4, R5, R7 and R8, the legislative brief (page 9) and Appendix FR Figure AFR4Fi. The
middle-fifth and payroll-tax columns are shares of income; the top 1% column is that
group's share of all household contributions.

| Model | Tax returns owing nothing | Middle fifth: household contribution, share of income | Top 1%: share of all household contributions | With the payroll tax, share of income, lowest to top fifth |
| --- | --- | --- | --- | --- |
| Model 1 | 54.5% | 2% | 30.7% | 7.6%, 6.1%, 8.1%, 10.4%, 13.5% |
| Model 2 | 60.4% | 1.1% | 33.9% | 9.7%, 7.8%, 8.9%, 10.5%, 13% |
| Model 3 | 40.3% | 2.5% | 25.3% | 9.7%, 8.1%, 10.4%, 11.4%, 12.2% |
| Model 4 | 64.9% | 0.8% | 39.9% | 9.7%, 7.8%, 8.6%, 9.7%, 13.5% |
| Model 5 | 31.2% | 2% | 35.6% | 9.7%, 8.2%, 9.9%, 10.4%, 12.8% |

## 4. The Board's worked examples beside the calculator

Each row is one cell of the Board's tables: what the Board printed, what the
calculator's engine gives for the same household, and the difference in dollars. The
figures use each table's own setup, stated above it. In Table S2 that is the Board's
rounded 9% payroll tax rate; the calculator page works the rate out from the payroll
($8.5 million gives 9.04%), so typing the same couple into it gives figures that
differ from this table by up to about $35.

### Table S1, report page 43: Self-employed

One 45-year-old, self-employed or at a small firm, buying their own insurance. No employer pays payroll tax on this income, so there is no worker credit.

| Income | Wages | Model | Board | Calculator | Difference |
| --- | ---: | --- | ---: | ---: | ---: |
| $20,000 |  | Model 1 | 0 | 0 | 0 |
|  |  | Model 2 | 0 | 0 | 0 |
|  |  | Model 3 | 0 | 0 | 0 |
|  |  | Model 4 | 0 | 0 | 0 |
|  |  | Model 5 | 0 | 0 | 0 |
| $45,000 |  | Model 1 | 1,766 | 1,766 | 0 |
|  |  | Model 2 | 1,576 | 1,576 | 0 |
|  |  | Model 3 | 1,006 | 1,006 | 0 |
|  |  | Model 4 | 1,474 | 1,474 | 0 |
|  |  | Model 5 | 823 | 823 | 0 |
| $90,000 |  | Model 1 | 7,841 | 7,841 | 0 |
|  |  | Model 2 | 6,999 | 6,999 | 0 |
|  |  | Model 3 | 4,466 | 4,466 | 0 |
|  |  | Model 4 | 6,462 | 6,462 | 0 |
|  |  | Model 5 | 3,699 | 3,669 | -30 (likely misprint, see below) |
| $180,000 |  | Model 1 | 19,991 | 19,991 | 0 |
|  |  | Model 2 | 17,844 | 17,844 | 0 |
|  |  | Model 3 | 11,387 | 11,387 | 0 |
|  |  | Model 4 | 18,701 | 18,701 | 0 |
|  |  | Model 5 | 11,220 | 11,220 | 0 |

### Table S2, report page 44: Private employer

A household of two, insured through a private employer with an $8.5 million payroll. The employer pays the rounded 9% payroll tax rate the Board shows for an $8.5 million payroll; the wages are the ones that rate implies.

| Income | Wages | Model | Board | Calculator | Difference |
| --- | ---: | --- | ---: | ---: | ---: |
| $40,000 | $40,000 | Model 1 | 0 | 0 | 0 |
|  |  | Model 2 | 0 | 0 | 0 |
|  |  | Model 3 | 0 | 0 | 0 |
|  |  | Model 4 | 0 | 0 | 0 |
|  |  | Model 5 | 203 | 203 | 0 |
| $85,000 | $80,000 | Model 1 | 2,032 | 2,032 | 0 |
|  |  | Model 2 | 1,427 | 1,427 | 0 |
|  |  | Model 3 | 3,208 | 3,208 | 0 |
|  |  | Model 4 | 557 | 557 | 0 |
|  |  | Model 5 | 2,263 | 2,263 | 0 |
| $110,000 | $100,000 | Model 1 | 4,507 | 4,507 | 0 |
|  |  | Model 2 | 3,540 | 3,540 | 0 |
|  |  | Model 3 | 5,131 | 5,131 | 0 |
|  |  | Model 4 | 1,907 | 1,907 | 0 |
|  |  | Model 5 | 3,458 | 3,458 | 0 |
| $170,000 | $150,000 | Model 1 | 10,357 | 10,357 | 0 |
|  |  | Model 2 | 8,520 | 8,520 | 0 |
|  |  | Model 3 | 9,745 | 9,745 | 0 |
|  |  | Model 4 | 6,634 | 6,634 | 0 |
|  |  | Model 5 | 7,492 | 7,492 | 0 |
| $220,000 | $200,000 | Model 1 | 14,857 | 14,857 | 0 |
|  |  | Model 2 | 12,295 | 12,295 | 0 |
|  |  | Model 3 | 13,590 | 13,590 | 0 |
|  |  | Model 4 | 10,384 | 10,384 | 0 |
|  |  | Model 5 | 10,992 | 10,992 | 0 |

### Table S3, report pages 45–46: Public employer

One person working for a public employer. A public employer pays the top payroll rate from the first dollar: 9.6% under Model 1 and 14% under the others.

| Income | Wages | Model | Board | Calculator | Difference |
| --- | ---: | --- | ---: | ---: | ---: |
| $40,000 | $40,000 | Model 1 | 0 | 0 | 0 |
|  |  | Model 2 | 0 | 0 | 0 |
|  |  | Model 3 | 621 | 621 | 0 |
|  |  | Model 4 | 0 | 0 | 0 |
|  |  | Model 5 | 581 | 584 | +3 |
| $51,000 | $50,000 | Model 1 | 176 | 176 | 0 |
|  |  | Model 2 | 0 | 0 | 0 |
|  |  | Model 3 | 1,467 | 1,467 | 0 |
|  |  | Model 4 | 0 | 0 | 0 |
|  |  | Model 5 | 1,110 | 1,110 | 0 |
| $66,000 | $64,000 | Model 1 | 1,529 | 1,529 | 0 |
|  |  | Model 2 | 0 | 0 | 0 |
|  |  | Model 3 | 2,621 | 2,621 | 0 |
|  |  | Model 4 | 0 | 0 | 0 |
|  |  | Model 5 | 1,989 | 1,989 | 0 |
| $85,000 | $80,000 | Model 1 | 3,326 | 3,326 | 0 |
|  |  | Model 2 | 796 | 796 | 0 |
|  |  | Model 3 | 4,082 | 4,082 | 0 |
|  |  | Model 4 | 262 | 262 | 0 |
|  |  | Model 5 | 3,319 | 3,319 | 0 |
| $110,000 | $100,000 | Model 1 | 5,741 | 5,741 | 0 |
|  |  | Model 2 | 2,409 | 2,409 | 0 |
|  |  | Model 3 | 6,004 | 6,004 | 0 |
|  |  | Model 4 | 1,862 | 1,862 | 0 |
|  |  | Model 5 | 5,069 | 5,069 | 0 |

### Table S4, report pages 46–47: On Medicare

A household of two on Medicare, living on Social Security and other non-wage income. The income is not wages, so there is no worker credit. Income is adjusted gross income without the federally taxed part of Social Security.

| Income | Wages | Model | Board | Calculator | Difference |
| --- | ---: | --- | ---: | ---: | ---: |
| $45,000 |  | Model 1 | 232 | 232 | 0 |
|  |  | Model 2 | 207 | 207 | 0 |
|  |  | Model 3 | 132 | 132 | 0 |
|  |  | Model 4 | 557 | 557 | 0 |
|  |  | Model 5 | 351 | 351 | 0 |
| $75,000 |  | Model 1 | 4,282 | 4,282 | 0 |
|  |  | Model 2 | 3,822 | 3,822 | 0 |
|  |  | Model 3 | 2,439 | 2,439 | 0 |
|  |  | Model 4 | 3,257 | 3,257 | 0 |
|  |  | Model 5 | 1,785 | 1,785 | 0 |
| $112,500 |  | Model 1 | 9,345 | 9,345 | 0 |
|  |  | Model 2 | 8,341 | 8,341 | 0 |
|  |  | Model 3 | 5,323 | 5,323 | 0 |
|  |  | Model 4 | 6,632 | 6,632 | 0 |
|  |  | Model 5 | 3,577 | 3,577 | 0 |
| $162,000 |  | Model 1 | 16,027 | 16,027 | 0 |
|  |  | Model 2 | 14,306 | 14,306 | 0 |
|  |  | Model 3 | 9,130 | 9,130 | 0 |
|  |  | Model 4 | 12,424 | 12,424 | 0 |
|  |  | Model 5 | 6,932 | 6,932 | 0 |
| $215,000 |  | Model 1 | 23,182 | 23,182 | 0 |
|  |  | Model 2 | 20,692 | 20,692 | 0 |
|  |  | Model 3 | 13,205 | 13,205 | 0 |
|  |  | Model 4 | 18,784 | 18,784 | 0 |
|  |  | Model 5 | 10,642 | 10,642 | 0 |

The one cell outside $3, which looks like a misprint in the report: Table S1 at $90,000, Model 5: the report prints 3,699 where its own schedule gives 3,669. The same model fits the Board's other cells, so the calculator keeps its own figure. It is listed under "Known discrepancies" in [SOURCES.md](../SOURCES.md).

## 5. Found a problem?

Open an [issue](https://github.com/Malcom-IO/oregon-uhp-explainer/issues/new?body=%3C!--%0AThis%20project%20explains%20what%20the%20Universal%20Health%20Plan%20Governance%20Board%27s%20documents%20say.%20It%0Atakes%20no%20position%20on%20the%20plan%2C%20it%20is%20not%20run%20by%20the%20Board%2C%20and%20the%20Board%20does%20not%20see%20these%0Aissues.%20To%20tell%20the%20Board%20what%20it%20should%20decide%2C%20use%20its%20public%20comment%20process%3A%0Ahttps%3A%2F%2Fwww.oregon.gov%2Fuhpgb%2FPages%2Fpublic-comment.aspx%0A%0AIssues%20here%20are%20for%20making%20the%20site%20accurate%20and%20clear%3A%20a%20wrong%20number%2C%20a%20missing%20source%2C%20or%0Aa%20sentence%20that%20misreads%20a%20document.%20Fill%20in%20what%20you%20can%3B%20it%27s%20fine%20to%20leave%20a%20line%20blank.%0AEach%20section%20of%20the%20explainer%20has%20its%20own%20address%20you%20can%20paste%20below%2C%20such%20as%0Ahttps%3A%2F%2Fmalcom-io.github.io%2Foregon-uhp-explainer%2F%23coverage%0APlease%20use%20made-up%20household%20figures%2C%20not%20your%20own.%0A--%3E%0A%0A**Where%20on%20the%20site%3A**%0A%0A**What%20it%20says%20now%3A**%0A%0A**What%20it%20should%20say%2C%20and%20why%3A**%0A%0A**Source%20%28document%2C%20page%20and%20table%29%2C%20if%20you%20have%20one%3A**%0A). Say which number, where you saw it (this page, the
calculator or the explainer), what you expected and the document and page you are
checking against. Please use made-up household figures, not your own. Issues and the
changes that answer them are public.

To run the same checks yourself: install Node 24, then `npm install` and `npm test`.
The tests that reproduce the Board's tables are in
[src/model/uhp-model.spec.ts](../src/model/uhp-model.spec.ts), and the five models
are in [src/model/proposals/uhpgb-2026-10.ts](../src/model/proposals/uhpgb-2026-10.ts).
