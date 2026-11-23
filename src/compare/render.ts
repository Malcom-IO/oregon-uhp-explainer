/**
 * The comparison page's figures as HTML. The build writes them into the page through
 * `uhp:` markers (src/site/blocks.ts), so the page reads complete without scripts; the
 * page's script (main.ts) redraws them with the reader's household and model.
 */
import { MODELS, bill } from '../model/uhp-model';
import type { EmployerKind } from '../model/uhp-model';
import { INDEX_2022_TO_2026 } from '../model/proposals/uhpgb-2026-10';
import { REVENUE_TARGET } from '../model/uhp-statewide';
import { bn, esc, pct1, usd } from '../site/format';
import { CHECKS, measured } from './checks';
import type { Distribution } from './distribution';
import { DISTRIBUTIONS } from './distribution';
import { LRO_2032 } from './lro';
import { GROUPS, GROUP_FLOORS, groupOf } from './population';

/** 2022 dollars to 2026 dollars, as the model brings its fixed brackets forward. */
export const INDEX = INDEX_2022_TO_2026.to / INDEX_2022_TO_2026.from;
/** The Board's example employer: an $8.5 million payroll (report Table S2). */
export const EXAMPLE_PAYROLL = 8_500_000;

/** The household the page opens with: the Board's example couple. */
export const START = { income: 85_000, size: 2, employer: 'private' as EmployerKind };
/** The model the who-pays chart opens with. */
export const START_MODEL = 2;

const SERIES = ['var(--_series-1)', 'var(--_series-2)', 'var(--_series-3)'];
/** Bars share one scale, in $ billions, a little past the larger need. */
const SCALE = 42;
const at = (billions: number) => `${((billions / SCALE) * 100).toFixed(2)}%`;

/** What a household owes under each model, in model order. */
export function owed(income: number, size: number, employer: EmployerKind): number[] {
  return MODELS.map((m) => bill(m, income, size, employer, employer === 'private' ? EXAMPLE_PAYROLL : 0).household);
}

/** The group a 2026 income falls in. */
export const groupOf2026 = (income: number) => groupOf(income / INDEX);

// ---------------------------------------------------------------- the five models

/** One row per model: its LRO projection against the needs, and what the household owes (null: no valid income). */
export function modelRows(yours: readonly (number | null)[]): string {
  const marks = [
    { v: REVENUE_TARGET.board, label: `${bn(REVENUE_TARGET.board)} Board` },
    { v: REVENUE_TARGET.best, label: `${bn(REVENUE_TARGET.best)} Milliman` },
  ];
  return MODELS.map((m, i) => {
    const p = LRO_2032[Number(m.id)];
    const label = `Model ${m.id} raises ${bn(p.total)} in 2032: households ${bn(p.hhcc)}, employers ${bn(p.ept)}, business taxes ${bn(p.business)}.`;
    const you = yours[i];
    return `<div class="xp-cmp-model">
      <div class="xp-cmp-name"><h3>Model ${esc(m.id)}</h3><p>${esc(m.name)}</p>
        <a class="xp-cmp-link" href="#who-pays" data-cmp-show="${esc(m.id)}">Who pays, by income<span class="xp-vh"> under Model ${esc(m.id)}</span></a></div>
      <div class="xp-cmp-bar" role="img" aria-label="${esc(label)}">
        <div class="xp-cmp-fill">${[p.hhcc, p.ept, p.business].map((v, k) => `<span style="inline-size:${at(v)};background:${SERIES[k]}"></span>`).join('')}</div>
        ${marks.map((k) => `<span class="xp-cmp-mark" style="inset-inline-start:${at(k.v)}"><span>${esc(k.label)}</span></span>`).join('')}
      </div>
      <p class="xp-cmp-total">${bn(p.total)}<span> in 2032</span></p>
      <p class="xp-cmp-owed"><output data-cmp-you="${esc(m.id)}">${you === null ? '—' : usd(you)}</output><span>a year for you</span></p>
    </div>`;
  }).join('');
}

/** The split behind the bars, as a table. */
export function modelsTable(): string {
  const rows = MODELS.map((m) => {
    const p = LRO_2032[Number(m.id)];
    return `<tr><th scope="row">Model ${esc(m.id)}</th><td>${bn(p.hhcc)}</td><td>${bn(p.ept)}</td><td>${bn(p.business)}</td><td>${bn(p.total)}</td></tr>`;
  }).join('');
  return `<div class="xp-scroll" role="region" tabindex="0" aria-labelledby="cmp-models-caption"><table class="xp-table">` +
    `<caption id="cmp-models-caption">What each model would raise in 2032, LRO preliminary projections, $ billions</caption>` +
    `<thead><tr><th scope="col">Model</th><th scope="col">Households</th><th scope="col">Employers</th><th scope="col">Business taxes</th><th scope="col">Total</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>`;
}

// ---------------------------------------------------------------- who pays

interface Bar { label: string; short: string[]; hhcc: number; ept: number; you: boolean; top?: boolean; sub?: boolean }

/** The four lower fifths, the whole top fifth, then the top fifth's parts. `youGroup` −1: no marker. */
function bars(d: Distribution, youGroup: number): Bar[] {
  const lower = GROUPS.slice(0, 4).map((g, k) => ({ label: g.label, short: [g.short, '20%'], hhcc: d.hhcc[k], ept: d.ept[k], you: k === youGroup }));
  const top = { label: 'Top 20%', short: ['Top', '20%'], ...d.topFifth, you: youGroup >= 4, top: true };
  const parts = GROUPS.slice(4).map((g, i) => ({ label: g.label, short: [g.short], hhcc: d.hhcc[i + 4], ept: d.ept[i + 4], you: i + 4 === youGroup, sub: true }));
  return [...lower, top, ...parts];
}

function chart(d: Distribution, youGroup: number): string {
  const list = bars(d, youGroup);
  const W = 640, H = 300, m = { l: 6, r: 6, t: 52, b: 58 }, ih = H - m.t - m.b, slot = (W - m.l - m.r) / 10.7;
  const x = (i: number) => m.l + (i < 5 ? i : i + 0.7) * slot, bw = slot * 0.68;
  const max = Math.max(0.05, ...list.map((b) => b.hhcc + b.ept));
  const y = (v: number) => m.t + ih - (v / max) * ih, base = m.t + ih;
  const px = x(5) - slot * 0.25, pw = W - m.r - px;
  let s = `<rect class="xp-cmp-panel" x="${px.toFixed(1)}" y="4" width="${pw.toFixed(1)}" height="${H - 4}" rx="8"/>` +
    `<text class="xp-cmp-strong" x="${(px + pw / 2).toFixed(1)}" y="24" text-anchor="middle">The top 20%, broken down</text>` +
    `<line class="xp-cmp-axis" x1="${m.l}" x2="${(px - slot * 0.25).toFixed(1)}" y1="${base}" y2="${base}"/>` +
    `<line class="xp-cmp-axis" x1="${(px + 6).toFixed(1)}" x2="${W - m.r - 6}" y1="${base}" y2="${base}"/>`;
  const topBar = list[4];
  s += `<path class="xp-cmp-link-line" d="M${(x(4) + (slot + bw) / 2).toFixed(1)} ${y(topBar.hhcc + topBar.ept).toFixed(1)} H${px.toFixed(1)}"/>`;
  list.forEach((b, i) => {
    const bx = x(i) + (slot - bw) / 2, cx = (bx + bw / 2).toFixed(1), total = b.hhcc + b.ept, f = (v: number) => v.toFixed(1);
    s += `<rect x="${f(bx)}" y="${f(y(b.hhcc))}" width="${f(bw)}" height="${f(base - y(b.hhcc))}" fill="${SERIES[0]}"/>`;
    s += `<rect x="${f(bx)}" y="${f(y(total))}" width="${f(bw)}" height="${f(Math.max(0, y(b.hhcc) - y(total) - 1))}" fill="${SERIES[1]}"/>`;
    if (b.top) s += `<rect class="xp-cmp-outline" x="${f(bx - 2)}" y="${f(y(total) - 2)}" width="${f(bw + 4)}" height="${f(base - y(total) + 2)}"/>`;
    s += `<text class="xp-cmp-strong" x="${cx}" y="${f(y(total) - 6)}" text-anchor="middle">${pct1(total)}</text>`;
    const cls = b.you ? ' class="xp-cmp-me"' : '';
    b.short.forEach((t, j) => { s += `<text${cls} x="${cx}" y="${base + 16 + j * 14}" text-anchor="middle">${esc(t)}</text>`; });
    if (b.you) s += `<text class="xp-cmp-me" x="${cx}" y="${base + 46}" text-anchor="middle">▲ you</text>`;
  });
  s += `<text x="${(px + pw / 2).toFixed(1)}" y="${base + 32}" text-anchor="middle">percentiles of Oregonians</text>`;
  const label = `Model ${d.model.id}: new taxes as a share of income, by income group. The table below has the numbers.`;
  return `<div class="xp-scroll" role="region" tabindex="0" aria-label="Who pays under Model ${esc(d.model.id)}, chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${s}</svg></div>`;
}

function table(d: Distribution, youGroup: number): string {
  const rows = bars(d, youGroup).map((b) =>
    `<tr${b.you ? ' class="xp-cmp-row-me"' : ''}><th scope="row">${b.sub ? '<span class="xp-vh">Within the top 20%: </span>' : ''}${esc(b.label)}${b.you ? ' (you)' : ''}</th>` +
    `<td>${pct1(b.hhcc)}</td><td>${pct1(b.ept)}</td><td>${pct1(b.hhcc + b.ept)}</td></tr>`).join('');
  return `<div class="xp-scroll" role="region" tabindex="0" aria-labelledby="cmp-table-caption"><table class="xp-table">` +
    `<caption id="cmp-table-caption">Model ${esc(d.model.id)}: new taxes as a share of income</caption>` +
    `<thead><tr><th scope="col">Group of Oregonians</th><th scope="col">Household contribution</th><th scope="col">Employer payroll tax</th><th scope="col">Together</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>`;
}

/** The chart, named for paper too, and its table, for one model. */
export function whoPays(modelId: number, youGroup: number): string {
  const d = DISTRIBUTIONS[modelId - 1];
  return `<p class="xp-cmp-chart-title">Model ${esc(modelId)}: ${esc(d.model.name)}</p>` +
    `<div class="xp-cmp-chart">${chart(d, youGroup)}</div>` +
    `<details class="xp-details"><summary>The numbers as a table</summary>${table(d, youGroup)}</details>`;
}

// ---------------------------------------------------------------- how it is checked

/** Each comparison with the Board, with the differences measured across the five models. */
export function checksList(): string {
  return `<ul class="xp-list">${CHECKS.map((c) =>
    `<li><strong>${esc(c.label)}</strong> (${esc(c.source)}): ours less the Board's, ${esc(measured(c))} across the five models.</li>`).join('')}</ul>`;
}

/** Where the top 1% starts, in 2026 dollars, rounded to $10,000. */
export function top1Start(): string {
  return usd(Math.round((GROUP_FLOORS[7] * INDEX) / 1e4) * 1e4);
}
