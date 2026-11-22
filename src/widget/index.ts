import { incomeAt, positionOf, SLIDER_POSITIONS } from '../model/income-scale';
import { bill, EMPLOYERS, employerRate, MODELS, payrollTax, SCENARIOS, schedule } from '../model/uhp-model';
import type { Bill, EmployerKind } from '../model/uhp-model';
import { createChart, key, seriesClass } from './chart';
import { announcer, element, heading, parseAmount, status } from './dom';
import {
  copy, coverageCopy, dollars, employerLabel, fieldAmount, list, locale, modelName, modelsLabel, percent, share,
} from './strings';
import type { CoverageKind } from './strings';
import './widget.css';

export type WidgetTheme = 'auto' | 'light' | 'dark';
export type { CoverageKind } from './strings';

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
  /**
   * Set false to leave out the title, the source snapshot line and the
   * "unofficial" note, for a page that already states all three beside the
   * calculator. Headings then start at `headingLevel`.
   */
  header?: boolean;
}

/** Household sizes every model's schedule covers, taken from the proposal data. */
const SIZES: readonly number[] = Object.keys(MODELS[0].household.brackets[0].from.bySize)
  .map(Number)
  .filter(size => MODELS.every(model => model.household.brackets.every(bracket => size in bracket.from.bySize)))
  .sort((a, b) => a - b);

/** What a household pays today in one of the Board's worked examples (report Tables S1 to S4). */
function boardToday(id: string): number {
  const scenario = SCENARIOS.find(s => s.id === id);
  if (!scenario) throw new Error(`No Board example "${id}".`);
  return Math.max(...scenario.rows.map(row => row.now));
}

interface Coverage {
  kind: CoverageKind;
  /** The Board's example of what such a household pays today. */
  typical: number;
  /** Who pays the wages, where the choice implies it. */
  employer: EmployerKind;
}

/**
 * The starting "what you pay now" for each kind of coverage. A couple insured
 * through a private employer (Table S2), a 45-year-old buying a silver plan
 * (Table S1, before subsidies run out) and a couple on Medicare (Table S4).
 */
const COVERAGES: readonly Coverage[] = [
  { kind: 'employer', typical: boardToday('private'), employer: 'private' },
  { kind: 'own', typical: boardToday('self'), employer: 'none' },
  { kind: 'medicare', typical: boardToday('medicare'), employer: 'none' },
  { kind: 'ohp', typical: 0, employer: 'none' },
  { kind: 'none', typical: 0, employer: 'none' },
];

/** The Board's example employer: a private payroll of $8.5 million (report p. 43, Table S2). */
export const DEFAULT_PAYROLL = 8_500_000;
/** The example the employer calculator opens with, labeled as an example beside it. */
export const DEFAULT_BUSINESS_PAYROLL = 1_100_000;
export const DEFAULT_BUSINESS_SPEND = 110_000;

const mounted = new WeakMap<HTMLElement, () => void>();
let nextId = 0;

function labeled(doc: Document, label: string, control: HTMLElement, description?: HTMLElement) {
  const field = element(doc, 'div', undefined, 'uhp-field');
  const caption = element(doc, 'label', label);
  caption.htmlFor = control.id;
  field.append(caption, control);
  if (description) {
    description.id = `${control.id}-hint`;
    control.setAttribute('aria-describedby', description.id);
    field.append(description);
  }
  return field;
}

function select(
  doc: Document,
  id: string,
  options: readonly { value: string; label: string }[],
  selected: string,
) {
  const control = element(doc, 'select');
  control.id = id;
  for (const { label, value } of options) {
    const option = element(doc, 'option', label);
    option.value = value;
    control.add(option);
  }
  control.value = selected;
  return control;
}

interface MoneyFieldOptions {
  initial?: number;
  hint?: string;
  /** Shown under the field while it is required and empty. */
  requiredPrompt?: string;
  /** Zero is not an answer for this field. */
  positive?: boolean;
}

/**
 * A dollar amount typed as text, with a "$" before it, so "85,000" and
 * "$85,000" are accepted and neither the arrow keys nor the mouse wheel change
 * it. Results follow every keystroke; when the reader leaves the field, a
 * valid amount is written back with its commas.
 */
function moneyField(doc: Document, id: string, label: string, options: MoneyFieldOptions = {}) {
  const control = element(doc, 'input');
  control.id = id;
  control.type = 'text';
  control.inputMode = 'decimal';
  control.autocomplete = 'off';
  if (options.initial !== undefined) control.value = fieldAmount.format(options.initial);
  const box = element(doc, 'div', undefined, 'uhp-money');
  const sign = element(doc, 'span', '$');
  sign.setAttribute('aria-hidden', 'true');
  box.append(sign, control);

  const error = element(doc, 'p', undefined, 'uhp-field-error');
  error.hidden = true;
  error.id = `${id}-error`;
  const description = element(doc, 'p', options.hint ?? '', 'uhp-hint');
  description.hidden = !options.hint;
  const field = element(doc, 'div', undefined, 'uhp-field');
  const caption = element(doc, 'label', label);
  caption.htmlFor = id;
  description.id = `${id}-hint`;
  field.append(caption, box, description, error);
  let invalid = false;
  let message: string | undefined;

  function describe() {
    const describedBy = [description.hidden ? undefined : description.id, error.hidden ? undefined : error.id]
      .filter(Boolean).join(' ');
    if (describedBy) control.setAttribute('aria-describedby', describedBy);
    else control.removeAttribute('aria-describedby');
  }
  describe();

  control.addEventListener('change', () => {
    const value = parseAmount(control.value);
    if (value !== undefined && !Number.isNaN(value)) control.value = fieldAmount.format(value);
  });

  return {
    control,
    field,
    set hint(text: string) {
      description.textContent = text;
      description.hidden = text === '';
      describe();
    },
    set value(amount: number) {
      control.value = fieldAmount.format(amount);
    },
    /** The prompt or error shown under the field after the last read, named for its field, if any. */
    get message() {
      return message === undefined ? undefined : copy.fieldMessage(label, message);
    },
    /** True when the last read found text that is not an acceptable amount. */
    get invalid() {
      return invalid;
    },
    /** The amount, or undefined while the field is disabled, empty or invalid. */
    read(): number | undefined {
      const value = control.disabled ? undefined : parseAmount(control.value);
      const zero = options.positive === true && value === 0;
      invalid = Number.isNaN(value) || zero;
      message = undefined;
      if (zero) message = copy.positivePrompt;
      else if (invalid) message = copy.amountPrompt;
      else if (value === undefined && control.required && !control.disabled) message = options.requiredPrompt;

      if (invalid) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
      error.textContent = message ?? '';
      error.hidden = message === undefined;
      describe();
      return invalid ? undefined : value;
    },
  };
}

function setText(node: HTMLElement, text: string) {
  if (node.textContent !== text) node.textContent = text;
}

function usesPayroll(kind: EmployerKind): boolean {
  return kind === 'private' ||
    (kind === 'public' && MODELS.some(model => model.payroll.publicEmployer === 'same-as-private'));
}

/** Models that share a value, in model order, keyed by how the value prints. */
function grouped(values: readonly string[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  MODELS.forEach((model, i) => groups.set(values[i], [...(groups.get(values[i]) ?? []), String(model.id)]));
  return [...groups];
}

/** The employer's payroll tax as a share of wages, model by model, in words. */
function ratesInWords(kind: EmployerKind, payroll: number | undefined): string {
  const groups = grouped(MODELS.map(model => share(employerRate(kind, model, payroll))));
  if (groups.length === 1) return copy.rateInEveryModel(groups[0][0]);
  return list.format(groups.map(([rate, ids]) => copy.rateUnder(rate, modelsLabel(ids))));
}

/** What the chosen employer and payroll mean for the payroll tax and the worker credit. */
function employerNote(kind: EmployerKind, payroll: number | undefined): string {
  if (kind === 'none') return copy.noEmployerNote;
  if (MODELS.every(model => employerRate(kind, model, payroll) === 0)) return copy.noPayrollTax;
  const rates = ratesInWords(kind, payroll);
  const topRateForAll = kind === 'public' &&
    MODELS.every(model => model.payroll.publicEmployer === 'top-rate-from-first-dollar');
  return topRateForAll ? copy.publicTopRates(rates) : copy.privateRates(rates);
}

/** Where the household contribution starts for this household size, model by model. */
function exemptionHint(size: number): string {
  const groups = grouped(MODELS.map(model => dollars.format(schedule(model, size)[0].from)));
  if (groups.length === 1) return copy.exemptHint(copy.exemptFrom(groups[0][0], copy.everyModel));
  return copy.exemptHint(list.format(groups.map(([amount, ids]) => copy.exemptFrom(amount, modelsLabel(ids)))));
}

type Tone = 'less' | 'more' | 'same';

/** Below this a bill prints as $0, so it is described as nothing owed. */
const ZERO = 0.5;

/** The line under each bill. An uninsured household is not told it "pays more": it has no coverage today. */
function verdict(result: Bill, currentCost: number | undefined, coverage: CoverageKind): { text: string; tone: Tone } | undefined {
  if (coverage === 'none') {
    return { text: result.household < ZERO ? copy.oweNothingCovered : copy.payAndBeCovered, tone: 'same' };
  }
  if (currentCost === undefined) return undefined;
  if (result.household < ZERO && currentCost < ZERO) return { text: copy.oweNothing, tone: 'same' };
  const delta = Math.round(result.household) - Math.round(currentCost);
  if (delta === 0) return { text: copy.sameAsNow, tone: 'same' };
  return delta < 0
    ? { text: copy.lessThanNow(dollars.format(-delta)), tone: 'less' }
    : { text: copy.moreThanNow(dollars.format(delta)), tone: 'more' };
}

const ARROWS: Record<Tone, string> = { less: '↓', more: '↑', same: '' };

function verdictLine(doc: Document, text: string, tone: Tone) {
  const line = element(doc, 'p', undefined, 'uhp-verdict');
  line.dataset['tone'] = tone;
  if (ARROWS[tone]) {
    const arrow = element(doc, 'span', ARROWS[tone], 'uhp-arrow');
    arrow.setAttribute('aria-hidden', 'true');
    line.append(arrow);
  }
  line.append(text);
  return line;
}

function billCard(doc: Document, level: number, result: Bill, index: number, currentCost: number | undefined, coverage: CoverageKind) {
  const card = element(doc, 'article', undefined, `uhp-bill ${seriesClass(index)}`);
  const title = heading(doc, level, '', 'uhp-bill-title');
  const { model } = result;
  const rate = element(doc, 'span', ` · ${copy.topRate(percent.format(model.topRate), model.rates.length > 1)}`, 'uhp-bill-rate');
  title.append(key(doc, seriesClass(index)), copy.model(model.id), rate);
  const name = element(doc, 'p', modelName(model.id, model.name), 'uhp-bill-name');
  const total = element(doc, 'p', dollars.format(result.household), 'uhp-bill-amount');
  total.append(element(doc, 'span', ` ${copy.perYear}`));
  card.append(title, name, total);
  const line = verdict(result, currentCost, coverage);
  if (line) card.append(verdictLine(doc, line.text, line.tone));
  if (result.household < ZERO) {
    card.append(element(doc, 'p', result.gross < ZERO ? copy.zeroExempt : copy.zeroCredit, 'uhp-hint uhp-bill-detail'));
  } else if (result.credit >= 0.5) {
    card.append(element(doc, 'p', copy.creditUsed(dollars.format(result.credit), dollars.format(result.gross)),
      'uhp-hint uhp-bill-detail'));
  }
  if (result.employer >= 0.5) {
    card.append(element(doc, 'p', copy.employerOnWages(dollars.format(result.employer)), 'uhp-hint uhp-bill-detail'));
  }
  return card;
}

/** Mount the calculator in a host and return a function that removes it. */
export function mount(host: HTMLElement, options: WidgetOptions = {}): () => void {
  mounted.get(host)?.();
  const doc = host.ownerDocument;
  // Another bundled copy of this module on the page keeps its own counter, so check the document too.
  let prefix: string;
  do prefix = `oregon-uhp-${++nextId}`; while (doc.querySelector(`[id^="${prefix}-"]`));
  const id = (name: string) => `${prefix}-${name}`;
  const level = [1, 2, 3].includes(options.headingLevel as number) ? options.headingLevel as number : 2;

  const root = element(doc, 'div', undefined, 'oregon-uhp uhp-root');
  root.lang = locale;
  if (options.theme === 'light' || options.theme === 'dark') root.dataset['uhpTheme'] = options.theme;
  const header = element(doc, 'div', undefined, 'uhp-header');
  header.append(
    element(doc, 'p', copy.snapshot, 'uhp-snapshot'),
    heading(doc, level, copy.title, 'uhp-title'),
    element(doc, 'p', copy.intro(MODELS.length), 'uhp-intro'),
  );

  const withHeader = options.header !== false;
  const sectionLevel = withHeader ? level + 1 : level;
  // A starting value is used only if the field would accept it as typed.
  const amountOption = (value: unknown, positive = false) =>
    typeof value === 'number' && !Number.isNaN(parseAmount(String(value))) && !(positive && value === 0)
      ? value
      : undefined;

  // ------------------------------------------------------------ household
  const household = element(doc, 'section', undefined, 'uhp-section');
  household.append(heading(doc, sectionLevel, copy.household, 'uhp-section-title'));
  const layout = element(doc, 'div', undefined, 'uhp-calc');
  const inputs = element(doc, 'div', undefined, 'uhp-inputs');

  let coverage = COVERAGES.find(c => c.kind === options.initialCoverage) ?? COVERAGES[0];
  const coverageSelect = select(doc, id('coverage'),
    COVERAGES.map(c => ({ value: c.kind, label: coverageCopy[c.kind].label })), coverage.kind);

  let householdSize = SIZES.includes(options.initialHouseholdSize as number)
    ? options.initialHouseholdSize as number
    : SIZES[Math.min(1, SIZES.length - 1)];
  const sizeField = element(doc, 'fieldset', undefined, 'uhp-field');
  const sizeLegend = element(doc, 'legend', copy.size);
  const sizeButtons = element(doc, 'div', undefined, 'uhp-seg');
  const sizeHint = element(doc, 'p', undefined, 'uhp-hint');
  sizeHint.id = id('size-hint');
  sizeField.setAttribute('aria-describedby', sizeHint.id);
  const buttons = SIZES.map(value => {
    const button = element(doc, 'button', String(value));
    button.type = 'button';
    button.dataset['size'] = String(value);
    button.addEventListener('click', () => {
      householdSize = value;
      updateHousehold();
    });
    return button;
  });
  sizeButtons.append(...buttons);
  sizeField.append(sizeLegend, sizeButtons, sizeHint);

  const income = moneyField(doc, id('income'), copy.income, {
    initial: amountOption(options.initialIncome) ?? 85_000,
    requiredPrompt: copy.enterIncome,
  });
  income.control.required = true;
  const slider = element(doc, 'input');
  slider.id = id('income-slider');
  slider.type = 'range';
  slider.min = '0';
  slider.max = String(SLIDER_POSITIONS);
  slider.className = 'uhp-slider';
  slider.setAttribute('aria-label', copy.slider);
  const incomeHint = element(doc, 'p', copy.incomeHint, 'uhp-hint');
  incomeHint.id = id('income-guide');
  income.control.setAttribute('aria-describedby', incomeHint.id);
  // Slider and guidance sit under the income box, inside the same field.
  income.field.querySelector('.uhp-money')!.after(slider, incomeHint);

  const employers = EMPLOYERS.map(({ kind, label }) => ({ value: kind, label: employerLabel(kind, label) }));
  const initialEmployer = EMPLOYERS.some(({ kind }) => kind === options.initialEmployer)
    ? options.initialEmployer as EmployerKind
    : coverage.employer;
  const employer = select(doc, id('employer'), employers, initialEmployer);
  const payroll = moneyField(doc, id('payroll'), copy.payroll, {
    initial: amountOption(options.initialPayroll, true) ?? DEFAULT_PAYROLL,
    hint: copy.payrollHint,
    requiredPrompt: copy.enterPayroll,
    positive: true,
  });
  payroll.field.classList.add('uhp-subfield');
  const rateNote = element(doc, 'p', undefined, 'uhp-hint uhp-employer-note');
  rateNote.id = id('employer-note');
  const wagesNote = element(doc, 'p', copy.allWages, 'uhp-hint');
  wagesNote.id = id('wages-note');
  const employerField = labeled(doc, copy.wageSource, employer);
  employerField.append(payroll.field, rateNote, wagesNote);

  const currentCost = moneyField(doc, id('current-cost'), copy.currentCost, {
    initial: amountOption(options.initialCurrentCost) ?? coverage.typical,
    hint: coverageCopy[coverage.kind].hint(dollars.format(coverage.typical)),
  });
  inputs.append(labeled(doc, copy.coverage, coverageSelect), sizeField, income.field, employerField, currentCost.field);

  const results = element(doc, 'div', undefined, 'uhp-results');
  results.id = id('results');
  const callout = element(doc, 'div', undefined, 'uhp-callout');
  const coverageNote = element(doc, 'p');
  const assumptions = element(doc, 'p');
  assumptions.append(element(doc, 'strong', copy.employerAssumptionsLead), ` ${copy.employerAssumptions}`);
  const householdStatus = element(doc, 'p', undefined, 'uhp-result-status');
  callout.append(coverageNote, assumptions, householdStatus);
  const householdLive = status(doc);
  const householdAnnouncer = announcer(householdLive);
  const resultsHeading = heading(doc, sectionLevel + 1, copy.results, 'uhp-results-title uhp-visually-hidden');
  const cards = element(doc, 'div', undefined, 'uhp-bills');
  const chart = createChart(doc);
  results.append(callout, resultsHeading, cards, chart.figure, householdLive);

  // A bar that follows the thumb down the form on narrow screens, so the answer stays in view.
  // It repeats the range shown above the results, so it is hidden from assistive technology.
  const sticky = element(doc, 'a', undefined, 'uhp-sticky');
  sticky.href = `#${results.id}`;
  sticky.tabIndex = -1;
  sticky.setAttribute('aria-hidden', 'true');
  const stickyRange = element(doc, 'strong');
  const stickyText = element(doc, 'span');
  stickyText.append(`${copy.sticky} `, stickyRange, ` ${copy.stickyYear}`);
  sticky.append(stickyText, element(doc, 'span', `${copy.stickyGo} ↓`, 'uhp-sticky-go'));

  layout.append(inputs, sticky, results);
  household.append(layout);

  let announcedNote: string | undefined;
  let announcedCoverage: string | undefined;

  function updateHousehold(quiet = false) {
    for (const button of buttons) {
      const pressed = Number(button.dataset['size']) === householdSize;
      button.setAttribute('aria-pressed', String(pressed));
      button.classList.toggle('uhp-active', pressed);
    }
    setText(sizeHint, exemptionHint(householdSize));

    const amount = income.read();
    if (amount !== undefined) slider.value = String(positionOf(amount));
    // The slider only reaches round amounts; announce the income the results use.
    slider.setAttribute('aria-valuetext', dollars.format(amount ?? incomeAt(slider.valueAsNumber)));
    // The field's own error, when there is one, is read before the guidance.
    const incomeError = income.control.getAttribute('aria-describedby');
    income.control.setAttribute('aria-describedby', [incomeError, incomeHint.id].filter(Boolean).join(' '));

    const kind = employer.value as EmployerKind;
    wagesNote.hidden = kind === 'none';
    const needsPayroll = usesPayroll(kind);
    payroll.field.hidden = !needsPayroll;
    payroll.control.disabled = !needsPayroll;
    payroll.control.required = needsPayroll;
    payroll.hint = kind === 'private' ? copy.payrollHint : '';
    const payrollAmount = payroll.read();
    const baseline = currentCost.read();
    const note = coverageCopy[coverage.kind].note;
    coverageNote.replaceChildren();
    if (note) coverageNote.append(element(doc, 'strong', `${coverageCopy[coverage.kind].label}:`), ` ${note}`);
    coverageNote.hidden = !note;
    assumptions.hidden = coverage.kind !== 'employer' || kind === 'none';

    const missing = amount === undefined || (needsPayroll && payrollAmount === undefined);
    rateNote.hidden = missing;
    employer.setAttribute('aria-describedby',
      [missing ? undefined : rateNote.id, wagesNote.hidden ? undefined : wagesNote.id].filter(Boolean).join(' '));
    if (!employer.getAttribute('aria-describedby')) employer.removeAttribute('aria-describedby');
    cards.hidden = missing;
    resultsHeading.hidden = missing;
    sticky.hidden = missing;
    if (missing) {
      cards.replaceChildren();
      chart.update(undefined);
      rateNote.textContent = '';
      const prompt = amount === undefined ? copy.enterIncome : copy.enterPayroll;
      setText(householdStatus, prompt);
      // Announce the field's own error when there is one, so a rejected entry is heard.
      const fieldMessage = amount === undefined ? income.message : payroll.message;
      householdAnnouncer.say(fieldMessage ?? prompt, quiet);
      announcedNote = undefined;
      announcedCoverage = undefined;
      return;
    }

    const bills = MODELS.map(model => bill(model, amount, householdSize, kind, payrollAmount));
    const totals = bills.map(result => result.household);
    const low = dollars.format(Math.min(...totals));
    const high = dollars.format(Math.max(...totals));
    householdStatus.replaceChildren(
      element(doc, 'strong', copy.rangeLead(MODELS.length)),
      ` ${low === high ? copy.singleAmount(low) : copy.range(low, high)}`,
    );
    setText(stickyRange, copy.stickyRange(low, high));
    const rates = employerNote(kind, payrollAmount);
    setText(rateNote, rates);
    const selectedEmployer = employer.selectedOptions[0].text;
    let comparison: string | undefined;
    if (baseline !== undefined) comparison = copy.comparisonSummary(dollars.format(baseline));
    else if (currentCost.invalid) comparison = copy.comparisonSkipped;
    // How the household is covered, and its note, are said when they change.
    const coverageSaid = [`${copy.coverage}: ${coverageCopy[coverage.kind].label}.`, note].filter(Boolean).join(' ');
    householdAnnouncer.say([
      coverageSaid === announcedCoverage ? undefined : coverageSaid,
      householdStatus.textContent,
      copy.householdContext(dollars.format(amount), householdSize, selectedEmployer,
        payrollAmount === undefined ? undefined : dollars.format(payrollAmount)),
      // The note changes only with the employer or payroll; say it again only when it does.
      rates === announcedNote ? undefined : rates,
      comparison,
    ].filter(Boolean).join(' '), quiet);
    announcedNote = rates;
    announcedCoverage = coverageSaid;
    cards.replaceChildren(...bills.map((result, i) =>
      billCard(doc, sectionLevel + 2, result, i, baseline, coverage.kind)));
    chart.update({ income: amount, size: householdSize, employer: kind, payroll: payrollAmount, currentCost: baseline, bills });
  }

  coverageSelect.addEventListener('change', () => {
    coverage = COVERAGES.find(c => c.kind === coverageSelect.value) ?? COVERAGES[0];
    // Choosing how you are covered fills in the Board's example cost and, where the choice implies it, the employer.
    currentCost.value = coverage.typical;
    currentCost.hint = coverageCopy[coverage.kind].hint(dollars.format(coverage.typical));
    employer.value = coverage.employer;
    updateHousehold();
  });
  slider.addEventListener('input', () => {
    income.control.value = fieldAmount.format(incomeAt(slider.valueAsNumber));
    updateHousehold();
  });
  for (const control of [income.control, payroll.control, currentCost.control]) {
    control.addEventListener('input', () => updateHousehold());
  }
  employer.addEventListener('change', () => updateHousehold());

  // ------------------------------------------------------------- business
  const business = element(doc, 'section', undefined, 'uhp-section uhp-business');
  business.append(heading(doc, sectionLevel, copy.business, 'uhp-section-title'));
  const businessLayout = element(doc, 'div', undefined, 'uhp-calc');
  const businessInputs = element(doc, 'div', undefined, 'uhp-inputs');
  const businessKind = select(doc, id('business-kind'), employers.filter(option => option.value !== 'none'), 'private');
  const businessPayroll = moneyField(doc, id('business-payroll'), copy.businessPayroll, {
    initial: DEFAULT_BUSINESS_PAYROLL,
    requiredPrompt: copy.enterBusinessPayroll,
    positive: true,
  });
  businessPayroll.control.required = true;
  const spend = moneyField(doc, id('spend'), copy.businessSpend, {
    initial: DEFAULT_BUSINESS_SPEND,
    hint: copy.businessSpendHint,
  });
  businessInputs.append(labeled(doc, copy.businessKind, businessKind), businessPayroll.field, spend.field);
  const businessResults = element(doc, 'div', undefined, 'uhp-results');
  const businessHeading = heading(doc, sectionLevel + 1, copy.businessResults, 'uhp-results-title uhp-visually-hidden');
  const businessCards = element(doc, 'div', undefined, 'uhp-bills uhp-bills-few');
  const businessNote = element(doc, 'p', copy.businessAssumption, 'uhp-hint');
  const businessStatus = element(doc, 'p', undefined, 'uhp-result-status');
  const businessLive = status(doc);
  const businessAnnouncer = announcer(businessLive);
  businessResults.append(businessHeading, businessStatus, businessCards, businessNote, businessLive);
  businessLayout.append(businessInputs, businessResults);
  business.append(businessLayout);

  function updateBusiness(quiet = false) {
    const yearlyPayroll = businessPayroll.read();
    const baseline = spend.read();
    const missing = yearlyPayroll === undefined;
    businessCards.hidden = missing;
    businessNote.hidden = missing;
    businessStatus.hidden = !missing;
    if (missing) {
      businessCards.replaceChildren();
      setText(businessStatus, copy.enterBusinessPayroll);
      businessAnnouncer.say(businessPayroll.message ?? copy.enterBusinessPayroll, quiet);
      return;
    }

    const taxes = MODELS.map(model => businessKind.value === 'public'
      ? employerRate('public', model, yearlyPayroll) * yearlyPayroll
      : payrollTax(yearlyPayroll, model));
    // Models that would charge this employer the same tax share one card.
    const groups = grouped(taxes.map(tax => dollars.format(tax)));
    businessCards.replaceChildren(...groups.map(([amount, ids]) => {
      const tax = taxes[MODELS.findIndex(model => String(model.id) === ids[0])];
      const card = element(doc, 'article', undefined, 'uhp-bill');
      card.append(heading(doc, sectionLevel + 2, modelsLabel(ids), 'uhp-bill-title'));
      const total = element(doc, 'p', amount, 'uhp-bill-amount');
      total.append(element(doc, 'span', ` ${copy.perYear}`));
      card.append(total);
      if (baseline !== undefined) {
        const delta = Math.round(tax) - Math.round(baseline);
        card.append(delta === 0
          ? verdictLine(doc, copy.sameAsSpend, 'same')
          : delta < 0
            ? verdictLine(doc, copy.lessThanSpend(dollars.format(-delta)), 'less')
            : verdictLine(doc, copy.moreThanSpend(dollars.format(delta)), 'more'));
      }
      card.append(element(doc, 'p', copy.businessShare(share(tax / yearlyPayroll)), 'uhp-hint uhp-bill-detail'));
      return card;
    }));
    const amounts = groups.map(([amount, ids]) => copy.modelAmount(modelsLabel(ids), amount)).join(' ');
    let comparison: string | undefined;
    if (baseline !== undefined) comparison = copy.comparisonSummary(dollars.format(baseline));
    else if (spend.invalid) comparison = copy.comparisonSkipped;
    businessAnnouncer.say([copy.businessSummary(amounts), comparison].filter(Boolean).join(' '), quiet);
  }

  businessKind.addEventListener('change', () => updateBusiness());
  for (const control of [businessPayroll.control, spend.control]) {
    control.addEventListener('input', () => updateBusiness());
  }

  const show = options.show === 'household' || options.show === 'employer' ? options.show : 'all';
  if (withHeader) root.append(header);
  if (show !== 'employer') root.append(household);
  if (show !== 'household') root.append(business);
  root.append(element(doc, 'p', copy.privacy, 'uhp-privacy'));
  // Keep widget controls independent of any form that contains the host.
  root.querySelectorAll('input, select, button').forEach(control => control.setAttribute('form', id('unowned-form')));
  host.replaceChildren(root);
  // The first state is on the page when it loads; only later changes are announced.
  updateHousehold(true);
  updateBusiness(true);

  const destroy = () => {
    chart.destroy();
    householdAnnouncer.stop();
    businessAnnouncer.stop();
    root.remove();
    if (mounted.get(host) === destroy) mounted.delete(host);
  };
  mounted.set(host, destroy);
  return destroy;
}
