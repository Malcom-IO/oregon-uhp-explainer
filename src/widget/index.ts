import { incomeAt, positionOf, SLIDER_POSITIONS } from '../model/income-scale';
import { bill, EMPLOYERS, employerRate, MODELS, payrollTax } from '../model/uhp-model';
import type { Bill, EmployerKind } from '../model/uhp-model';
import { createChart, seriesClass } from './chart';
import { announcer, element, heading, parseAmount, scrollRegion, status, table } from './dom';
import { copy, dollars, employerLabel, list, locale, modelName, share } from './strings';
import './widget.css';

export type WidgetTheme = 'auto' | 'light' | 'dark';

export interface WidgetOptions {
  initialIncome?: number;
  initialHouseholdSize?: number;
  initialEmployer?: EmployerKind;
  initialPayroll?: number;
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
 * A dollar amount typed as text, so "85,000" and "$85,000" are accepted and
 * neither the arrow keys nor the mouse wheel change it.
 */
function moneyField(doc: Document, id: string, label: string, options: MoneyFieldOptions = {}) {
  const control = element(doc, 'input');
  control.id = id;
  control.type = 'text';
  control.inputMode = 'decimal';
  control.autocomplete = 'off';
  if (options.initial !== undefined) control.value = String(options.initial);

  const error = element(doc, 'p', undefined, 'uhp-field-error');
  error.hidden = true;
  error.id = `${id}-error`;
  const description = options.hint ? element(doc, 'p', options.hint, 'uhp-hint') : undefined;
  const field = labeled(doc, label, control, description);
  field.append(error);
  let invalid = false;
  let message: string | undefined;

  return {
    control,
    field,
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
      const describedBy = [description?.id, error.hidden ? undefined : error.id].filter(Boolean).join(' ');
      if (describedBy) control.setAttribute('aria-describedby', describedBy);
      else control.removeAttribute('aria-describedby');
      return invalid ? undefined : value;
    },
  };
}

function difference(amount: number, baseline: number) {
  const delta = Math.round(amount) - Math.round(baseline);
  return delta === 0 ? copy.noDifference : copy.difference(dollars.format(Math.abs(delta)), delta > 0);
}

function billCard(doc: Document, level: number, result: Bill, index: number, currentCost?: number) {
  const card = element(doc, 'article', undefined, `uhp-bill ${seriesClass(index)}`);
  const title = heading(doc, level, copy.model(result.model.id), 'uhp-bill-title');
  const name = element(doc, 'p', modelName(result.model.id, result.model.name), 'uhp-bill-name');
  const total = element(doc, 'p', dollars.format(result.household), 'uhp-bill-amount');
  total.append(element(doc, 'span', ` ${copy.perYear}`));
  card.append(title, name, total);
  if (currentCost !== undefined) {
    card.append(element(doc, 'p', difference(result.household, currentCost), 'uhp-hint uhp-bill-difference'));
  }
  const breakdown = element(doc, 'dl');
  for (const [label, amount] of [
    [copy.gross, result.gross], [copy.credit, result.credit], [copy.employerOnWages, result.employer],
  ] as const) {
    const row = element(doc, 'div');
    row.append(element(doc, 'dt', label), element(doc, 'dd', dollars.format(amount)));
    breakdown.append(row);
  }
  card.append(breakdown);
  return card;
}

function setText(node: HTMLElement, text: string) {
  if (node.textContent !== text) node.textContent = text;
}

function usesPayroll(kind: EmployerKind): boolean {
  return kind === 'private' ||
    (kind === 'public' && MODELS.some(model => model.payroll.publicEmployer === 'same-as-private'));
}

/** The employer's payroll tax as a share of wages, model by model, in words. */
function ratesInWords(kind: EmployerKind, payroll: number | undefined): string {
  const groups = new Map<string, string[]>();
  for (const model of MODELS) {
    const rate = share(employerRate(kind, model, payroll));
    groups.set(rate, [...(groups.get(rate) ?? []), String(model.id)]);
  }
  if (groups.size === 1) return copy.rateInEveryModel([...groups.keys()][0]);
  return list.format([...groups].map(([rate, ids]) => copy.rateUnder(rate, list.format(ids), ids.length > 1)));
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

/** Mount the calculator in a host and return a function that removes it. */
export function mount(host: HTMLElement, options: WidgetOptions = {}): () => void {
  mounted.get(host)?.();
  const doc = host.ownerDocument;
  // Another bundled copy of this module on the page keeps its own counter, so check the document too.
  let prefix: string;
  do prefix = `oregon-uhp-${++nextId}`; while (doc.getElementById(`${prefix}-income`));
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
  const household = element(doc, 'section', undefined, 'uhp-section');
  household.append(heading(doc, sectionLevel, copy.household, 'uhp-section-title'));
  const inputs = element(doc, 'div', undefined, 'uhp-fields');
  const sizes = SIZES.map(value => ({ value: String(value), label: String(value) }));
  const initialSize = SIZES.includes(options.initialHouseholdSize as number)
    ? options.initialHouseholdSize as number
    : SIZES[Math.min(1, SIZES.length - 1)];
  const size = select(doc, id('size'), sizes, String(initialSize));
  // A starting value is used only if the field would accept it as typed.
  const amountOption = (value: unknown, positive = false) =>
    typeof value === 'number' && !Number.isNaN(parseAmount(String(value))) && !(positive && value === 0)
      ? value
      : undefined;
  const income = moneyField(doc, id('income'), copy.income, {
    initial: amountOption(options.initialIncome) ?? 85_000,
    hint: copy.incomeHint,
    requiredPrompt: copy.enterIncome,
  });
  income.control.required = true;

  const slider = element(doc, 'input');
  slider.id = id('income-slider');
  slider.type = 'range';
  slider.min = '0';
  slider.max = String(SLIDER_POSITIONS);

  const employers = EMPLOYERS.map(({ kind, label }) => ({ value: kind, label: employerLabel(kind, label) }));
  const initialEmployer = EMPLOYERS.some(({ kind }) => kind === options.initialEmployer)
    ? options.initialEmployer as EmployerKind
    : 'private';
  const employer = select(doc, id('employer'), employers, initialEmployer);
  const payroll = moneyField(doc, id('payroll'), copy.payroll, {
    initial: amountOption(options.initialPayroll, true),
    hint: copy.payrollHint,
    requiredPrompt: copy.enterPayroll,
    positive: true,
  });
  const currentCost = moneyField(doc, id('current-cost'), copy.currentCost, { hint: copy.currentCostHint });
  const incomeFields = element(doc, 'div', undefined, 'uhp-field-group');
  incomeFields.append(income.field, labeled(doc, copy.slider, slider));

  const employerFields = element(doc, 'div', undefined, 'uhp-field-group');
  const wagesNote = element(doc, 'p', copy.allWages, 'uhp-hint');
  const rateNote = element(doc, 'p', undefined, 'uhp-hint uhp-employer-note');
  employerFields.append(labeled(doc, copy.wageSource, employer, wagesNote), payroll.field, rateNote);
  inputs.append(labeled(doc, copy.size, size), incomeFields, employerFields, currentCost.field);

  const householdStatus = element(doc, 'p', undefined, 'uhp-result-status');
  const householdLive = status(doc);
  const householdAnnouncer = announcer(householdLive);
  const householdResults = element(doc, 'div');
  const cards = element(doc, 'div', undefined, 'uhp-bills');
  const chart = createChart(doc, id('chart-income'));
  const assumption = element(doc, 'p', copy.unchangedPay, 'uhp-hint');
  householdResults.append(heading(doc, sectionLevel + 1, copy.results, 'uhp-results-title'), cards, assumption, chart.figure);
  household.append(inputs, householdStatus, householdLive, householdResults);

  let announcedNote: string | undefined;

  function updateHousehold(quiet = false) {
    const amount = income.read();
    if (amount !== undefined) slider.value = String(positionOf(amount));
    // The slider only reaches round amounts; announce the income the results use.
    slider.setAttribute('aria-valuetext', dollars.format(amount ?? incomeAt(slider.valueAsNumber)));

    const kind = employer.value as EmployerKind;
    wagesNote.hidden = kind === 'none';
    if (wagesNote.hidden) employer.removeAttribute('aria-describedby');
    else employer.setAttribute('aria-describedby', wagesNote.id);
    const needsPayroll = usesPayroll(kind);
    payroll.field.hidden = !needsPayroll;
    payroll.control.disabled = !needsPayroll;
    payroll.control.required = needsPayroll;
    const payrollAmount = payroll.read();
    const baseline = currentCost.read();
    const missing = amount === undefined || (needsPayroll && payrollAmount === undefined);
    householdResults.hidden = missing;
    rateNote.hidden = missing;
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
      return;
    }

    const householdSize = Number(size.value);
    const results = MODELS.map(model => bill(model, amount, householdSize, kind, payrollAmount));
    const totals = results.map(result => result.household);
    const low = dollars.format(Math.min(...totals));
    const high = dollars.format(Math.max(...totals));
    const message = low === high
      ? copy.singleAmount(low, MODELS.length)
      : copy.range(low, high, MODELS.length);
    setText(householdStatus, message);
    const note = employerNote(kind, payrollAmount);
    setText(rateNote, note);
    const selectedEmployer = employer.selectedOptions[0].text;
    let comparison: string | undefined;
    if (baseline !== undefined) comparison = copy.comparisonSummary(dollars.format(baseline));
    else if (currentCost.invalid) comparison = copy.comparisonSkipped;
    householdAnnouncer.say([
      message,
      copy.householdContext(dollars.format(amount), householdSize, selectedEmployer,
        payrollAmount === undefined ? undefined : dollars.format(payrollAmount)),
      // The note changes only with the employer or payroll; say it again only when it does.
      note === announcedNote ? undefined : note,
      comparison,
    ].filter(Boolean).join(' '), quiet);
    announcedNote = note;
    cards.replaceChildren(...results.map((result, i) => billCard(doc, sectionLevel + 2, result, i, baseline)));
    assumption.hidden = kind === 'none';
    chart.update({ income: amount, size: householdSize, employer: kind, payroll: payrollAmount, currentCost: baseline, bills: results });
  }

  slider.addEventListener('input', () => {
    income.control.value = String(incomeAt(slider.valueAsNumber));
    updateHousehold();
  });
  for (const control of [income.control, payroll.control, currentCost.control]) {
    control.addEventListener('input', () => updateHousehold());
  }
  size.addEventListener('change', () => updateHousehold());
  employer.addEventListener('change', () => updateHousehold());

  const business = element(doc, 'section', undefined, 'uhp-section uhp-business');
  business.append(heading(doc, sectionLevel, copy.business, 'uhp-section-title'));
  const businessInputs = element(doc, 'div', undefined, 'uhp-fields');
  const businessKind = select(doc, id('business-kind'), employers.filter(option => option.value !== 'none'), 'private');
  const businessPayroll = moneyField(doc, id('business-payroll'), copy.businessPayroll, {
    requiredPrompt: copy.enterBusinessPayroll,
    positive: true,
  });
  businessPayroll.control.required = true;
  const spend = moneyField(doc, id('spend'), copy.businessSpend, { hint: copy.businessSpendHint });
  businessInputs.append(labeled(doc, copy.businessKind, businessKind), businessPayroll.field, spend.field);
  const businessLive = status(doc);
  const businessAnnouncer = announcer(businessLive);
  const businessResults = scrollRegion(doc, copy.businessResults);
  const businessHeading = heading(doc, sectionLevel + 1, copy.businessResults, 'uhp-results-title');
  business.append(businessInputs, businessHeading, businessLive, businessResults);

  function updateBusiness(quiet = false) {
    const yearlyPayroll = businessPayroll.read();
    const baseline = spend.read();
    businessResults.hidden = yearlyPayroll === undefined;
    businessHeading.hidden = businessResults.hidden;
    if (yearlyPayroll === undefined) {
      businessResults.replaceChildren();
      businessAnnouncer.say(businessPayroll.message ?? copy.enterBusinessPayroll, quiet);
      return;
    }

    const rows = MODELS.map(model => {
      const label = copy.model(model.id);
      const tax = businessKind.value === 'public'
        ? employerRate('public', model, yearlyPayroll) * yearlyPayroll
        : payrollTax(yearlyPayroll, model);
      const cells = [label, dollars.format(tax), share(tax / yearlyPayroll)];
      if (baseline !== undefined) cells.push(difference(tax, baseline));
      return cells;
    });
    const headings: string[] = [copy.modelColumn, copy.businessResults, copy.effectiveRate];
    if (baseline !== undefined) headings.push(copy.comparison);
    businessResults.replaceChildren(table(doc, copy.businessResults, headings, rows));
    const amounts = rows.map(([label, tax]) => copy.modelAmount(label, tax)).join(' ');
    let comparison: string | undefined;
    if (baseline !== undefined) comparison = copy.comparisonSummary(dollars.format(baseline));
    else if (spend.invalid) comparison = copy.comparisonSkipped;
    businessAnnouncer.say([copy.businessSummary(amounts), comparison].filter(Boolean).join(' '), quiet);
  }

  businessKind.addEventListener('change', () => updateBusiness());
  businessPayroll.control.addEventListener('input', () => updateBusiness());
  spend.control.addEventListener('input', () => updateBusiness());

  const show = options.show === 'household' || options.show === 'employer' ? options.show : 'all';
  if (withHeader) root.append(header);
  if (show !== 'employer') root.append(household);
  if (show !== 'household') root.append(business);
  root.append(element(doc, 'p', copy.privacy, 'uhp-privacy'));
  // Keep widget controls independent of any form that contains the host.
  root.querySelectorAll('input, select').forEach(control => control.setAttribute('form', id('unowned-form')));
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
