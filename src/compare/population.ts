/**
 * Oregon's 2022 tax returns as a population the model's rules can be applied to,
 * return by return, so the page can show who pays across incomes.
 *
 * Source: IRS Statistics of Income, Historic Table 2, tax year 2022, Oregon
 * (file 22in55cmcsv.csv), cataloged in SOURCES.md. The IRS publishes returns by
 * income bracket, not one by one. Each bracket's returns are spread across it
 * (our method: a straight-line density that matches the bracket's mean income, and a
 * Pareto tail for the open top brackets), then split by filing status and
 * household size. Income is AGI less taxable Social Security, as the Board measures it.
 */

/** [bracket, returns, single, joint, head of household, people, AGI, taxable Social Security, wages, net capital gain], dollar columns in $1,000s. */
const IRS_2022_OR: readonly (readonly number[])[] = [
  [1, 32780, 21270, 9090, 1420, 47750, -1457188, 223, 244162, 91925],
  [2, 199730, 163700, 19900, 13110, 196160, 1028218, 3306, 794670, 1979],
  [3, 300780, 217150, 39630, 38540, 407310, 5206288, 85352, 3715716, 41149],
  [4, 469510, 304480, 81840, 70970, 741290, 17418503, 611580, 14000631, 120357],
  [5, 310890, 169550, 95590, 36730, 551280, 19136194, 1123518, 14519560, 176996],
  [6, 211010, 83510, 105670, 17050, 428850, 18317104, 1237695, 13169581, 220427],
  [7, 357360, 77940, 259610, 14990, 850950, 49169179, 2612401, 34631283, 1085933],
  [8, 125320, 16100, 104950, 3250, 334100, 35820934, 850368, 23483072, 2494311],
  [9, 17120, 2040, 14550, 380, 47450, 11396474, 117422, 5869223, 1598681],
  [10, 6490, 850, 5420, 140, 17150, 18282325, 55397, 3941774, 5949871],
];
/** Lower edge of each IRS bracket by bracket number; null where open. */
const EDGES: readonly (number | null)[] = [null, null, 1, 10e3, 25e3, 50e3, 75e3, 100e3, 200e3, 500e3, 1e6, null];

/** Points per bracket and filing status. */
const K = 240;

/** K incomes spread across one IRS bracket so that their mean is the bracket's mean. */
function spread(bracket: number, mean: number): number[] {
  if (bracket === 1) return Array<number>(K).fill(mean);
  const lo = EDGES[bracket] as number, hi = EDGES[bracket + 1];
  if (hi !== null && mean >= lo + (hi - lo) / 3 && mean <= hi - (hi - lo) / 3) {
    // a straight-line density on [lo, hi] with the bracket's mean, sampled at K quantiles
    const w = hi - lo, mid = (lo + hi) / 2, slope = ((mean - mid) * 12) / w ** 3, N = 2000;
    const xs: number[] = [], f: number[] = [];
    for (let i = 0; i < N; i++) { const x = lo + (w * (i + 0.5)) / N; xs.push(x); f.push(Math.max(0, 1 / w + slope * (x - mid))); }
    const total = f.reduce((a, b) => a + b, 0), out: number[] = [];
    let acc = 0, j = 0;
    for (let i = 0; i < N; i++) { acc += f[i] / total; while (j < K && acc >= (j + 0.5) / K) { out.push(xs[i]); j++; } }
    while (out.length < K) out.push(xs[N - 1]);
    return out;
  }
  // a Pareto tail from lo (cut at hi, if any), with its shape solved to match the mean
  const draw = (a: number) => Array.from({ length: K }, (_, j) =>
    lo * Math.pow(1 - ((j + 0.5) / K) * (1 - (hi ? Math.pow(lo / hi, a) : 0)), -1 / a));
  let aLo = 1.01, aHi = 20, q: number[] = [];
  for (let i = 0; i < 80; i++) {
    const a = (aLo + aHi) / 2; q = draw(a);
    if (q.reduce((s, x) => s + x, 0) / K > mean) aLo = a; else aHi = a;
  }
  return q;
}

export interface Population {
  /** Income (AGI less taxable Social Security), 2022 dollars. */
  readonly income: Float64Array;
  /** Wages, 2022 dollars. */
  readonly wages: Float64Array;
  /** People on the return, 1 to 5 (5 stands for five or more). */
  readonly size: Uint8Array;
  /** How many real returns this point stands for. */
  readonly weight: Float64Array;
}

/**
 * The population, lowest income first. A filing status's average household size
 * (from the IRS count of people) is split between the two whole sizes around it,
 * so the model's size-based thresholds apply.
 */
export const POPULATION: Population = (() => {
  const rows: { income: number; wages: number; size: number; weight: number }[] = [];
  for (const [bracket, n, single, joint, hoh, people, agi, ss, wages] of IRS_2022_OR) {
    const base = (agi - ss) * 1e3, mean = base / n;
    const other = n - single - joint - hoh; // mostly married filing separately: one person
    const deps = Math.max(0, people - single - other - 2 * joint - hoh) / Math.max(1, joint + hoh);
    const statuses: [number, number][] = [[single + other, 1], [joint, 2 + deps], [hoh, 1 + deps]];
    const points = spread(bracket, mean);
    for (const [count, avgSize] of statuses) {
      const lo = Math.min(5, Math.floor(avgSize)), hi = Math.min(5, lo + 1), upShare = lo === hi ? 0 : avgSize - Math.floor(avgSize);
      for (const x of points) {
        // wages spread in proportion to income inside the bracket
        const w = wages * 1e3 * (base > 0 ? x / base : 1 / n);
        rows.push({ income: x, wages: w, size: lo, weight: (count / K) * (1 - upShare) });
        if (upShare > 0) rows.push({ income: x, wages: w, size: hi, weight: (count / K) * upShare });
      }
    }
  }
  rows.sort((a, b) => a.income - b.income);
  return {
    income: Float64Array.from(rows, (r) => r.income),
    wages: Float64Array.from(rows, (r) => r.wages),
    size: Uint8Array.from(rows, (r) => r.size),
    weight: Float64Array.from(rows, (r) => r.weight),
  };
})();

/** Total 2022 wages on Oregon returns, from the IRS table. */
export const WAGES_2022 = IRS_2022_OR.reduce((s, r) => s + r[8], 0) * 1e3;

/**
 * Income groups by share of returns, lowest first: four fifths, then the top fifth
 * in five parts. `fifth` says which fifth a group belongs to.
 */
export const GROUPS = [
  { label: 'Lowest 20%', short: 'Lowest', to: 0.2, fifth: 0 },
  { label: 'Second 20%', short: 'Second', to: 0.4, fifth: 1 },
  { label: 'Middle 20%', short: 'Middle', to: 0.6, fifth: 2 },
  { label: 'Fourth 20%', short: 'Fourth', to: 0.8, fifth: 3 },
  { label: '80th–90th percentile', short: '80–90', to: 0.9, fifth: 4 },
  { label: '90th–95th percentile', short: '90–95', to: 0.95, fifth: 4 },
  { label: '95th–99th percentile', short: '95–99', to: 0.99, fifth: 4 },
  { label: '99th–99.9th percentile', short: '99–99.9', to: 0.999, fifth: 4 },
  { label: 'Top 0.1%', short: 'Top 0.1', to: 1, fifth: 4 },
] as const;

/** The group each point falls in. */
export const GROUP_OF: Uint8Array = (() => {
  const { weight } = POPULATION, total = weight.reduce((a, b) => a + b, 0), g = new Uint8Array(weight.length);
  let acc = 0, k = 0;
  for (let i = 0; i < weight.length; i++) {
    acc += weight[i];
    while (k < GROUPS.length - 1 && acc / total > GROUPS[k].to + 1e-9) k++;
    g[i] = k;
  }
  return g;
})();

/** Where a 2022 income ranks: the share of returns with less, and its group. */
export function standing(income2022: number): { below: number; group: number } {
  const { income, weight } = POPULATION, total = weight.reduce((a, b) => a + b, 0);
  let below = 0, group = 0;
  for (let i = 0; i < income.length && income[i] < income2022; i++) { below += weight[i]; group = GROUP_OF[i]; }
  return { below: below / total, group };
}
