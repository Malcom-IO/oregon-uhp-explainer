import { Proposal, ProposalError, parseProposal, thresholdFor, validateProposal } from './proposal';
import { BOARD_PROPOSALS } from './proposals/uhpgb-2026-10';
import {
  MODELS,
  SCENARIOS,
  bill,
  contribution,
  employerRate,
  grossContribution,
  payrollTax,
  schedule,
} from './uhp-model';

/**
 * A made-up proposal that shares nothing with the Board's five: a named ID,
 * four brackets (the Board's have two, five or six), households of one to
 * three, three payroll tiers, a 25% credit and public employers taxed like
 * private ones. If the engine still had a rule of the Board's built in, the
 * hand-worked figures below would not come out.
 */
const SYNTHETIC: Proposal = {
  id: 'synthetic-what-if',
  name: 'Synthetic test proposal',
  blurb: 'Not a real proposal. It exists to prove the engine computes from data.',
  household: {
    exemption: '$20,000 for one person',
    brackets: [
      { from: { bySize: { 1: 20_000, 2: 30_000, 3: 35_000 }, source: 'made up' }, rate: 0.1 },
      { from: { bySize: { 1: 50_000, 2: 80_000, 3: 90_000 }, source: 'made up' }, rate: 0.2 },
      {
        // 100,000 / 160,000 / 180,000 in base-year dollars, raised 10%.
        from: {
          bySize: { 1: 100_000, 2: 160_000, 3: 180_000 },
          index: { from: 100, to: 110, basis: 'made up' },
          source: 'made up',
        },
        rate: 0.3,
      },
    ],
    creditShare: 0.25,
    source: 'made up',
  },
  payroll: {
    summary: '5% above $1 million, 8% above $5 million, 10% above $20 million',
    tiers: [
      { above: 1_000_000, rate: 0.05 },
      { above: 5_000_000, rate: 0.08 },
      { above: 20_000_000, rate: 0.1 },
    ],
    publicEmployer: 'same-as-private',
    source: 'made up',
  },
};

/** A deep copy with one change, for the "what if this were wrong" cases. */
function altered(base: Proposal, change: (draft: any) => void): unknown {
  const draft = JSON.parse(JSON.stringify(base));
  change(draft);
  return draft;
}

describe('a proposal the engine has never seen', () => {
  it('is a valid proposal, and survives a round trip through JSON', () => {
    expect(validateProposal(SYNTHETIC)).toEqual([]);
    const reloaded = parseProposal(JSON.parse(JSON.stringify(SYNTHETIC)));
    expect(reloaded).toEqual(SYNTHETIC);
    expect(bill(reloaded, 150_000, 1, 'private', 30_000_000)).toEqual({
      ...bill(SYNTHETIC, 150_000, 1, 'private', 30_000_000),
      model: reloaded,
    });
  });

  it('builds its schedule from its own thresholds, by household size', () => {
    const one = schedule(SYNTHETIC, 1);
    expect(one.map((b) => b.rate)).toEqual([0.1, 0.2, 0.3]);
    expect(one[0].from).toBe(20_000);
    expect(one[1].from).toBe(50_000);
    expect(one[2].from).toBeCloseTo(110_000, 6);
    const three = schedule(SYNTHETIC, 3);
    expect(three[0].from).toBe(35_000);
    expect(three[2].from).toBeCloseTo(198_000, 6);
  });

  it('charges each slice of income at its own rate', () => {
    // One person, $150,000: 30,000 at 10% + 60,000 at 20% + 40,000 at 30%.
    expect(grossContribution(150_000, schedule(SYNTHETIC, 1))).toBeCloseTo(27_000, 6);
    // Two people, $100,000: 50,000 at 10% + 20,000 at 20%.
    expect(grossContribution(100_000, schedule(SYNTHETIC, 2))).toBeCloseTo(9_000, 6);
    expect(contribution(SYNTHETIC, 20_000, 0, 1, 0)).toBe(0);
    expect(contribution(SYNTHETIC, 21_000, 0, 1, 0)).toBeCloseTo(100, 6);
  });

  it('with a single bracket, still uses its own threshold', () => {
    const flat = parseProposal(
      altered(SYNTHETIC, (d) => (d.household.brackets = [d.household.brackets[0]])),
    );
    expect(schedule(flat, 2)).toEqual([{ from: 30_000, rate: 0.1 }]);
    // Two people, $100,000: 70,000 at 10%.
    expect(contribution(flat, 100_000, 0, 2, 0)).toBeCloseTo(7_000, 6);
  });

  it('taxes payroll through all three of its tiers', () => {
    expect(payrollTax(1_000_000, SYNTHETIC)).toBe(0);
    expect(payrollTax(3_000_000, SYNTHETIC)).toBeCloseTo(100_000, 6);
    // 4 million at 5% + 15 million at 8% + 10 million at 10%.
    expect(payrollTax(30_000_000, SYNTHETIC)).toBeCloseTo(2_400_000, 6);
    expect(employerRate('private', SYNTHETIC, 30_000_000)).toBeCloseTo(0.08, 12);
  });

  it('follows its own public-employer rule', () => {
    expect(employerRate('public', SYNTHETIC, 30_000_000)).toBeCloseTo(0.08, 12);
    expect(employerRate('public', SYNTHETIC)).toBe(0);
    const topRate = parseProposal(
      altered(SYNTHETIC, (d) => (d.payroll.publicEmployer = 'top-rate-from-first-dollar')),
    );
    expect(employerRate('public', topRate)).toBe(0.1);
    // The highest rate, wherever it sits in the list.
    const highestFirst = parseProposal(
      altered(SYNTHETIC, (d) => {
        d.payroll.publicEmployer = 'top-rate-from-first-dollar';
        d.payroll.tiers[0].rate = 0.12;
      }),
    );
    expect(employerRate('public', highestFirst)).toBe(0.12);
  });

  it('applies its own credit share', () => {
    // Gross 27,000; credit 25% x 8% x 150,000 wages = 3,000.
    const b = bill(SYNTHETIC, 150_000, 1, 'private', 30_000_000);
    expect(b.model).toBe(SYNTHETIC);
    expect(b.gross).toBeCloseTo(27_000, 6);
    expect(b.credit).toBeCloseTo(3_000, 6);
    expect(b.household).toBeCloseTo(24_000, 6);
    expect(b.employer).toBeCloseTo(12_000, 6);
  });

  it('has no payroll tax when it lists no tiers', () => {
    const none = parseProposal(altered(SYNTHETIC, (d) => (d.payroll.tiers = [])));
    expect(payrollTax(50_000_000, none)).toBe(0);
    expect(employerRate('private', none, 50_000_000)).toBe(0);
    expect(employerRate('public', none)).toBe(0);
  });

  it('refuses a household size it gives no thresholds for', () => {
    expect(() => schedule(SYNTHETIC, 4)).toThrow(RangeError);
    expect(() => bill(MODELS[0], 50_000, 6, 'none')).toThrow(RangeError);
  });

  it('is not reachable by ID: only the board models are', () => {
    expect(() => payrollTax(1_000_000, 'synthetic-what-if')).toThrow(RangeError);
    expect(() => employerRate('public', 6)).toThrow(RangeError);
  });
});

describe('the board models as data', () => {
  it('are valid proposals', () => {
    for (const proposal of BOARD_PROPOSALS) expect(validateProposal(proposal)).toEqual([]);
  });

  it('are what MODELS is built from', () => {
    expect(MODELS.map((m) => m.id)).toEqual([1, 2, 3, 4, 5]);
    MODELS.forEach((model, i) => {
      const { household, payroll, published } = BOARD_PROPOSALS[i];
      expect(model.rates).toEqual(household.brackets.map((b) => b.rate));
      expect(model.brackets).toBe(household.brackets.length + 1);
      expect(model.topRate).toBe(household.brackets.at(-1)!.rate);
      expect(model.exemptFamilyOf4).toBe(thresholdFor(household.brackets[0].from, 4));
      expect(model.creditShare).toBe(household.creditShare);
      expect(model.employerTax).toBe(payroll.summary);
      expect(model.reportRate).toBe(published.reportRate);
      expect(model.combinedByFifth).toBe(published.combinedByFifth);
    });
  });

  it('carry the Board\'s published figures to the right fields', () => {
    const flat = MODELS.map((m) => [
      m.exemption,
      m.exemptFamilyOf4,
      m.topRate,
      m.reportRate,
      m.returnsOwingNothing,
      m.middleFifthRate,
      m.top1Share,
      m.creditShare,
    ]);
    expect(flat).toEqual([
      ['200% FPL', 66_000, 0.135, 0.12, 0.545, 0.02, 0.307, 0.5],
      ['200% FPL', 66_000, 0.1205, undefined, 0.604, 0.011, 0.339, 0.5],
      ['200% FPL', 66_000, 0.0769, undefined, 0.403, 0.025, 0.253, 0],
      ['138% FPL', 45_540, 0.143, 0.117, 0.649, 0.008, 0.399, 0.5],
      ['138% FPL', 45_540, 0.12, 0.104, 0.312, 0.02, 0.356, 0],
    ]);
    expect(MODELS.map((m) => m.employerTax)).toEqual([
      '9.6% of payroll above $500,000',
      ...Array(4).fill('9.6% above $500,000, 14% above $10 million'),
    ]);
  });

  /**
   * OUR arithmetic, not a published figure. No Board example reaches Model 5's
   * top rate, or the upper steps for a household of two, so these pin the
   * schedule there by hand: the 2022-dollar steps of $50,000, $100,000 and
   * $200,000 for one person (twice that for two or more), times 15,960 / 13,590.
   */
  it('Model 5 above the reach of the board examples, worked by hand', () => {
    const index = 15_960 / 13_590;
    const [a, b, c] = [50_000 * index, 100_000 * index, 200_000 * index];
    const one =
      (31_920 - 22_025) * 0.02 +
      (a - 31_920) * 0.0478 +
      (b - a) * 0.07 +
      (c - b) * 0.09 +
      (300_000 - c) * 0.12;
    expect(c).toBeCloseTo(234_878.59, 2);
    expect(one).toBeCloseTo(23_973.4, 2);
    expect(bill(MODELS[4], 300_000, 1, 'none').household).toBeCloseTo(one, 6);
    const two =
      (43_280 - 29_863) * 0.02 +
      (2 * a - 43_280) * 0.0478 +
      (2 * b - 2 * a) * 0.07 +
      (2 * c - 2 * b) * 0.09 +
      (600_000 - 2 * c) * 0.12;
    expect(two).toBeCloseTo(48_802.12, 2);
    expect(bill(MODELS[4], 600_000, 2, 'none').household).toBeCloseTo(two, 6);
    // Model 4's top rate for two: 14.3% above twice $100,000, indexed.
    const four =
      (43_280 - 29_863) * 0.03 + (2 * a - 43_280) * 0.09 + (2 * b - 2 * a) * 0.12 + (600_000 - 2 * b) * 0.143;
    expect(four).toBeCloseTo(73_381.92, 2);
    expect(bill(MODELS[3], 600_000, 2, 'none').household).toBeCloseTo(four, 6);
  });

  it('a loss never produces a bill, a credit or an employer tax', () => {
    for (const model of MODELS) {
      for (const kind of ['none', 'private', 'public'] as const) {
        expect(bill(model, -10_000, 1, kind, 8_500_000)).toEqual({
          model,
          household: 0,
          gross: 0,
          credit: 0,
          employer: 0,
        });
      }
    }
    // Negative wages earn no credit: the bill is the gross contribution.
    expect(contribution(MODELS[0], 50_000, -50_000, 1, 0.096)).toBeCloseTo((50_000 - 31_920) * 0.135, 6);
  });

  /**
   * The control on the control: a wrong number in a proposal has to show up as
   * a miss against the Board's published examples (report Tables S1 to S4).
   * Every bracket rate of every model is moved by a tenth of a point, in turn.
   *
   * One rate is beyond the examples' reach, and the test says so on purpose:
   * Model 5's top rate starts at about $234,900 for one person and $469,800
   * for two, and the Board's highest examples are $180,000 and $220,000.
   * Nothing published checks that rate or where it starts.
   */
  it('a bracket rate that is off by 0.1 point no longer reproduces the board examples', () => {
    const NOT_REACHED_BY_ANY_EXAMPLE = new Set(['5:4']);
    const setup: Record<string, { size: number; rate: (id: number) => number }> = {
      self: { size: 1, rate: () => 0 },
      private: { size: 2, rate: () => 0.09 },
      public: { size: 1, rate: (id) => (id === 1 ? 0.096 : 0.14) },
      medicare: { size: 2, rate: () => 0 },
    };
    const worstMiss = (proposal: Proposal, column: number) => {
      let worst = 0;
      for (const scenario of SCENARIOS) {
        const { size, rate } = setup[scenario.id];
        for (const row of scenario.rows) {
          if (scenario.id === 'self' && row.income === 90_000 && column === 4) continue; // misprint
          const ours = contribution(proposal, row.income, row.wages ?? 0, size, rate(column + 1));
          worst = Math.max(worst, Math.abs(ours - row.models[column]));
        }
      }
      return worst;
    };
    BOARD_PROPOSALS.forEach((proposal, column) => {
      expect(worstMiss(proposal, column)).toBeLessThanOrEqual(4);
      proposal.household.brackets.forEach((_, i) => {
        for (const slip of [0.001, -0.001]) {
          const wrong = parseProposal(altered(proposal, (d) => (d.household.brackets[i].rate += slip)));
          const miss = worstMiss(wrong, column);
          const label = `model ${proposal.id}, bracket ${i}, ${slip}`;
          if (NOT_REACHED_BY_ANY_EXAMPLE.has(`${proposal.id}:${i}`)) {
            expect(miss, label).toBeLessThanOrEqual(4);
          } else {
            expect(miss, label).toBeGreaterThan(4);
          }
        }
      });
    });
  });
});

describe('what a proposal file cannot say', () => {
  const problems = (change: (draft: any) => void) => validateProposal(altered(SYNTHETIC, change));

  it('a rule the engine does not have', () => {
    expect(problems((d) => (d.household.cap = 25_000))).toEqual([
      'household.cap: is not something a proposal can express',
    ]);
    expect(problems((d) => (d.payroll.tiers[0].exempt = 'nonprofits'))).toHaveLength(1);
    expect(problems((d) => (d.surtax = 0.01))).toHaveLength(1);
  });

  it('a rate written as a percentage', () => {
    expect(problems((d) => (d.household.brackets[0].rate = 10))[0]).toMatch(
      /^household\.brackets\[0\]\.rate: must be a number from 0 to 1/,
    );
    expect(problems((d) => (d.payroll.tiers[1].rate = 8))).toHaveLength(1);
    expect(problems((d) => (d.household.creditShare = 50))).toHaveLength(1);
  });

  it('brackets out of order, for any household size', () => {
    expect(problems((d) => (d.household.brackets[1].from.bySize[2] = 30_000))).toEqual([
      'household.brackets[1].from: starts at 30000 for a household of 2 (after any index), not above the bracket before it (30000)',
    ]);
    // In order as written, out of order once the index is applied.
    expect(problems((d) => (d.household.brackets[2].from.index.to = 40))).toHaveLength(3);
  });

  it('brackets that cover different household sizes', () => {
    expect(problems((d) => delete d.household.brackets[1].from.bySize[3])).toEqual([
      'household.brackets[1].from.bySize: covers household sizes 1, 2, but household.brackets[0] covers 1, 2, 3; they have to match',
    ]);
    expect(problems((d) => (d.household.brackets[0].from.bySize['1.5'] = 25_000))).not.toEqual([]);
  });

  it('payroll tiers out of order', () => {
    expect(problems((d) => (d.payroll.tiers[2].above = 5_000_000))).toEqual([
      'payroll.tiers[2].above: is 5000000, not above the tier before it (5000000)',
    ]);
  });

  it('missing parts, wrong types and unknown options', () => {
    expect(problems((d) => delete d.payroll)).toEqual(['proposal.payroll: is required']);
    expect(problems((d) => (d.household.brackets = []))).toHaveLength(1);
    expect(problems((d) => delete d.household.brackets[0].from.source)).toHaveLength(1);
    expect(problems((d) => (d.household.brackets[0].from.bySize[1] = '20000'))).toHaveLength(1);
    expect(problems((d) => (d.household.brackets[2].from.index.from = 0))).toHaveLength(1);
    expect(problems((d) => (d.payroll.publicEmployer = 'exempt'))).toHaveLength(1);
    expect(problems((d) => (d.id = 1.5))).toHaveLength(1);
    expect(problems((d) => (d.published = { combinedByFifth: [0.1, 0.1] })).length).toBeGreaterThan(1);
    expect(problems((d) => (d.id = ' '))).toHaveLength(1);
    expect(problems((d) => (d.name = ''))).toHaveLength(1);
    expect(problems((d) => (d.payroll.source = 7))).toHaveLength(1);
    expect(problems((d) => (d.payroll.tiers = { above: 0, rate: 0.1 }))).toHaveLength(1);
    expect(problems((d) => (d.payroll.tiers[0].above = -1))).toHaveLength(1);
    expect(problems((d) => (d.household.brackets[0].from.bySize[1] = -20_000))).toHaveLength(1);
    expect(problems((d) => (d.household.brackets[0].from.bySize = {}))).toHaveLength(1);
    expect(problems((d) => (d.household.brackets[2].from.index.to = -110))).toHaveLength(1);
    expect(
      problems((d) => (d.published = { ...BOARD_PROPOSALS[0].published, top1Share: 30.7 })),
    ).toEqual(['published.top1Share: must be a number from 0 to 1 (9.6% is written 0.096)']);
    expect(validateProposal(Object.create(SYNTHETIC))).toHaveLength(5);
    expect(validateProposal(null)).toEqual(['proposal: must be an object']);
    expect(validateProposal([SYNTHETIC])).toEqual(['proposal: must be an object']);
  });

  it('an index that pushes a threshold out of range', () => {
    expect(problems((d) => (d.household.brackets[2].from.index = { from: 5e-324, to: 1e308, basis: 'x' }))).toEqual([
      'household.brackets[2].from.index: does not give a usable factor (to / from)',
    ]);
    expect(problems((d) => (d.household.brackets[2].from.bySize[1] = 1.7e308))).toEqual([
      'household.brackets[2].from.bySize.1: is too large once the index is applied',
    ]);
  });

  it('a list with a gap in it', () => {
    const gap = (list: unknown[]) => [list[0], , list[1]];
    expect(problems((d) => (d.household.brackets = gap(d.household.brackets)))).toContain(
      'household.brackets[1]: must be an object',
    );
    expect(problems((d) => (d.published = { ...BOARD_PROPOSALS[0].published, combinedByFifth: new Array(5) }))).toHaveLength(5);
  });

  it('parseProposal returns a frozen copy, so a later edit cannot move a result', () => {
    const input = altered(SYNTHETIC, () => {}) as any;
    const parsed = parseProposal(input);
    input.household.brackets[0].rate = 0.9;
    expect(parsed.household.brackets[0].rate).toBe(0.1);
    expect(() => ((parsed.payroll.tiers[0] as any).rate = 0.5)).toThrow(TypeError);
    expect(() => ((MODELS[1].payroll.tiers[1] as any).rate = 0.5)).toThrow(TypeError);
    expect(() => ((MODELS[0] as any).topRate = 0.5)).toThrow(TypeError);
    expect(() => ((MODELS[0].rates as any)[0] = 0.5)).toThrow(TypeError);
    expect(payrollTax(190_000_000, 5)).toBeCloseTo(26_112_000, 3);
  });

  it('parseProposal checks the same plain data it returns', () => {
    // An index that only exists on a prototype is not part of the file.
    const hidden = altered(SYNTHETIC, () => {}) as any;
    const inherited = Object.create({ index: { from: 1, to: 1000, basis: 'x' } });
    hidden.household.brackets[1].from = Object.assign(inherited, {
      bySize: { 1: 50, 2: 80, 3: 90 },
      source: 'made up',
    });
    expect(() => parseProposal(hidden)).toThrow(ProposalError);

    const loop = altered(SYNTHETIC, () => {}) as any;
    loop.household.self = loop;
    expect(() => parseProposal(loop)).toThrow(ProposalError);
    expect(() => parseProposal(undefined)).toThrow(ProposalError);
    expect(() => parseProposal(new Map(Object.entries(SYNTHETIC)))).toThrow(ProposalError);

    const nan = altered(SYNTHETIC, (d) => (d.payroll.tiers[1].rate = NaN));
    expect(() => parseProposal(nan)).toThrow(ProposalError);
  });

  it('parseProposal lists every problem at once', () => {
    const broken = altered(SYNTHETIC, (d) => {
      d.household.creditShare = 2;
      d.payroll.tiers[0].rate = -0.05;
    });
    expect(() => parseProposal(broken)).toThrow(ProposalError);
    try {
      parseProposal(broken);
    } catch (e) {
      expect((e as ProposalError).problems).toHaveLength(2);
    }
  });
});
