// Calibration check: node public/balancer/check.mjs. Fails if the engine drifts from the Board's own results.
import { readFileSync } from 'node:fs';
new Function(readFileSync(new URL('./engine.js', import.meta.url), 'utf8'))();
const B = globalThis.Balancer;
let bad = 0;
const pct = (x) => (x * 100).toFixed(1) + '%';
console.log('model  HHCC 2022 ours/board     EPT ours/board    owe nothing ours/board   2032 total ours/LRO');
for (const ref of B.BOARD_2022) {
  const p = B.PRESETS.find((x) => x.id === ref.id).policy;
  const r = B.evaluate(p);
  const hh = (r.lines.hh / B.GROW_INCOME) * 1e3, ept = (r.lines.ept / B.GROW_PAYROLL) * 1e3;
  const hhErr = hh / ref.hh - 1, eptErr = ept / ref.ept - 1, totErr = r.total / B.LRO_2032[ref.id] - 1;
  console.log(`${ref.id}     ${hh.toFixed(0)}/${ref.hh} (${pct(hhErr)})   ${ept.toFixed(0)}/${ref.ept}   ${pct(r.owesNothing)}/${pct(ref.owesNothing)}     ${r.total.toFixed(2)}/${B.LRO_2032[ref.id]} (${pct(totErr)})`);
  if (Math.abs(hhErr) > 0.07 || Math.abs(eptErr) > 0.001) bad++;
}
console.log('\ntax base by group');
for (const g of B.BASE) console.log(`${g.label.padEnd(12)} from $${Math.round(g.floor).toLocaleString().padStart(10)}  returns ${Math.round(g.returns).toLocaleString().padStart(8)}  income ${pct(g.incomeShare).padStart(6)}  1% of income = $${g.onePercent.toFixed(2)}B`);
const m2 = B.evaluate(B.PRESETS[2].policy);
console.log('\nModel 2 average rate by group, all taxes:', B.GROUPS.map((g, k) => pct(m2.rates.reduce((s, c) => s + c[k], 0))).join(' '));
console.log('Model 2 household contribution only:   ', B.GROUPS.map((g, k) => pct(m2.rates[0][k])).join(' '));
const you = B.household(B.PRESETS[2].policy, m2, { income: 85000, size: 2, wages: 85000, employer: 'medium' });
console.log('Household $85k, 2 people, $8.5M employer:', JSON.stringify(you, (k, v) => typeof v === 'number' ? Math.round(v) : v));
// Extra tax on the top 1%: 1 point on income above the threshold must raise less than 1% of the group's whole income.
const t1 = B.evaluate({ ...B.PRESETS[0].policy, top1: 0.01 }).lines.top1, cap1 = B.BASE[7].onePercent + B.BASE[8].onePercent;
console.log(`
Top 1% from $${B.SUR_START.top1.toLocaleString()}: 1 point raises $${t1.toFixed(2)}B (1% of all their income: $${cap1.toFixed(2)}B)`);
if (!(t1 > 0.5 * cap1 && t1 < cap1)) { console.error('top-1% extra tax out of range'); bad++; }
// Share codes: every preset, plus a fine-tuned plan, must survive encode -> decode.
const fine = { ...B.PRESETS[4].policy, top1: 0.05, cap: 250000, cig: 1.5, property: 2.4, cat: 0.2, sales: 0.0325 };
for (const p of [...B.PRESETS.map((x) => x.policy), fine]) {
  const code = B.encodePlan(p), back = B.decodePlan(code);
  const diff = Object.keys(p).filter((k) => k === 'hh' ? p.hh.some((v, i) => Math.abs(v - back.hh[i]) > 1e-9) : Math.abs(p[k] - back[k]) > 1e-9 && p[k] !== back[k]);
  if (diff.length) { console.error('share code round trip failed:', code, diff); bad++; }
}
// Untrusted codes: off-menu choices are ignored, rates stop at the slider maximum.
const junk = B.decodePlan('m0-x150-c37-o10000-ha9999');
if (junk.cap !== Infinity || junk.exempt !== 2 || junk.credit !== 0 || junk.top1 !== 0.2 || junk.hh[0] !== 0.25) { console.error('share code not clamped', junk); bad++; }
// The extras are reported after the cap: with a $50k cap, the top 1% line can't exceed the whole household line.
const capped = B.evaluate({ ...B.PRESETS[0].policy, top1: 0.2, cap: 50000 }).lines;
if (!(capped.top1 <= capped.hh + 1e-9)) { console.error('top-1% line ignores the cap', capped); bad++; }
console.log('share code, Model 4:', B.encodePlan(B.PRESETS[4].policy));
if (bad) { console.error(`\n${bad} model(s) off calibration`); process.exit(1); }
