/**
 * The page's tables and charts, as HTML built from the model.
 *
 * Each renderer is a pure function: model data in, an HTML string out. The
 * Vite plugin in vite.config.ts calls `renderBlocks` on index.html, in the
 * dev server and in the build, and each marker comment such as
 * `<!-- uhp:models-table -->` is replaced by its block. The page a reader
 * gets therefore holds every table and chart as plain HTML, with no script.
 *
 * Every chart here is a row of bars beside its own figures in text, so the
 * text carries the same data as the drawing.
 */
import { version } from '../../package.json';
import { HOUSEHOLD_ROWS } from '../model/uhp-households';
import { MODELS, SCENARIOS, payrollTax } from '../model/uhp-model';
import type { RevenueModel, Scenario as BoardExample } from '../model/uhp-model';
import {
  BEST,
  BOARD,
  BRIDGE,
  LOW,
  PRIVATE_TODAY,
  RAISED_IN_OREGON,
  REVENUE_TARGET,
  SCENARIOS_STATEWIDE,
  perPerson,
} from '../model/uhp-statewide';
import type { Raised, Scenario as StatewideScenario, Step } from '../model/uhp-statewide';
import { bn, moreLess, pct, pct1, signed, usd, usd100 } from './format';

// ------------------------------------------------------------------ helpers

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** Text made safe to place in HTML. */
export function esc(text: string | number): string {
  return String(text).replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

/** A bar's length as a CSS width, never outside its track. */
function width(percent: number): string {
  return `width:${Math.min(100, Math.max(0, percent)).toFixed(2)}%`;
}

interface Column {
  label: string;
  /** Right-aligned figures. */
  num?: boolean;
}

/**
 * A table with a caption, inside a region that scrolls sideways on a narrow
 * screen. `rows` are finished `<tr>` strings.
 */
function table(id: string, caption: string, columns: readonly Column[], rows: readonly string[]): string {
  const head = columns
    .map((c) => `<th scope="col"${c.num ? ' class="xp-num"' : ''}>${esc(c.label)}</th>`)
    .join('');
  return (
    `<div class="xp-scroll" role="region" tabindex="0" aria-labelledby="${id}">` +
    `<table class="xp-table"><caption id="${id}">${esc(caption)}</caption>` +
    `<thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`
  );
}

/** A dollar cell marked as less or more than what the household pays today. */
function comparedCell(value: number, now: number, slack: number): string {
  if (value < now - slack) {
    return `<td class="xp-num xp-less"><span class="xp-mark" aria-hidden="true">&darr;</span><span class="xp-vh">Less than today: </span>${usd(value)}</td>`;
  }
  if (value > now + slack) {
    return `<td class="xp-num xp-more"><span class="xp-mark" aria-hidden="true">&uarr;</span><span class="xp-vh">More than today: </span>${usd(value)}</td>`;
  }
  return `<td class="xp-num">${usd(value)}</td>`;
}

const OURS = '<span class="xp-ours">our math</span>';

// ------------------------------------------------------- the five models

/** "One rate: 13.5%" or "Rates: 3%, 9%, 12%, 14.3%". */
export function rateLadder(m: RevenueModel): string {
  const rates = m.rates.map((r) => pct(r, 2));
  return rates.length === 1 ? `One rate: ${rates[0]}` : `Rates: ${rates.join(', ')}`;
}

/** The measures drawn as bars beside each model, each on its own scale. */
const MODEL_METRICS: readonly {
  label: string;
  width: (m: RevenueModel) => number;
  value: (m: RevenueModel) => string;
}[] = [
  {
    label: 'Tax filers who pay nothing',
    width: (m) => m.returnsOwingNothing * 100,
    value: (m) => `${Math.round(m.returnsOwingNothing * 100)} of 100`,
  },
  {
    label: 'Top rate, on the highest slice of income',
    width: (m) => (m.topRate / 0.15) * 100,
    value: (m) => pct(m.topRate, 2),
  },
  {
    label: 'Household contribution, middle fifth',
    width: (m) => (m.middleFifthRate / 0.03) * 100,
    value: (m) => `${pct(m.middleFifthRate)} of income`,
  },
  {
    label: 'With the payroll tax, middle fifth',
    width: (m) => (m.combinedByFifth[2] / 0.12) * 100,
    value: (m) => `${pct(m.combinedByFifth[2])} of income`,
  },
  {
    label: 'Share paid by the top 1%',
    width: (m) => (m.top1Share / 0.45) * 100,
    value: (m) => pct(m.top1Share, 0),
  },
];

/** One card per model: what sets it apart, then five measures as bars with their figures. */
export function modelCards(models: readonly RevenueModel[]): string {
  const cards = models.map((m) => {
    const metrics = MODEL_METRICS.map(
      (k) =>
        `<div class="xp-metric"><dt>${esc(k.label)}</dt>` +
        `<dd><span class="xp-track" aria-hidden="true"><span style="${width(k.width(m))}"></span></span>` +
        `<span class="xp-metric-value">${esc(k.value(m))}</span></dd></div>`,
    ).join('');
    return (
      `<article class="xp-model" data-model="${esc(m.id)}">` +
      `<h4><span class="xp-model-num">Model ${esc(m.id)}</span> ${esc(m.name)}</h4>` +
      `<p>${esc(m.blurb)}</p>` +
      `<ul class="xp-chips">` +
      `<li>${m.creditShare ? 'Worker credit' : 'No worker credit'}</li>` +
      `<li>First ${usd(m.exemptFamilyOf4)} exempt</li>` +
      `<li>${esc(rateLadder(m))}</li>` +
      `</ul>` +
      `<dl class="xp-metrics">${metrics}</dl>` +
      `</article>`
    );
  });
  return `<div class="xp-models">${cards.join('')}</div>`;
}

/** Every headline figure of the five models, one row each. */
export function modelsTable(models: readonly RevenueModel[]): string {
  const rows = models.map(
    (m) =>
      `<tr><th scope="row">${esc(m.id)}</th>` +
      `<td>${esc(m.employerTax)}</td>` +
      `<td class="xp-num">${m.creditShare ? '50%' : 'None'}</td>` +
      `<td class="xp-num">${esc(m.exemption)}</td>` +
      `<td class="xp-num">${m.rates.length === 1 ? 'One' : m.rates.length}</td>` +
      `<td class="xp-num">${pct(m.topRate, 2)}</td>` +
      `<td class="xp-num">${pct(m.returnsOwingNothing)}</td>` +
      `<td class="xp-num">${pct(m.middleFifthRate)}</td>` +
      `<td class="xp-num">${pct(m.top1Share)}</td></tr>`,
  );
  return table(
    'xp-models-caption',
    'The five revenue models',
    [
      { label: 'Model' },
      { label: 'Employer payroll tax' },
      { label: 'Credit for workers', num: true },
      { label: 'Income exempt', num: true },
      { label: 'Rates above the exemption', num: true },
      { label: 'Top household rate', num: true },
      { label: 'Tax returns owing $0', num: true },
      { label: 'Middle-income average', num: true },
      { label: 'Paid by top 1%', num: true },
    ],
    rows,
  );
}

export const FIFTHS = ['Lowest fifth', 'Second fifth', 'Middle fifth', 'Fourth fifth', 'Top fifth'] as const;

/** The combined rate (household contribution plus payroll tax) for each fifth of incomes. */
export function fifthsTable(models: readonly RevenueModel[]): string {
  const rows = FIFTHS.map(
    (fifth, i) =>
      `<tr><th scope="row">${fifth}</th>` +
      models
        .map(
          (m) =>
            `<td class="xp-num"><span class="xp-cellbar" aria-hidden="true"><span style="${width((m.combinedByFifth[i] / 0.14) * 100)}"></span></span>${pct(m.combinedByFifth[i])}</td>`,
        )
        .join('') +
      `</tr>`,
  );
  return table(
    'xp-fifths-caption',
    'Share of income, household contribution plus payroll tax, by income group',
    [{ label: 'Income group' }, ...models.map((m) => ({ label: `Model ${m.id}`, num: true }))],
    rows,
  );
}

// ------------------------------------------------------------ households

export type HouseholdRow = (typeof HOUSEHOLD_ROWS)[number];

/** The example households: what each pays today beside its contribution under each model. */
export function householdsTable(rows: readonly HouseholdRow[], models: readonly RevenueModel[]): string {
  const body = rows.map(
    (row) =>
      `<tr><th scope="row">${esc(row.who)}, ${usd(row.income)}` +
      `<span class="xp-row-detail">${esc(row.detail)}</span></th>` +
      `<td class="xp-num">${usd(row.now)}</td>` +
      row.models.map((v) => comparedCell(v, row.now, 0.5)).join('') +
      `</tr>`,
  );
  return table(
    'xp-households-caption',
    'Example households: yearly household contribution under each model, beside what each pays today',
    [
      { label: 'Household' },
      { label: 'Pays today', num: true },
      ...models.map((m) => ({ label: `Model ${m.id}`, num: true })),
    ],
    body,
  );
}

/**
 * The Board's own worked examples, one table per household. All of them are
 * in the page; main.ts adds a picker that shows one at a time.
 */
export function boardExamples(examples: readonly BoardExample[], models: readonly RevenueModel[]): string {
  const parts = examples.map((example) => {
    const body = example.rows.map(
      (row) =>
        `<tr><th scope="row">${usd(row.income)}</th>` +
        `<td class="xp-num">${usd(row.now)}</td>` +
        row.models.map((v) => comparedCell(v, row.now, 0)).join('') +
        `</tr>`,
    );
    return (
      `<div class="xp-example" data-example="${esc(example.id)}" data-tab="${esc(example.tab)}">` +
      `<h3 class="xp-example-title">${esc(example.tab)}</h3>` +
      `<p><strong>${esc(example.who)}</strong></p>` +
      `<p>${esc(example.today)}</p>` +
      table(
        `xp-example-${esc(example.id)}-caption`,
        `Board example figures: ${example.tab}`,
        [
          { label: example.id === 'medicare' ? 'Income, not counting Social Security' : 'Income' },
          { label: 'Pays today', num: true },
          ...models.map((m) => ({ label: `Model ${m.id}`, num: true })),
        ],
        body,
      ) +
      `</div>`
    );
  });
  return `<div class="xp-examples">${parts.join('')}</div>`;
}

// -------------------------------------------------------------- employers

/** Payroll sizes for the employer table. */
export const BUSINESS_PAYROLLS: readonly number[] = [420_000, 1_100_000, 8_500_000, 20_000_000, 190_000_000];

/** The payroll tax at a few payroll sizes: Model 1, then Models 2 to 5, which share a second tier. */
export function businessTable(payrolls: readonly number[]): string {
  const rows = payrolls.map((payroll) => {
    const one = payrollTax(payroll, 1);
    const rest = payrollTax(payroll, 2);
    return (
      `<tr><th scope="row">${usd(payroll)}</th>` +
      `<td class="xp-num">${usd(one)} (${pct1(one / payroll)})</td>` +
      `<td class="xp-num">${usd(rest)} (${pct1(rest / payroll)})</td></tr>`
    );
  });
  return table(
    'xp-business-caption',
    'Payroll tax by payroll size',
    [
      { label: "Private employer's yearly payroll" },
      { label: 'Model 1', num: true },
      { label: 'Models 2 to 5', num: true },
    ],
    rows,
  );
}

// --------------------------------------------------------- statewide math

export interface EstimateCard {
  name: string;
  who: string;
  /** Current system, billions. */
  current: number;
  /** The plan, billions. */
  plan: number;
  /** New state taxes, billions. */
  taxes: number;
  /** What employers and households pay today, billions. */
  privateNow: number;
}

/** The two published estimates, side by side. */
export const ESTIMATES: readonly EstimateCard[] = [
  {
    name: "Milliman's best estimate",
    who: "The board's actuary",
    current: BEST.statusQuo,
    plan: BEST.plan,
    taxes: REVENUE_TARGET.best,
    privateNow: PRIVATE_TODAY.best,
  },
  {
    name: "The board's assumptions",
    who: 'Slower cost growth and more savings',
    current: LOW.statusQuo,
    plan: BOARD.plan,
    taxes: REVENUE_TARGET.board,
    privateNow: PRIVATE_TODAY.board,
  },
];

/** Each estimate: the two totals as bars, the payments that end, the taxes that start, the difference. */
export function statewideEstimates(estimates: readonly EstimateCard[]): string {
  const cards = estimates.map(
    (e) =>
      `<div class="xp-est-card">` +
      `<p class="xp-est-name">${esc(e.name)}</p>` +
      `<p class="xp-est-who">${esc(e.who)}</p>` +
      `<div class="xp-est-bars" aria-hidden="true">` +
      `<span class="xp-est-label">Current system</span>` +
      `<span class="xp-track"><span class="xp-now" style="${width((e.current / 80) * 100)}"></span></span>` +
      `<span class="xp-est-value">${bn(e.current)}</span>` +
      `<span class="xp-est-label">The plan</span>` +
      `<span class="xp-track"><span style="${width((e.plan / 80) * 100)}"></span></span>` +
      `<span class="xp-est-value">${bn(e.plan)}</span>` +
      `</div>` +
      `<p class="xp-vh">Current system ${bn(e.current)} a year in 2032; the plan ${bn(e.plan)}.</p>` +
      `<dl class="xp-est-swap">` +
      `<div class="xp-ends"><dt>Payments that would end <small>premiums, deductibles, copays and Part B premiums</small></dt>` +
      `<dd><span aria-hidden="true">&minus;</span>${bn(e.privateNow)}</dd></div>` +
      `<div class="xp-starts"><dt>New state taxes that replace them <small>about ${usd100(perPerson(e.taxes))} per Oregonian</small></dt>` +
      `<dd><span aria-hidden="true">+</span>${bn(e.taxes)}</dd></div>` +
      `</dl>` +
      `<p class="xp-est-saves"><span class="xp-est-big">${bn(e.privateNow - e.taxes)}</span> ` +
      `<span>less paid each year by Oregon employers and households, about ` +
      `${pct((e.privateNow - e.taxes) / e.privateNow, 0)} ${OURS}</span></p>` +
      `</div>`,
  );
  return `<div class="xp-est">${cards.join('')}</div>`;
}

/** Longest bar in the statewide charts, in billions; bars scale against it. */
const BAR_MAX = 8;

/** Bar length as a percent of its track. */
function barPct(billions: number): number {
  return (Math.abs(billions) / BAR_MAX) * 100;
}

/** The steps from the current system's cost to the plan's, with each running total. */
export function bridge(steps: readonly Step[]): string {
  const items = steps.map((s) => {
    if (s.total !== undefined) {
      return (
        `<li class="xp-total"><span class="xp-bridge-label">${esc(s.label)}</span>` +
        `<span class="xp-track" aria-hidden="true"></span>` +
        `<span class="xp-bridge-value">${bn(s.total)}</span></li>`
      );
    }
    const delta = s.delta ?? 0;
    const kind = `${delta > 0 ? 'xp-up' : delta < 0 ? 'xp-down' : ''}${s.conditional ? ' xp-cond' : ''}`;
    return (
      `<li><span class="xp-bridge-label">${esc(s.label)}` +
      (s.conditional ? `<span class="xp-vh"> (saves cost only if provider rates are reset)</span>` : '') +
      `</span>` +
      `<span class="xp-track" aria-hidden="true"><span class="${kind}" style="${width(barPct(delta))}"></span></span>` +
      `<span class="xp-bridge-value">${signed(delta)}</span></li>`
    );
  });
  return `<ol class="xp-bridge">${items.join('')}</ol>`;
}

/** The plan against the current system under each set of assumptions. */
export function statewideScenarios(scenarios: readonly StatewideScenario[]): string {
  const items = scenarios.map(
    (s) =>
      `<li${s.published ? '' : ' class="xp-ours-row"'}>` +
      `<span class="xp-diverge-label"><strong>${esc(s.label)}${s.published ? '' : ` ${OURS}`}</strong>` +
      `<span>${esc(s.detail)}</span></span>` +
      `<span class="xp-diverge-track" aria-hidden="true">` +
      `<span class="${s.delta > 0 ? 'xp-up' : s.delta < 0 ? 'xp-down' : ''}" style="${width(barPct(s.delta) / 2)}"></span></span>` +
      `<span class="xp-diverge-value">${moreLess(s.delta)} ` +
      `<span class="xp-soft">(${pct(Math.abs(s.delta) / s.baseline, 0)})</span></span>` +
      `</li>`,
  );
  return `<ul class="xp-diverge">${items.join('')}</ul>`;
}

export interface RaisedGroup {
  title: string;
  rows: readonly Raised[];
}

/** Today against the plan, for each estimate. */
export const RAISED_GROUPS: readonly RaisedGroup[] = [
  { title: "Milliman's best estimate", rows: RAISED_IN_OREGON.best },
  { title: "The board's assumptions", rows: RAISED_IN_OREGON.board },
];

/** Money raised from Oregon employers and households, as stacked bars on one scale. */
export function raised(groups: readonly RaisedGroup[]): string {
  return groups
    .map((g) => {
      const rows = g.rows.map((r) => {
        const total = Math.round((r.main + r.partB) * 10) / 10;
        return (
          `<div class="xp-stack-row"><span class="xp-stack-name">${esc(r.name)}</span>` +
          `<span class="xp-raised" aria-hidden="true">` +
          `<span class="xp-raised-main" style="${width((r.main / 40) * 100)}"></span>` +
          `<span class="xp-raised-partb" style="${width((r.partB / 40) * 100)}"></span>` +
          `</span>` +
          // The amounts sit beside the bar as text: a label inside the narrow Part B segment is cut off on small screens.
          `<span class="xp-stack-total">${bn(r.main)} + ${bn(r.partB)}<span class="xp-vh"> of Part B premiums</span> = ${bn(total)}</span>` +
          `</div>`
        );
      });
      return (
        `<p class="xp-raised-title">${esc(g.title)} ${OURS}</p>` +
        `<div class="xp-stack-rows">${rows.join('')}</div>`
      );
    })
    .join('');
}

// ---------------------------------------------------------------- markers

/** Each marker name in index.html and the block that replaces it. */
export const blocks: Readonly<Record<string, () => string>> = Object.freeze({
  // The software version, from package.json; the source snapshot is stated beside it.
  'version': () => `Version ${version}`,
  'model-cards': () => modelCards(MODELS),
  'models-table': () => modelsTable(MODELS),
  'fifths-table': () => fifthsTable(MODELS),
  'households-table': () => householdsTable(HOUSEHOLD_ROWS, MODELS),
  'board-examples': () => boardExamples(SCENARIOS, MODELS),
  'business-table': () => businessTable(BUSINESS_PAYROLLS),
  'statewide-estimates': () => statewideEstimates(ESTIMATES),
  'bridge': () => bridge(BRIDGE),
  'statewide-scenarios': () => statewideScenarios(SCENARIOS_STATEWIDE),
  'raised': () => raised(RAISED_GROUPS),
});

const MARKER = /<!--\s*uhp:([a-z0-9-]+)\s*-->/g;

/** The marker names in a page, in order. */
export function markers(html: string): string[] {
  return [...html.matchAll(MARKER)].map((match) => match[1]);
}

/** Replaces every marker in the page with its block. An unknown marker is an error, not a blank. */
export function renderBlocks(html: string): string {
  return html.replace(MARKER, (_comment, name: string) => {
    const render = blocks[name];
    if (!render) throw new Error(`index.html has the marker "uhp:${name}", which has no renderer in src/site/blocks.ts.`);
    return render();
  });
}
