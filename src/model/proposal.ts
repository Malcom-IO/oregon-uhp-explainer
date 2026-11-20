/**
 * What a proposal file can express.
 *
 * A proposal is one way of paying for the plan: an income-based household
 * contribution plus an employer payroll tax. The engine (uhp-model.ts) computes
 * from a proposal and holds no numbers of its own, so a revised model, a
 * contractor variant or a "what if" is a data file, as long as its rules fit
 * this schema. A rule the schema cannot express (a cap, a phase-out, a different
 * credit base) is an engine change and is reviewed as one. `validateProposal`
 * rejects unknown keys so that such a rule cannot be written down and silently
 * ignored.
 *
 * Plain data only: a proposal survives JSON.stringify and JSON.parse unchanged.
 */

/** The Board numbers its models 1 to 5. Other proposals can use any number or name. */
export type ProposalId = number | string;

/**
 * A factor that brings dollar amounts from one year to another: `to / from`.
 * Stated as the two published values it is the ratio of, so it can be checked.
 */
export interface IndexFactor {
  from: number;
  to: number;
  /** What the two values are and why this ratio is used. */
  basis: string;
}

/** An income threshold that depends on household size. */
export interface Threshold {
  /** Dollars, by number of people in the household. */
  bySize: Readonly<Record<number, number>>;
  /** If the amounts are in an earlier year's dollars, the factor that updates them. */
  index?: IndexFactor;
  /** Where the amounts come from: document, table or page. */
  source: string;
}

/** One marginal rate of the household contribution. */
export interface HouseholdBracket {
  /** Income at which this rate starts. The first bracket's start is the exemption. */
  from: Threshold;
  /** Marginal rate on income above `from`, up to the next bracket's start. */
  rate: number;
}

export interface HouseholdRule {
  /** The exemption in plain words, for display (for example "200% FPL"). */
  exemption: string;
  /** Marginal brackets, lowest first. Any number of them, at least one. */
  brackets: readonly HouseholdBracket[];
  /**
   * Share of the employer's payroll tax on the household's wages that is
   * credited against its contribution. 0 for no credit.
   */
  creditShare: number;
  source: string;
}

/** One marginal tier of the employer payroll tax. */
export interface PayrollTier {
  /** Yearly payroll above which this rate applies, up to the next tier. */
  above: number;
  rate: number;
}

/**
 * How a public employer's payroll is taxed.
 * - `top-rate-from-first-dollar`: the highest tier rate on all payroll, no exemption.
 * - `same-as-private`: the tiers apply as they do to a private employer.
 */
export type PublicEmployerRule = 'top-rate-from-first-dollar' | 'same-as-private';

export const PUBLIC_EMPLOYER_RULES: readonly PublicEmployerRule[] = Object.freeze([
  'top-rate-from-first-dollar',
  'same-as-private',
] as const);

export interface PayrollRule {
  /** The tiers in plain words, for display. */
  summary: string;
  /**
   * Marginal tiers, lowest first. Payroll below the first tier's `above` is
   * untaxed. An empty list means no payroll tax.
   */
  tiers: readonly PayrollTier[];
  publicEmployer: PublicEmployerRule;
  source: string;
}

/** Figures a proposal's author published about it. Displayed, never computed from. */
export interface PublishedFigures {
  /** A "maximum" household rate published elsewhere, where it differs from the top bracket. */
  reportRate?: number;
  /** Share of tax returns that would owe no household contribution. */
  returnsOwingNothing: number;
  /** Average net household contribution rate for the middle fifth of incomes. */
  middleFifthRate: number;
  /** Share of all household contributions paid by the top 1% of incomes. */
  top1Share: number;
  /**
   * Average combined rate (household contribution plus the employer payroll
   * tax attributed to wages) for each fifth of incomes, lowest first.
   */
  combinedByFifth: readonly [number, number, number, number, number];
  source: string;
}

export interface Proposal {
  id: ProposalId;
  /** A short label. */
  name: string;
  /** One or two plain sentences on what sets this proposal apart. */
  blurb: string;
  household: HouseholdRule;
  payroll: PayrollRule;
  published?: PublishedFigures;
}

/** The income at which a threshold sits for a household of `size`, in current dollars. */
export function thresholdFor(threshold: Threshold, size: number): number {
  const amount = Object.hasOwn(threshold.bySize, size) ? threshold.bySize[size] : undefined;
  if (amount === undefined) {
    throw new RangeError(`No threshold for a household of ${size} (${threshold.source}).`);
  }
  return threshold.index ? amount * (threshold.index.to / threshold.index.from) : amount;
}

// ------------------------------------------------------------------ validation

export class ProposalError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Not a valid proposal:\n- ${problems.join('\n- ')}`);
    this.name = 'ProposalError';
  }
}

type Rec = Record<string, unknown>;

function isRecord(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Everything wrong with `input` as a proposal, in plain words; empty if it is
 * valid. Takes `unknown` so it can check a parsed JSON file.
 */
export function validateProposal(input: unknown): string[] {
  const problems: string[] = [];
  const bad = (path: string, what: string) => problems.push(`${path}: ${what}`);

  /** Checks the key set of an object; returns it, or undefined if it is not an object. */
  const object = (
    value: unknown,
    path: string,
    required: readonly string[],
    optional: readonly string[] = [],
  ): Rec | undefined => {
    if (!isRecord(value)) {
      bad(path, 'must be an object');
      return undefined;
    }
    for (const key of required) {
      if (!Object.hasOwn(value, key) || value[key] === undefined) bad(`${path}.${key}`, 'is required');
    }
    for (const key of Object.keys(value)) {
      if (!required.includes(key) && !optional.includes(key)) {
        bad(`${path}.${key}`, 'is not something a proposal can express');
      }
    }
    return value;
  };
  const text = (value: unknown, path: string) => {
    if (value === undefined) return;
    if (typeof value !== 'string' || value.trim() === '') bad(path, 'must be a non-empty string');
  };
  const isNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);
  /** A rate or share: a number from 0 to 1. */
  const share = (value: unknown, path: string) => {
    if (value === undefined) return;
    if (!isNumber(value) || value < 0 || value > 1) {
      bad(path, 'must be a number from 0 to 1 (9.6% is written 0.096)');
    }
  };
  const dollars = (value: unknown, path: string) => {
    if (!isNumber(value) || value < 0) bad(path, 'must be a dollar amount of 0 or more');
  };

  const root = object(input, 'proposal', ['id', 'name', 'blurb', 'household', 'payroll'], ['published']);
  if (!root) return problems;

  const id = root['id'];
  const idOk =
    (typeof id === 'string' && id.trim() !== '') || (typeof id === 'number' && Number.isInteger(id));
  if (id !== undefined && !idOk) bad('proposal.id', 'must be a whole number or a non-empty string');
  text(root['name'], 'proposal.name');
  text(root['blurb'], 'proposal.blurb');

  // Household contribution.
  if (root['household'] !== undefined) {
    const h = object(root['household'], 'household', ['exemption', 'brackets', 'creditShare', 'source']);
    if (h) {
      text(h['exemption'], 'household.exemption');
      text(h['source'], 'household.source');
      share(h['creditShare'], 'household.creditShare');
      if (h['brackets'] !== undefined) validateBrackets(h['brackets']);
    }
  }

  function validateBrackets(value: unknown): void {
    if (!Array.isArray(value) || value.length === 0) {
      bad('household.brackets', 'must be a list of at least one bracket');
      return;
    }
    /** Household sizes each bracket covers, and each bracket's start by size. */
    const sizeSets: string[] = [];
    const starts: (Map<string, number> | undefined)[] = [];
    Array.from(value).forEach((entry: unknown, i) => {
      const path = `household.brackets[${i}]`;
      starts.push(undefined);
      const bracket = object(entry, path, ['from', 'rate']);
      if (!bracket) return;
      share(bracket['rate'], `${path}.rate`);
      if (bracket['from'] === undefined) return;
      const from = object(bracket['from'], `${path}.from`, ['bySize', 'source'], ['index']);
      if (!from) return;
      text(from['source'], `${path}.from.source`);

      let factor = 1;
      let complete = true;
      if (from['index'] !== undefined) {
        const index = object(from['index'], `${path}.from.index`, ['from', 'to', 'basis']);
        text(index?.['basis'], `${path}.from.index.basis`);
        for (const key of ['from', 'to'] as const) {
          const v = index?.[key];
          if (v !== undefined && (!isNumber(v) || v <= 0)) {
            bad(`${path}.from.index.${key}`, 'must be a number above 0');
          }
        }
        const a = index?.['from'];
        const b = index?.['to'];
        if (isNumber(a) && isNumber(b) && a > 0 && b > 0) factor = b / a;
        else complete = false;
        if (complete && !(Number.isFinite(factor) && factor > 0)) {
          bad(`${path}.from.index`, 'does not give a usable factor (to / from)');
          complete = false;
          factor = 1;
        }
      }

      const bySize = from['bySize'];
      if (bySize === undefined) return;
      if (!isRecord(bySize) || Object.keys(bySize).length === 0) {
        bad(`${path}.from.bySize`, 'must give a dollar amount for at least one household size');
        return;
      }
      const sizes: string[] = [];
      const resolved = new Map<string, number>();
      for (const [size, amount] of Object.entries(bySize)) {
        if (!/^[1-9]\d*$/.test(size)) {
          bad(`${path}.from.bySize.${size}`, 'household size must be a whole number of 1 or more');
          continue;
        }
        sizes.push(size);
        dollars(amount, `${path}.from.bySize.${size}`);
        if (!isNumber(amount) || amount < 0) continue;
        if (Number.isFinite(amount * factor)) resolved.set(size, amount * factor);
        else bad(`${path}.from.bySize.${size}`, 'is too large once the index is applied');
      }
      sizeSets[i] = sizes.sort((a, b) => Number(a) - Number(b)).join(', ');
      // Sizes with a bad amount are left out of the ordering check below.
      if (complete) starts[i] = resolved;
    });

    // Every bracket has to cover the same household sizes as the first one that lists any.
    const firstIndex = sizeSets.findIndex((s) => s !== undefined && s !== '');
    sizeSets.forEach((sizes, i) => {
      if (sizes !== undefined && sizes !== '' && sizes !== sizeSets[firstIndex]) {
        bad(
          `household.brackets[${i}].from.bySize`,
          `covers household sizes ${sizes}, but household.brackets[${firstIndex}] covers ${sizeSets[firstIndex]}; they have to match`,
        );
      }
    });

    // Each bracket has to start above the one before it, for every household size.
    for (let i = 1; i < starts.length; i++) {
      const lower = starts[i - 1];
      const upper = starts[i];
      if (!lower || !upper) continue;
      for (const [size, start] of upper) {
        const below = lower.get(size);
        if (below !== undefined && start <= below) {
          bad(
            `household.brackets[${i}].from`,
            `starts at ${start} for a household of ${size} (after any index), not above the bracket before it (${below})`,
          );
        }
      }
    }
  }

  // Employer payroll tax.
  if (root['payroll'] !== undefined) {
    const p = object(root['payroll'], 'payroll', ['summary', 'tiers', 'publicEmployer', 'source']);
    if (p) {
      text(p['summary'], 'payroll.summary');
      text(p['source'], 'payroll.source');
      const rule = p['publicEmployer'];
      if (rule !== undefined && !PUBLIC_EMPLOYER_RULES.includes(rule as PublicEmployerRule)) {
        bad('payroll.publicEmployer', `must be one of: ${PUBLIC_EMPLOYER_RULES.join(', ')}`);
      }
      const tiers = p['tiers'];
      if (tiers !== undefined && !Array.isArray(tiers)) {
        bad('payroll.tiers', 'must be a list (empty for no payroll tax)');
      } else if (Array.isArray(tiers)) {
        let last: number | undefined;
        Array.from(tiers).forEach((entry: unknown, i) => {
          const path = `payroll.tiers[${i}]`;
          const tier = object(entry, path, ['above', 'rate']);
          if (!tier) return;
          share(tier['rate'], `${path}.rate`);
          const above = tier['above'];
          if (above === undefined) return;
          dollars(above, `${path}.above`);
          if (!isNumber(above)) return;
          if (last !== undefined && above <= last) {
            bad(`${path}.above`, `is ${above}, not above the tier before it (${last})`);
          }
          last = above;
        });
      }
    }
  }

  // Published figures.
  if (root['published'] !== undefined) {
    const f = object(
      root['published'],
      'published',
      ['returnsOwingNothing', 'middleFifthRate', 'top1Share', 'combinedByFifth', 'source'],
      ['reportRate'],
    );
    if (f) {
      text(f['source'], 'published.source');
      for (const key of ['reportRate', 'returnsOwingNothing', 'middleFifthRate', 'top1Share']) {
        share(f[key], `published.${key}`);
      }
      const fifths = f['combinedByFifth'];
      if (fifths !== undefined) {
        if (!Array.isArray(fifths) || fifths.length !== 5) {
          bad('published.combinedByFifth', 'must list five rates, lowest fifth first');
        } else {
          Array.from(fifths).forEach((v: unknown, i) => {
            if (v === undefined) bad(`published.combinedByFifth[${i}]`, 'is required');
            share(v, `published.combinedByFifth[${i}]`);
          });
        }
      }
    }
  }

  return problems;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

/**
 * `input` as a proposal, or a ProposalError listing everything wrong with it.
 *
 * The result is a frozen copy holding only what `input` would be as JSON, and
 * it is that copy which is checked. So what was validated is exactly what the
 * engine computes from, and nothing done to `input` or to the result afterward
 * can change it.
 */
export function parseProposal<P extends Proposal = Proposal>(input: unknown): P {
  let copy: unknown;
  try {
    copy = JSON.parse(JSON.stringify(input) ?? 'null');
  } catch {
    throw new ProposalError(['proposal: must be plain data that can be written as JSON']);
  }
  const problems = validateProposal(copy);
  if (problems.length > 0) throw new ProposalError(problems);
  return deepFreeze(copy) as P;
}
