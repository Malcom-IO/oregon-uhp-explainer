/**
 * Types for dist/lib/oregon-uhp.js, the Oregon Universal Health Plan
 * calculator (unofficial). Copied beside the library by the library build.
 * src/widget/types.spec.ts fails the typecheck if this file and the code
 * disagree. MIT license; see LICENSE.txt.
 */

export type WidgetTheme = 'auto' | 'light' | 'dark';

/** How the household is covered today. */
export type CoverageKind = 'employer' | 'own' | 'medicare' | 'ohp' | 'none';

/** Who pays the household's wages. */
export type EmployerKind = 'none' | 'private' | 'public';

export interface WidgetOptions {
  initialIncome?: number;
  initialHouseholdSize?: number;
  /** How the household is covered today. Sets the starting "what you pay now" from the Board's examples. */
  initialCoverage?: CoverageKind;
  /** Overrides the employer the coverage choice implies. */
  initialEmployer?: EmployerKind;
  initialPayroll?: number;
  /** Overrides the starting "what you pay now" the coverage choice implies. */
  initialCurrentCost?: number;
  /** `auto` follows the reader's system setting. A host with one fixed look should name it. */
  theme?: WidgetTheme;
  /** Heading level of the calculator's title, 1 to 3. Headings inside it follow from there. */
  headingLevel?: 1 | 2 | 3;
  /** Which calculator to show: both (the default), the household one or the employer one. */
  show?: 'all' | 'household' | 'employer';
  /** Set false to leave out the title, the source snapshot line and the "unofficial" note. */
  header?: boolean;
  /** Set false to leave out the section titles under a heading the page already has. */
  sectionTitles?: boolean;
  /** Starting values for the employer calculator. */
  initialBusinessKind?: 'private' | 'public';
  initialBusinessPayroll?: number;
  initialBusinessSpend?: number;
}

/** Mounts the calculator in `host`, replacing its contents, and returns a function that removes it. */
export function mount(host: HTMLElement, options?: WidgetOptions): () => void;
