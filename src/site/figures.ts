/**
 * The numbers in the page's prose that are computed from the model, not typed
 * by hand. index.html carries each one as literal text in a keyed span:
 *
 *   <span data-fig="statewide.rateResetBest">10%</span>
 *
 * site.spec.ts checks every such span against this map, so the prose cannot
 * drift from the engine. A number quoted from a Board document stays plain
 * text in index.html and has no key.
 */
import { HIGH_PLAN, RATE_RESET } from '../model/uhp-statewide';
import { pct } from './format';

export const figures: Readonly<Record<string, string>> = Object.freeze({
  /** Milliman's high estimate of the plan, in billions of dollars. */
  'statewide.highPlan': String(HIGH_PLAN),
  /** How far below otherwise-expected rates providers would be paid, best estimate. */
  'statewide.rateResetBest': pct(RATE_RESET.best, 0),
});
