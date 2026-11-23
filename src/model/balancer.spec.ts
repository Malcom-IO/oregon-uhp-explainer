/**
 * The revenue balancer (public/balancer/) is plain JavaScript with its own copy of the
 * household rules. These tests hold it to this model and to the Board: a household's
 * bill must match bill() to the dollar, its statewide totals must stay calibrated to
 * Appendix FR, and share links must round-trip and reject what the page can't show.
 * `node public/balancer/check.mjs` prints the same comparison as a table.
 */
import engine from '../../public/balancer/engine.js?raw';
import { MODELS, bill } from './uhp-model';

new Function(engine)();
const B = (globalThis as unknown as { Balancer: any }).Balancer;
const preset = (id: string) => B.PRESETS.find((p: { id: string }) => p.id === id).policy;

describe('revenue balancer', () => {
  it('bills a household exactly as the calculator does, under every model', () => {
    for (const m of MODELS) {
      const policy = preset('m' + m.id), result = B.evaluate(policy);
      for (const size of [1, 2, 3, 4, 5]) {
        for (const income of [25e3, 35e3, 45e3, 60e3, 85e3, 150e3, 400e3, 2e6]) {
          for (const [kind, employer, payroll] of [['none', 'none', 0], ['private', 'medium', 8.5e6]] as const) {
            const expected = bill(m, income, size, kind, payroll).household;
            const wages = kind === 'none' ? 0 : income;
            const actual = B.household(policy, result, { income, size, wages, employer }).contribution;
            // within 50 cents: the Board rounds 138% of poverty to whole dollars
            expect(actual, `Model ${m.id}, ${size} people, $${income}, ${kind}`).toBeCloseTo(expected, 0);
          }
        }
      }
    }
  });

  it("reproduces the Board's 2022 results: households within 7%, payroll exactly", () => {
    for (const ref of B.BOARD_2022) {
      const r = B.evaluate(preset(ref.id));
      expect(Math.abs((r.lines.hh / B.GROW_INCOME) * 1e3 / ref.hh - 1), ref.id).toBeLessThan(0.07);
      expect(Math.abs((r.lines.ept / B.GROW_PAYROLL) * 1e3 / ref.ept - 1), ref.id).toBeLessThan(0.001);
    }
  });

  it('counts the extra tax on the top 1% after any cap', () => {
    const one = B.evaluate({ ...preset('empty'), top1: 0.01 }).lines.top1;
    const allTheirIncome = B.BASE[7].onePercent + B.BASE[8].onePercent;
    expect(one).toBeGreaterThan(0.5 * allTheirIncome);
    expect(one).toBeLessThan(allTheirIncome);
    const capped = B.evaluate({ ...preset('empty'), top1: 0.2, cap: 50000 }).lines;
    expect(capped.top1).toBeLessThanOrEqual(capped.hh + 1e-9);
  });

  it('round-trips share links and ignores what the page cannot show', () => {
    const fine = { ...preset('m4'), top1: 0.05, cap: 250000, cig: 1.5, property: 2.4, cat: 0.2, sales: 0.0325 };
    for (const p of [...B.PRESETS.map((x: { policy: unknown }) => x.policy), fine]) {
      const back = B.decodePlan(B.encodePlan(p));
      for (const k of Object.keys(p)) {
        if (k === 'hh') p.hh.forEach((v: number, i: number) => expect(back.hh[i]).toBeCloseTo(v, 9));
        else if (p[k] === Infinity) expect(back[k]).toBe(Infinity);
        else expect(back[k], k).toBeCloseTo(p[k], 9);
      }
    }
    const junk = B.decodePlan('m0-x150-c37-o10000-ha9999-zz1-<b>');
    expect(junk).toMatchObject({ cap: Infinity, exempt: 2, credit: 0, top1: 0.2 });
    expect(junk.hh[0]).toBe(0.25);
  });
});
