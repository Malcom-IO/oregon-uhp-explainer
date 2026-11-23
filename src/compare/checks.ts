/**
 * How the who-pays figures compare with the Board's published ones: one list, used by the
 * tests (each difference must stay inside its band, for every model), by the page (which
 * prints the measured differences) and by docs/compare.md (which prints the bands; a test
 * checks they match). The bands are the gaps we know of, with some room.
 */
import { APPENDIX_2022, DISTRIBUTIONS } from './distribution';
import type { Distribution } from './distribution';

export interface Check {
  /** What is compared, as the page and docs name it. */
  label: string;
  /** Where the Board publishes it. */
  source: string;
  /** Ours less the Board's: a share for 'percent', a rate or share for 'points'. */
  diff: (d: Distribution) => number;
  unit: 'percent' | 'points';
  /** The band the difference must stay in, every model. */
  lo: number;
  hi: number;
}

const published = (d: Distribution) => d.model.published!;
/** The largest difference, by size, keeping its sign. */
const widest = (xs: number[]) => xs.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);

export const CHECKS: readonly Check[] = [
  {
    label: 'Statewide household contribution, 2022', source: 'Appendix FR, PDF pp. 31–35', unit: 'percent',
    diff: (d) => d.hhccTotal / 1e6 / APPENDIX_2022[Number(d.model.id)].hhcc - 1, lo: -0.03, hi: 0.07,
  },
  {
    label: 'Combined rate, second to top fifth', source: 'Appendix FR Figure AFR4Fi', unit: 'points',
    diff: (d) => widest(d.byFifth.slice(1).map((v, f) => v - published(d).combinedByFifth[f + 1])), lo: -0.01, hi: 0.01,
  },
  {
    label: 'Combined rate, lowest fifth', source: 'Appendix FR Figure AFR4Fi', unit: 'points',
    diff: (d) => d.byFifth[0] - published(d).combinedByFifth[0], lo: -0.005, hi: 0.015,
  },
  {
    label: "Middle fifth's household contribution rate", source: 'Legislative brief, p. 9', unit: 'points',
    diff: (d) => d.middleFifthHhcc - published(d).middleFifthRate, lo: -0.003, hi: 0.003,
  },
  {
    label: "Top 1%'s share of household contributions", source: 'Legislative brief, p. 9', unit: 'points',
    diff: (d) => d.top1Share - published(d).top1Share, lo: -0.055, hi: -0.01,
  },
  {
    label: 'Returns owing no household contribution', source: 'Legislative brief, p. 9', unit: 'points',
    diff: (d) => d.owesNothing - published(d).returnsOwingNothing, lo: -0.14, hi: -0.04,
  },
];

/** "+4.8%" or "−3.8 points": a difference as the page and docs write it. */
export function signed(value: number, unit: Check['unit']): string {
  const n = Math.abs(value * 100).toFixed(1);
  const sign = Number(n) === 0 ? '' : value < 0 ? '−' : '+';
  return unit === 'percent' ? `${sign}${n}%` : `${sign}${n} points`;
}

/** The band, as docs/compare.md writes it: "−3.0% to +7.0%". */
export function band(c: Check): string {
  return `${signed(c.lo, c.unit)} to ${signed(c.hi, c.unit)}`;
}

/** The measured range across the five models: "+0.8% to +4.8%". */
export function measured(c: Check): string {
  const ds = DISTRIBUTIONS.map(c.diff);
  const lo = Math.min(...ds), hi = Math.max(...ds);
  return signed(lo, c.unit) === signed(hi, c.unit) ? signed(lo, c.unit) : `${signed(lo, c.unit)} to ${signed(hi, c.unit)}`;
}
