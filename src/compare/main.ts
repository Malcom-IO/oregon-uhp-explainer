/**
 * Draws the comparison page: the five models against what the plan needs, what a
 * household would pay under each, and who pays across incomes. The page's shell
 * (theme, top bar, printing) comes from src/site/main.ts.
 */
import './compare.css';
import { MODELS, bill } from '../model/uhp-model';
import type { EmployerKind } from '../model/uhp-model';
import { INDEX_2022_TO_2026 } from '../model/proposals/uhpgb-2026-10';
import { REVENUE_TARGET } from '../model/uhp-statewide';
import { announcer, parseAmount, status } from '../widget/dom';
import { esc } from '../site/blocks';
import { bn, pct1, usd } from '../site/format';
import { DISTRIBUTIONS } from './distribution';
import type { Distribution } from './distribution';
import { LRO_2032 } from './lro';
import { GROUPS, standing } from './population';

/** The Board's example employer: an $8.5 million payroll (report Table S2). */
const EXAMPLE_PAYROLL = 8_500_000;
const INDEX = INDEX_2022_TO_2026.to / INDEX_2022_TO_2026.from;
/** Bars share one scale, in $ billions, a little past the larger need. */
const SCALE = 42;
const at = (billions: number) => `${((billions / SCALE) * 100).toFixed(2)}%`;

const SERIES = ['var(--_series-1)', 'var(--_series-2)', 'var(--_series-3)'];

// ---------------------------------------------------------------- the five models

function modelRows(): string {
  const marks = [
    { v: REVENUE_TARGET.board, label: `${bn(REVENUE_TARGET.board)} Board` },
    { v: REVENUE_TARGET.best, label: `${bn(REVENUE_TARGET.best)} Milliman` },
  ];
  return MODELS.map((m) => {
    const p = LRO_2032[Number(m.id)];
    const parts = [p.hhcc, p.ept, p.business];
    const label = `Model ${m.id} raises ${bn(p.total)} in 2032: households ${bn(p.hhcc)}, employers ${bn(p.ept)}, business taxes ${bn(p.business)}.`;
    return `<div class="xp-cmp-model">
      <div class="xp-cmp-name"><h3>Model ${esc(m.id)}</h3><p>${esc(m.name)}</p>
        <button type="button" class="xp-cmp-link" data-cmp-show="${esc(m.id)}">Who pays, by income</button></div>
      <div class="xp-cmp-bar" role="img" aria-label="${esc(label)}">
        <div class="xp-cmp-fill">${parts.map((v, i) => `<span style="inline-size:${at(v)};background:${SERIES[i]}"></span>`).join('')}</div>
        ${marks.map((k) => `<span class="xp-cmp-mark" style="inset-inline-start:${at(k.v)}"><span>${esc(k.label)}</span></span>`).join('')}
      </div>
      <p class="xp-cmp-total">${bn(p.total)}<span> in 2032</span></p>
      <p class="xp-cmp-owed"><output data-cmp-you="${esc(m.id)}">—</output><span>a year for you</span></p>
    </div>`;
  }).join('');
}

// ---------------------------------------------------------------- who pays

interface Bar { label: string; short: string[]; hhcc: number; ept: number; you: boolean; top?: boolean; sub?: boolean }

function bars(d: Distribution, youGroup: number): Bar[] {
  const lower = GROUPS.slice(0, 4).map((g, k) => ({ label: g.label, short: [g.short, '20%'], hhcc: d.hhcc[k], ept: d.ept[k], you: k === youGroup }));
  const top = { label: 'Top 20%', short: ['Top', '20%'], ...d.topFifth, you: youGroup >= 4, top: true };
  const parts = GROUPS.slice(4).map((g, i) => ({ label: g.label, short: [g.short], hhcc: d.hhcc[i + 4], ept: d.ept[i + 4], you: i + 4 === youGroup, sub: true }));
  return [...lower, top, ...parts];
}

/** Columns for the four lower fifths and the top fifth, then the top fifth broken down in a tinted panel. */
function chart(d: Distribution, youGroup: number): string {
  const list = bars(d, youGroup);
  const W = 640, H = 300, m = { l: 6, r: 6, t: 52, b: 58 }, ih = H - m.t - m.b, slot = (W - m.l - m.r) / 10.7;
  const x = (i: number) => m.l + (i < 5 ? i : i + 0.7) * slot, bw = slot * 0.68;
  const max = Math.max(0.05, ...list.map((b) => b.hhcc + b.ept));
  const y = (v: number) => m.t + ih - (v / max) * ih, base = m.t + ih;
  const px = x(5) - slot * 0.25, pw = W - m.r - px;
  let s = `<rect class="xp-cmp-panel" x="${px}" y="4" width="${pw}" height="${H - 4}" rx="8"/>` +
    `<text class="xp-cmp-strong" x="${px + pw / 2}" y="24" text-anchor="middle">The top 20%, broken down</text>` +
    `<line class="xp-cmp-axis" x1="${m.l}" x2="${px - slot * 0.25}" y1="${base}" y2="${base}"/>` +
    `<line class="xp-cmp-axis" x1="${px + 6}" x2="${W - m.r - 6}" y1="${base}" y2="${base}"/>`;
  const topBar = list[4];
  s += `<path class="xp-cmp-link-line" d="M${x(4) + (slot + bw) / 2} ${y(topBar.hhcc + topBar.ept)} H${px}"/>`;
  list.forEach((b, i) => {
    const bx = x(i) + (slot - bw) / 2, cx = bx + bw / 2, total = b.hhcc + b.ept;
    s += `<rect x="${bx}" y="${y(b.hhcc)}" width="${bw}" height="${base - y(b.hhcc)}" fill="${SERIES[0]}"/>`;
    s += `<rect x="${bx}" y="${y(total)}" width="${bw}" height="${Math.max(0, y(b.hhcc) - y(total) - 1)}" fill="${SERIES[1]}"/>`;
    if (b.top) s += `<rect class="xp-cmp-outline" x="${bx - 2}" y="${y(total) - 2}" width="${bw + 4}" height="${base - y(total) + 2}"/>`;
    s += `<text class="xp-cmp-strong" x="${cx}" y="${y(total) - 6}" text-anchor="middle">${pct1(total)}</text>`;
    const cls = b.you ? ' class="xp-cmp-me"' : '';
    b.short.forEach((t, j) => { s += `<text${cls} x="${cx}" y="${base + 16 + j * 14}" text-anchor="middle">${esc(t)}</text>`; });
    if (b.you) s += `<text class="xp-cmp-me" x="${cx}" y="${base + 46}" text-anchor="middle">▲ you</text>`;
  });
  s += `<text x="${px + pw / 2}" y="${base + 32}" text-anchor="middle">percentiles of returns</text>`;
  const label = `Model ${d.model.id}: new taxes as a share of income, by income group. The table below has the numbers.`;
  return `<div class="xp-scroll" role="region" tabindex="0" aria-label="Who pays chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${s}</svg></div>`;
}

function table(d: Distribution, youGroup: number): string {
  const rows = bars(d, youGroup).map((b) =>
    `<tr${b.you ? ' class="xp-cmp-row-me"' : ''}><th scope="row">${b.sub ? '<span class="xp-vh">Within the top 20%: </span>' : ''}${esc(b.label)}${b.you ? ' (you)' : ''}</th>` +
    `<td>${pct1(b.hhcc)}</td><td>${pct1(b.ept)}</td><td>${pct1(b.hhcc + b.ept)}</td></tr>`).join('');
  return `<div class="xp-scroll" role="region" tabindex="0" aria-labelledby="cmp-table-caption"><table class="xp-table">` +
    `<caption id="cmp-table-caption">Model ${esc(d.model.id)}: new taxes as a share of income</caption>` +
    `<thead><tr><th scope="col">Group of tax returns</th><th scope="col">Household contribution</th><th scope="col">Employer payroll tax</th><th scope="col">Together</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div>`;
}

// ---------------------------------------------------------------- page

export function start(doc: Document): void {
  const q = <T extends Element>(sel: string) => doc.querySelector<T>(sel);
  const form = q<HTMLFormElement>('[data-cmp-form]'), models = q<HTMLElement>('[data-cmp-models]');
  const picker = q<HTMLElement>('[data-cmp-picker]'), chartBox = q<HTMLElement>('[data-cmp-chart]'), tableBox = q<HTMLElement>('[data-cmp-table]');
  const error = q<HTMLElement>('[data-cmp-error]');
  if (!form || !models || !picker || !chartBox || !tableBox || !error) return;

  const live = status(doc);
  form.after(live);
  const say = announcer(live);
  models.innerHTML = modelRows();

  let shown = 2;
  const buttons = MODELS.map((m) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = `Model ${m.id}`;
    b.addEventListener('click', () => { shown = Number(m.id); update(); });
    picker.append(b);
    return b;
  });
  models.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-cmp-show]');
    if (!b) return;
    shown = Number(b.dataset['cmpShow']);
    update();
    const smooth = !doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    q('#who-pays')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  });

  let income = 85_000, first = true;
  function update(): void {
    const field = form!.elements.namedItem('income') as HTMLInputElement;
    const typed = parseAmount(field.value);
    const ok = typed !== undefined && Number.isFinite(typed);
    error!.hidden = ok;
    field.setAttribute('aria-invalid', String(!ok));
    if (ok) income = typed;
    const size = Number((form!.elements.namedItem('size') as HTMLSelectElement).value);
    const kind = (form!.elements.namedItem('employer') as HTMLSelectElement).value as EmployerKind;
    const owed = MODELS.map((m) => bill(m, income, size, kind, kind === 'private' ? EXAMPLE_PAYROLL : 0).household);
    MODELS.forEach((m, i) => {
      const out = doc.querySelector(`[data-cmp-you="${m.id}"]`);
      if (out) out.textContent = ok ? usd(owed[i]) : '—';
    });
    // Announced once typing pauses; the first, on load, is only remembered.
    if (ok) say.say(`A year for you: ${MODELS.map((m, i) => `Model ${m.id}, ${usd(owed[i])}`).join('; ')}.`, first);
    first = false;

    const youGroup = standing(income / INDEX).group;
    const d = DISTRIBUTIONS[shown - 1];
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i + 1 === shown)));
    chartBox!.innerHTML = chart(d, youGroup);
    tableBox!.innerHTML = table(d, youGroup);
  }
  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();
}

if (typeof document !== 'undefined') start(document);
