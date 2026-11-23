/**
 * Who pays under each Board model, across incomes: the model's own household rules
 * (contribution() from src/model) applied to every return in the 2022 population,
 * plus the employer payroll tax counted against workers' wages, as the Board does.
 *
 * This is the Board's own basis: the appendix set its rates on 2022 tax data, and
 * its distribution tables (Figure AFR4Fi, brief p. 9) describe that 2022 model.
 * Rates are shares of income, so they do not depend on which year's dollars are used.
 */
import { MODELS, contribution } from '../model/uhp-model';
import type { RevenueModel } from '../model/uhp-model';
import { INDEX_2022_TO_2026 } from '../model/proposals/uhpgb-2026-10';
import { GROUPS, GROUP_OF, POPULATION, WAGES_2022 } from './population';

/**
 * The Board's 2022 results, $ millions: household contribution (HHCC) and employer
 * payroll tax (EPT). Appendix FR, PDF pages 31–35, one page per model.
 */
export const APPENDIX_2022: Readonly<Record<number, { hhcc: number; ept: number }>> = Object.freeze({
  1: { hhcc: 10_631, ept: 8_873 },
  2: { hhcc: 8_167, ept: 11_341 },
  3: { hhcc: 8_171, ept: 11_341 },
  4: { hhcc: 8_170, ept: 11_341 },
  5: { hhcc: 8_170, ept: 11_341 },
});

/** 2022 dollars to 2026 dollars, the factor the model uses for its fixed brackets. */
const INDEX = INDEX_2022_TO_2026.to / INDEX_2022_TO_2026.from;

export interface Distribution {
  model: RevenueModel;
  /** Statewide household contribution, 2022 dollars. */
  hhccTotal: number;
  /** Share of each group's income paid as household contribution, by group (GROUPS order). */
  hhcc: number[];
  /** Share of each group's income paid as employer payroll tax on its wages, by group. */
  ept: number[];
  /** The same two shares for the whole top fifth. */
  topFifth: { hhcc: number; ept: number };
  /** Household contribution plus payroll tax, as a share of income, for each fifth. */
  byFifth: number[];
  /** Share of returns owing no household contribution. */
  owesNothing: number;
  /** The middle fifth's household contribution as a share of its income. */
  middleFifthHhcc: number;
  /** Share of all household contributions paid by the top 1%. */
  top1Share: number;
}

/** Who pays under one model. */
export function distribution(model: RevenueModel): Distribution {
  const { income, wages, size, weight } = POPULATION;
  const ept = APPENDIX_2022[Number(model.id)].ept * 1e6;
  // Payroll tax per dollar of wages, statewide: our estimate of what the worker credit applies to.
  const eptPerWage = ept / WAGES_2022;
  const G = GROUPS.length, inc = new Array<number>(G).fill(0), hh = new Array<number>(G).fill(0), pay = new Array<number>(G).fill(0);
  let total = 0, none = 0, returns = 0;
  for (let i = 0; i < income.length; i++) {
    const w = weight[i], g = GROUP_OF[i];
    const owed = contribution(model, income[i] * INDEX, wages[i] * INDEX, size[i], eptPerWage) / INDEX;
    total += owed * w; returns += w; if (owed <= 0) none += w;
    inc[g] += Math.max(0, income[i]) * w; hh[g] += owed * w; pay[g] += eptPerWage * wages[i] * w;
  }
  const sum = (a: number[], ks: number[]) => ks.reduce((s, k) => s + a[k], 0);
  const fifth = (f: number) => GROUPS.flatMap((grp, k) => (grp.fifth === f ? [k] : []));
  const top = fifth(4);
  return {
    model,
    hhccTotal: total,
    hhcc: hh.map((v, k) => v / inc[k]),
    ept: pay.map((v, k) => v / inc[k]),
    topFifth: { hhcc: sum(hh, top) / sum(inc, top), ept: sum(pay, top) / sum(inc, top) },
    byFifth: [0, 1, 2, 3, 4].map((f) => (sum(hh, fifth(f)) + sum(pay, fifth(f))) / sum(inc, fifth(f))),
    owesNothing: none / returns,
    middleFifthHhcc: sum(hh, fifth(2)) / sum(inc, fifth(2)),
    top1Share: sum(hh, [7, 8]) / total,
  };
}

/** Every Board model's distribution, in model order. */
export const DISTRIBUTIONS: readonly Distribution[] = MODELS.map(distribution);
