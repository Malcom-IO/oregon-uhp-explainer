/*
 * "How would you pay for it?" engine. Plain script: sets globalThis.Balancer.
 *
 * Household side: IRS SOI 2022 Oregon returns by AGI bin, spread inside each bin
 * (linear density matching the bin mean; Pareto for the open top bins), then every
 * household rule is applied return by return. Payroll side: the payroll bases the
 * Board's own 2022 results imply. 2022 results are carried to 2032 with growth factors
 * from the Legislative Revenue Office's 2032 projections. Other taxes use published
 * per-unit estimates. Every constant names its source.
 */
(function () {
  // ---------------------------------------------------------------- SOURCES / DATA
  // IRS SOI Historic Table 2, tax year 2022, Oregon (22in55cmcsv.csv).
  // [stub, returns, single, joint, head of household, people, AGI $k, taxable Social Security $k, wages $k, net capital gain $k]
  const IRS_2022_OR = [
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
  const EDGES = [null, null, 1, 10e3, 25e3, 50e3, 75e3, 100e3, 200e3, 500e3, 1e6, null];

  /** 2022 federal poverty level, as in Appendix FR's bracket tables (27,180 = 200% for one). */
  const FPL22 = { first: 13_590, each: 4_720 };
  /** 2026 federal poverty level, from report Table R2 (200%: $31,920 for one, +$11,360 a person). Used for one household's bill. */
  const FPL26 = { first: 15_960, each: 5_680 };
  /** 2022 dollars to 2026 dollars: one-person FPL growth, the repo's INDEX_2022_TO_2026. */
  const TO_2026 = 15_960 / 13_590;

  /**
   * Payroll bases implied by Appendix FR (2022, $): Plan 1 raises $8,873M at 9.6% above
   * $500k; Plans 2-5 raise $11,341M with 14% above $10M. Public employers pay the top
   * rate from the first dollar; their payroll is BLS QCEW 2022 state + local wages.
   */
  const PUBLIC_PAYROLL = 3_448_510_643 + 13_924_905_613;
  const ABOVE_500K = 8_873e6 / 0.096 - PUBLIC_PAYROLL; // private payroll above $500k
  const ABOVE_10M = (11_341e6 - 8_873e6) / 0.044 - PUBLIC_PAYROLL; // private payroll above $10M
  /** Wages the Board's HHCC-on-wages figures imply ($5,567M at 5.2%, Appendix FR p.31). */
  const BOARD_WAGES = 107e9;

  /**
   * 2022 to 2032. Legislative Revenue Office 2032 projections (legislative brief, Oct 22
   * 2026, p.10), Models 2-5: EPT $19.2B vs $11.341B in 2022; HHCC $14.0-14.1B vs $8.17B.
   */
  const GROW_PAYROLL = 19.2 / 11.341;
  const GROW_INCOME = 14.1 / 8.17;

  /** Per-unit 2032 estimates for taxes outside the household/payroll pair ($B). */
  const PER_UNIT = {
    // LRO via ECONorthwest F&R report p.72: 5% raises $5,853M in FY 2026-27; grown 4.4%/yr to 2032 (our math).
    sales: (5.853 / 5) * Math.pow(1.044, 5.5),
    // DOR FY 2024-25 net assessed value $532.5B, grown 3.8%/yr (its last-year growth) to 2032: $ per $1,000 AV (our math).
    property: 0.5325 * Math.pow(1.038, 7.5),
    // LRO: $0.27B per percentage point of corporate income/excise tax in 2032 (Appendix FR).
    cit: 0.27,
    // LRO: a 0.113% CAT add-on raises $0.39B in 2032 (report Table R1). Per 0.1 point.
    cat: 0.39 / 1.13,
    // LRO 2020 (Measure 108): $2/pack raises about $150M a year. Per $1 a pack, no growth.
    cig: 0.075,
  };

  /** Ways of measuring the need, from the repo's uhp-statewide.ts (2032, $B). */
  const TARGETS = [
    { id: 'board', label: "Board's estimate", need: 30.0, today: 36.6, note: 'Board savings assumptions; provider rates reset.' },
    { id: 'best', label: "Milliman's best estimate", need: 39.0, today: 39.6, note: 'Actuaries’ central estimate; provider rates reset.' },
    { id: 'board-noreset', label: "Board's, no provider rate reset", need: 38.0, today: 36.6, note: 'Providers keep today’s rates: +$8.0B.' },
    { id: 'best-noreset', label: "Milliman's, no provider rate reset", need: 46.8, today: 39.6, note: 'Providers keep today’s rates: +$7.8B.' },
  ];

  // Household bracket starts in 2022 dollars for one exemption, doubled for two or more
  // (Appendix FR pp.34-35: 50k/100k/200k/400k). $851.5k is $1M in 2026 dollars.
  const DOLLAR_STARTS = [50e3, 100e3, 200e3, 400e3, 1e6 / TO_2026];
  const BANDS = ['138%–200% of poverty', '200% of poverty–$59k', '$59k–$117k', '$117k–$235k', '$235k–$470k', '$470k–$1M', 'Over $1M'];

  // ---------------------------------------------------------------- SYNTHETIC RETURNS
  const K = 240;

  function binIncomes(stub, mean) {
    if (stub === 1) return Array(K).fill(mean);
    const lo = EDGES[stub], hi = EDGES[stub + 1];
    if (hi !== null && mean >= lo + (hi - lo) / 3 && mean <= hi - (hi - lo) / 3) {
      // linear density on [lo, hi] with the bin's mean
      const w = hi - lo, mid = (lo + hi) / 2, c = ((mean - mid) * 12) / w ** 3, N = 2000;
      const xs = [], f = [];
      for (let i = 0; i < N; i++) { const x = lo + (w * (i + 0.5)) / N; xs.push(x); f.push(Math.max(0, 1 / w + c * (x - mid))); }
      const tot = f.reduce((a, b) => a + b, 0), out = [];
      let acc = 0, j = 0;
      for (let i = 0; i < N; i++) { acc += f[i] / tot; while (j < K && acc >= (j + 0.5) / K) { out.push(xs[i]); j++; } }
      while (out.length < K) out.push(xs[N - 1]);
      return out;
    }
    // Pareto from lo, truncated at hi if any, with alpha solved to match the mean
    const draw = (a) => Array.from({ length: K }, (_, j) => lo * Math.pow(1 - ((j + 0.5) / K) * (1 - (hi ? Math.pow(lo / hi, a) : 0)), -1 / a));
    let aLo = 1.01, aHi = 20, q = [];
    for (let i = 0; i < 80; i++) {
      const a = (aLo + aHi) / 2; q = draw(a);
      if (q.reduce((s, x) => s + x, 0) / K > mean) aLo = a; else aHi = a;
    }
    return q;
  }

  /** Flat arrays, one entry per synthetic return: income (AGI less taxable SS), exemptions, weight, wages, capital gains. */
  const R = (() => {
    const inc = [], ex = [], w = [], wage = [], cg = [];
    for (const [stub, n, single, joint, hoh, people, agi, ss, wages, gains] of IRS_2022_OR) {
      const base = (agi - ss) * 1e3, mean = base / n;
      const other = n - single - joint - hoh; // mostly married filing separately
      const deps = Math.max(0, people - single - other - 2 * joint - hoh) / Math.max(1, joint + hoh);
      const types = [[single + other, 1], [joint, 2 + deps], [hoh, 1 + deps]];
      const pts = binIncomes(stub, mean);
      for (const [count, exemptions] of types) {
        for (const x of pts) {
          inc.push(x); ex.push(exemptions); w.push(count / K);
          // wages and gains spread in proportion to income inside the bin
          const share = base > 0 ? x / base : 1 / n;
          wage.push(wages * 1e3 * share); cg.push(gains * 1e3 * share);
        }
      }
    }
    // Rank by income for the who-pays groups.
    const order = inc.map((_, i) => i).sort((a, b) => inc[a] - inc[b]);
    const pick = (arr) => Float64Array.from(order, (i) => arr[i]);
    return { inc: pick(inc), ex: pick(ex), w: pick(w), wage: pick(wage), cg: pick(cg) };
  })();
  const N = R.inc.length;

  /**
   * Spending, for consumption taxes: rises with income at elasticity 0.52, fit to BLS
   * Consumer Expenditure Survey 2025 quintile means (spending $37.9k at $18.1k income,
   * $159.5k at $286.2k). Floor of $15k income. ponytail: one curve for sales, CAT,
   * cigarette and property taxes; real incidence differs by tax.
   */
  const spendOf = (income) => Math.pow(Math.max(income, 15e3), 0.52);
  const SPEND = Float64Array.from(R.inc, spendOf);

  /** Who-pays groups by share of returns, lowest income first. */
  const GROUPS = [
    { label: 'Lowest 20%', to: 0.2 }, { label: 'Second 20%', to: 0.4 }, { label: 'Middle 20%', to: 0.6 },
    { label: 'Fourth 20%', to: 0.8 }, { label: '80–90%', to: 0.9 }, { label: '90–95%', to: 0.95 },
    { label: '95–99%', to: 0.99 }, { label: '99–99.9%', to: 0.999 }, { label: 'Top 0.1%', to: 1 },
  ];
  const GROUP_OF = (() => {
    const total = R.w.reduce((a, b) => a + b, 0), g = new Uint8Array(N);
    let acc = 0, k = 0;
    for (let i = 0; i < N; i++) { acc += R.w[i]; while (k < GROUPS.length - 1 && acc / total > GROUPS[k].to + 1e-9) k++; g[i] = k; }
    return g;
  })();
  const GROUP_INCOME = (() => {
    const s = new Float64Array(GROUPS.length);
    for (let i = 0; i < N; i++) s[GROUP_OF[i]] += Math.max(0, R.inc[i]) * R.w[i];
    return s;
  })();
  /**
   * The tax base, group by group: where it starts (2026 $), returns, share of returns and
   * of income, and what 1% of the group's income raises in 2032 ($B). ponytail: the top
   * 0.1% sits inside IRS's open $1M+ bin, so its split from 99-99.9% rests on the Pareto fit.
   */
  const BASE = (() => {
    const totalW = R.w.reduce((a, b) => a + b, 0);
    const totalInc = GROUP_INCOME.reduce((a, b) => a + b, 0);
    return GROUPS.map((grp, k) => {
      let floor = null, returns = 0;
      for (let i = 0; i < N; i++) if (GROUP_OF[i] === k) { if (floor === null) floor = R.inc[i]; returns += R.w[i]; }
      return {
        label: grp.label, floor: Math.max(0, floor) * TO_2026, returns,
        returnShare: returns / totalW, incomeShare: GROUP_INCOME[k] / totalInc,
        onePercent: (GROUP_INCOME[k] * 0.01 * GROW_INCOME) / 1e9,
      };
    });
  })();

  /**
   * Extra-tax thresholds, 2026 $: where the top 20% and top 1% of returns start, rounded
   * to $10k. Per return, not doubled for couples, so they match the who-pays groups.
   */
  const SUR_START = { top20: Math.round(BASE[4].floor / 1e4) * 1e4, top1: Math.round(BASE[7].floor / 1e4) * 1e4 };
  // y26: income is in 2026 dollars (one household's bill); otherwise 2022 dollars (the statewide data).
  const sur = (policy, income, y26) => {
    const k = y26 ? 1 : TO_2026;
    return policy.top20 * Math.max(0, income - SUR_START.top20 / k) + policy.top1 * Math.max(0, income - SUR_START.top1 / k);
  };

  // ---------------------------------------------------------------- RULES

  const fpl = (pct, ex, y26) => { const f = y26 ? FPL26 : FPL22; return pct * (f.first + f.each * (Math.max(ex, 1) - 1)); };

  /** Bracket starts for a household with `ex` exemptions, in 2022 dollars, or 2026 dollars when y26. */
  function starts(policy, ex, y26) {
    const exempt = fpl(policy.exempt, ex, y26), dbl = ex >= 2 ? 2 : 1, k = y26 ? TO_2026 : 1;
    const raw = [fpl(1.38, ex, y26), fpl(2.0, ex, y26), ...DOLLAR_STARTS.map((d) => d * dbl * k)];
    let prev = exempt;
    return raw.map((s) => (prev = Math.max(prev, s, exempt)));
  }

  function grossHH(policy, income, ex, y26) {
    const st = starts(policy, ex, y26);
    let t = 0;
    for (let b = 0; b < st.length; b++) {
      const top = b + 1 < st.length ? st[b + 1] : Infinity;
      t += Math.max(0, Math.min(income, top) - st[b]) * policy.hh[b];
    }
    return t + sur(policy, income, y26);
  }

  /** Private payroll tax on one employer's payroll ($). */
  function payrollTax(policy, payroll) {
    return Math.max(0, Math.min(payroll, 10e6) - 500e3) * policy.ept1 + Math.max(0, payroll - 10e6) * policy.ept2;
  }

  /** Statewide payroll tax, 2022 $. */
  function eptTotal22(policy) {
    return policy.ept1 * (ABOVE_500K - ABOVE_10M) + policy.ept2 * ABOVE_10M + Math.max(policy.ept1, policy.ept2) * PUBLIC_PAYROLL;
  }

  function hhNet(policy, income, ex, wages, employerRate, y26) {
    const gross = grossHH(policy, income, ex, y26);
    const credit = policy.credit * employerRate * Math.max(0, wages);
    return Math.min(Math.max(0, gross - credit), y26 ? policy.cap : policy.cap / TO_2026);
  }

  // ---------------------------------------------------------------- EVALUATE

  const CATEGORIES = [
    { id: 'hh', label: 'Household contribution' },
    { id: 'ept', label: 'Employer payroll tax' },
    { id: 'income', label: 'Other income taxes' },
    { id: 'consumption', label: 'Sales and consumption' },
    { id: 'property', label: 'Property tax' },
    { id: 'corporate', label: 'Corporate taxes' },
  ];

  /**
   * Revenue in 2032 $B by instrument and category, and the average rate by income group.
   * Allocation for who-pays: payroll tax and wage tax by wages (as the Board does);
   * capital gains by gains; consumption and property by spending; corporate taxes 75% by
   * non-wage income and 25% by wages (a common incidence split).
   */
  function evaluate(policy) {
    const ept22 = eptTotal22(policy);
    const avgEmployerRate = ept22 / BOARD_WAGES;
    let hh22 = 0, top20_22 = 0, top1_22 = 0, payers = 0, returns = 0, wages22 = 0, gains22 = 0, spend22 = 0, nonwage22 = 0;
    const hhBy = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const v = hhNet(policy, R.inc[i], R.ex[i], R.wage[i], avgEmployerRate);
      hhBy[i] = v; hh22 += v * R.w[i];
      // The extras' share of what this return actually pays, after any cap and worker credit.
      const g = policy.top20 || policy.top1 ? grossHH(policy, R.inc[i], R.ex[i]) : 0, keep = g > 0 ? (v / g) * R.w[i] : 0;
      top20_22 += policy.top20 * Math.max(0, R.inc[i] - SUR_START.top20 / TO_2026) * keep;
      top1_22 += policy.top1 * Math.max(0, R.inc[i] - SUR_START.top1 / TO_2026) * keep; if (v > 0) payers += R.w[i]; returns += R.w[i];
      wages22 += R.wage[i] * R.w[i]; gains22 += Math.max(0, R.cg[i]) * R.w[i]; spend22 += SPEND[i] * R.w[i];
      nonwage22 += Math.max(0, R.inc[i] - R.wage[i]) * R.w[i];
    }
    const B = 1e9;
    const lines = {
      hh: (hh22 * GROW_INCOME) / B,
      // parts of hh, after any cap or worker credit
      top20: (top20_22 * GROW_INCOME) / B,
      top1: (top1_22 * GROW_INCOME) / B,
      ept: (ept22 * GROW_PAYROLL) / B,
      wageTax: (policy.wageTax * wages22 * GROW_INCOME) / B,
      gains: (policy.gains * gains22 * GROW_INCOME) / B,
      sales: policy.sales * 100 * PER_UNIT.sales,
      cat: (policy.cat / 0.1) * PER_UNIT.cat,
      cig: policy.cig * PER_UNIT.cig,
      property: policy.property * PER_UNIT.property,
      cit: policy.cit * 100 * PER_UNIT.cit,
    };
    const byCat = {
      hh: lines.hh, ept: lines.ept, income: lines.wageTax + lines.gains,
      consumption: lines.sales + lines.cat + lines.cig, property: lines.property, corporate: lines.cit,
    };
    const total = Object.values(byCat).reduce((a, b) => a + b, 0);

    // who pays: $ per group, by category, in 2022 dollars then rate = share of group income
    const G = GROUPS.length, by = CATEGORIES.map(() => new Float64Array(G));
    const per = (amount2032, base22) => (base22 > 0 ? (amount2032 * B) / GROW_INCOME / base22 : 0);
    const kEpt = per(lines.ept, wages22); // payroll tax $ per wage $
    const kWage = per(lines.wageTax, wages22), kGains = per(lines.gains, gains22);
    const kSpend = per(lines.sales + lines.cat + lines.cig, spend22), kProp = per(lines.property, spend22);
    const kCorpCap = per(lines.cit * 0.75, nonwage22), kCorpLab = per(lines.cit * 0.25, wages22);
    for (let i = 0; i < N; i++) {
      const g = GROUP_OF[i], w = R.w[i], wage = Math.max(0, R.wage[i]);
      by[0][g] += hhBy[i] * w;
      by[1][g] += kEpt * wage * w;
      by[2][g] += (kWage * wage + kGains * Math.max(0, R.cg[i])) * w;
      by[3][g] += kSpend * SPEND[i] * w;
      by[4][g] += kProp * SPEND[i] * w;
      by[5][g] += (kCorpCap * Math.max(0, R.inc[i] - R.wage[i]) + kCorpLab * wage) * w;
    }
    const rates = CATEGORIES.map((_, c) => Array.from(by[c], (v, g) => v / GROUP_INCOME[g]));

    return { lines, byCat, total, rates, owesNothing: 1 - payers / returns, avgEmployerRate, kSpend, kProp };
  }

  /**
   * One household, in 2026 dollars. employer: 'none' | 'small' | 'medium' | 'large' | 'public'.
   * Indirect taxes use the statewide average per dollar of spending.
   */
  const EMPLOYER_PAYROLL = { none: 0, small: 400e3, medium: 8.5e6, large: 100e6 };
  function household(policy, result, { income, size, wages, employer }) {
    const rate = employer === 'public' ? Math.max(policy.ept1, policy.ept2)
      : EMPLOYER_PAYROLL[employer] ? payrollTax(policy, EMPLOYER_PAYROLL[employer]) / EMPLOYER_PAYROLL[employer] : 0;
    const w = employer === 'none' ? 0 : wages;
    const inc22 = income / TO_2026;
    const contribution = hhNet(policy, income, size, w, rate, true);
    const otherIncome = policy.wageTax * w; // capital gains not asked for
    const spend = spendOf(inc22);
    const consumption = (result.kSpend + result.kProp) * spend * TO_2026;
    return { contribution, otherIncome, consumption, employerPays: rate * w, employerRate: rate };
  }

  /** Share of Oregon returns with less income than this (2026 $), and the who-pays group it falls in. */
  function standing(income2026) {
    const x = income2026 / TO_2026, total = R.w.reduce((a, b) => a + b, 0);
    let below = 0, group = 0;
    for (let i = 0; i < N && R.inc[i] < x; i++) { below += R.w[i]; group = GROUP_OF[i]; }
    return { below: below / total, group };
  }

  // ---------------------------------------------------------------- PRESETS
  const ZERO_OTHER = { top20: 0, top1: 0, wageTax: 0, gains: 0, sales: 0, property: 0, cat: 0, cig: 0, cit: 0, cap: Infinity };
  const BOARD_OTHER = { ...ZERO_OTHER, cit: 0.0425, cat: 0.113 }; // report Table R3; CAT in percentage points
  const PRESETS = [
    { id: 'empty', label: 'Start empty', policy: { exempt: 2.0, hh: [0, 0, 0, 0, 0, 0, 0], credit: 0, ept1: 0, ept2: 0, ...ZERO_OTHER } },
    { id: 'm1', label: 'Board Model 1', policy: { exempt: 2.0, hh: [0, 0.135, 0.135, 0.135, 0.135, 0.135, 0.135], credit: 0.5, ept1: 0.096, ept2: 0.096, ...BOARD_OTHER } },
    { id: 'm2', label: 'Board Model 2', policy: { exempt: 2.0, hh: [0, 0.1205, 0.1205, 0.1205, 0.1205, 0.1205, 0.1205], credit: 0.5, ept1: 0.096, ept2: 0.14, ...BOARD_OTHER } },
    { id: 'm3', label: 'Board Model 3', policy: { exempt: 2.0, hh: [0, 0.0769, 0.0769, 0.0769, 0.0769, 0.0769, 0.0769], credit: 0, ept1: 0.096, ept2: 0.14, ...BOARD_OTHER } },
    { id: 'm4', label: 'Board Model 4', policy: { exempt: 1.38, hh: [0.03, 0.09, 0.12, 0.143, 0.143, 0.143, 0.143], credit: 0.5, ept1: 0.096, ept2: 0.14, ...BOARD_OTHER } },
    { id: 'm5', label: 'Board Model 5', policy: { exempt: 1.38, hh: [0.02, 0.0478, 0.07, 0.09, 0.12, 0.12, 0.12], credit: 0, ept1: 0.096, ept2: 0.14, ...BOARD_OTHER } },
  ];

  // ---------------------------------------------------------------- SHARE CODES
  /**
   * A plan as "t200-o1000-h500": a short key, then an integer (value x scale). Only settings
   * that differ from the empty plan are written. "h" sets household bands 2-7 at once; "ha".."hg"
   * set one band. Codes come from links, so decoding ignores anything unknown and clamps values.
   */
  const CODE = [
    // [key, setting, scale, the page's slider maximum or the allowed menu choices]
    ['x', 'exempt', 100, [1.38, 2, 2.5, 3]], ['t', 'top20', 1e4, 0.1], ['o', 'top1', 1e4, 0.2], ['c', 'credit', 100, [0, 0.5, 1]],
    ['m', 'cap', 1e-3, [500000, 250000, 100000, 50000]], ['e', 'ept1', 1e4, 0.2], ['f', 'ept2', 1e4, 0.25], ['w', 'wageTax', 1e4, 0.08],
    ['g', 'gains', 1e4, 0.15], ['s', 'sales', 1e4, 0.1], ['p', 'property', 100, 6], ['a', 'cat', 1e3, 0.6], ['k', 'cig', 100, 4], ['i', 'cit', 1e4, 0.1],
  ];
  const BAND_MAX = 0.25;
  const BAND_KEYS = 'abcdefg';
  function encodePlan(p) {
    const empty = PRESETS[0].policy, out = [], hh = p.hh, same = hh.slice(1).every((v) => v === hh[1]);
    for (const [k, key, sc] of CODE) if (p[key] !== empty[key]) out.push(k + Math.round(p[key] * sc));
    if (hh[0]) out.push('ha' + Math.round(hh[0] * 1e4));
    if (same) { if (hh[1]) out.push('h' + Math.round(hh[1] * 1e4)); }
    else hh.forEach((v, b) => { if (b && v) out.push('h' + BAND_KEYS[b] + Math.round(v * 1e4)); });
    return out.join('-');
  }
  function decodePlan(code) {
    const p = structuredClone(PRESETS[0].policy);
    for (const part of String(code).split('-')) {
      const m = /^([a-z]{1,2})(\d{1,10})$/.exec(part);
      if (!m) continue;
      const [, k, digits] = m, n = Number(digits);
      if (k === 'h') { p.hh = p.hh.map((v, b) => (b ? Math.min(n / 1e4, BAND_MAX) : v)); continue; }
      if (k.length === 2 && k[0] === 'h') { const b = BAND_KEYS.indexOf(k[1]); if (b >= 0) p.hh[b] = Math.min(n / 1e4, BAND_MAX); continue; }
      const c = CODE.find(([ck]) => ck === k);
      if (!c) continue;
      const v = n / c[2], lim = c[3];
      if (Array.isArray(lim)) { const hit = lim.find((x) => Math.abs(x - v) < 1e-6); if (hit !== undefined) p[c[1]] = hit; }
      else p[c[1]] = Math.min(v, lim);
    }
    return p;
  }

  /** Appendix FR 2022 results, for the calibration check. */
  const BOARD_2022 = [
    { id: 'm1', hh: 10_631, ept: 8_873, owesNothing: 0.545 },
    { id: 'm2', hh: 8_167, ept: 11_341, owesNothing: 0.604 },
    { id: 'm3', hh: 8_171, ept: 11_341, owesNothing: 0.403 },
    { id: 'm4', hh: 8_170, ept: 11_341, owesNothing: 0.649 },
    { id: 'm5', hh: 8_170, ept: 11_341, owesNothing: 0.312 },
  ];
  /** LRO 2032 projections at the draft rates, Oct 22 brief p.10 ($B). */
  const LRO_2032 = { m1: 32.35, m2: 34.74, m3: 34.84, m4: 34.84, m5: 34.84 };

  globalThis.Balancer = {
    evaluate, household, standing, PRESETS, TARGETS, CATEGORIES, GROUPS, BASE, BANDS, BOARD_2022, LRO_2032,
    GROW_INCOME, GROW_PAYROLL, TO_2026, PER_UNIT, SUR_START, encodePlan, decodePlan,
  };
})();
