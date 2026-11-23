/**
 * The published types (oregon-uhp.d.ts) must describe the real module. These
 * checks run in `npm run typecheck`: a field added, removed or retyped on one
 * side and not the other is a type error here.
 */
import type * as Published from './oregon-uhp';
import type * as Actual from './index';
import type { EmployerKind as EngineEmployerKind } from '../model/uhp-model';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const same = <T extends true>(value: T) => value;

same<Equal<Published.WidgetOptions, Actual.WidgetOptions>>(true);
same<Equal<Published.WidgetTheme, Actual.WidgetTheme>>(true);
same<Equal<Published.CoverageKind, Actual.CoverageKind>>(true);
same<Equal<Published.EmployerKind, EngineEmployerKind>>(true);
same<Equal<typeof Published.mount, typeof Actual.mount>>(true);

it('keeps the published types in step with the module', () => {
  // The checks above are compile-time; this keeps the file in the test run.
  expect(true).toBe(true);
});
