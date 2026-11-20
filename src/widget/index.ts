import { incomeAt, positionOf, SLIDER_POSITIONS } from '../model/income-scale';
import { bill, EMPLOYERS, employerRate, MODELS, payrollTax } from '../model/uhp-model';
import type { Bill, EmployerKind } from '../model/uhp-model';
import { createChart, seriesClass } from './chart';
import { element, scrollRegion, status, table } from './dom';
import { copy, dollars, locale, percent } from './strings';
import './widget.css';

export interface WidgetOptions {
  initialIncome?: number;
  initialHouseholdSize?: 1 | 2 | 3 | 4 | 5;
  initialEmployer?: EmployerKind;
  initialPayroll?: number;
}

const mounted = new WeakMap<HTMLElement, () => void>();
let nextId = 0;

function labeled(doc: Document, label: string, control: HTMLElement, description?: HTMLElement) {
  const field = element(doc, 'div', undefined, 'field');
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

function moneyField(
  doc: Document,
  id: string,
  label: string,
  initial?: number,
  hint?: string,
) {
  const control = element(doc, 'input');
  control.id = id;
  control.type = 'number';
  control.inputMode = 'decimal';
  control.autocomplete = 'off';
  control.min = '0';
  control.max = String(Number.MAX_SAFE_INTEGER);
  control.step = 'any';
  if (initial !== undefined) control.value = String(initial);

  const error = element(doc, 'p', copy.amountPrompt(label), 'field-error');
  error.hidden = true;
  error.id = `${id}-error`;
  const description = hint ? element(doc, 'p', hint, 'hint') : undefined;
  const field = labeled(doc, label, control, description);
  field.append(error);

  return {
    control,
    field,
    read() {
      if (control.disabled) return undefined;
      const empty = control.value === '' && !control.validity.badInput;
      const invalid = !control.validity.valid;
      if (invalid && !empty) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
      error.hidden = !invalid || empty;
      const describedBy = [description?.id, error.hidden ? undefined : error.id].filter(Boolean).join(' ');
      if (describedBy) control.setAttribute('aria-describedby', describedBy);
      else control.removeAttribute('aria-describedby');
      return empty || invalid ? undefined : control.valueAsNumber;
    },
  };
}

function difference(amount: number, baseline: number) {
  const delta = Math.round(amount) - Math.round(baseline);
  return delta === 0 ? copy.noDifference : copy.difference(dollars.format(Math.abs(delta)), delta > 0);
}

function billCard(doc: Document, result: Bill, index: number, currentCost?: number) {
  const card = element(doc, 'article', undefined, `bill ${seriesClass(index)}`);
  const heading = element(doc, 'h4', copy.model(result.model.id));
  const name = element(doc, 'p', result.model.name, 'bill-name');
  const total = element(doc, 'p', dollars.format(result.household), 'bill-amount');
  total.append(element(doc, 'span', ` ${copy.perYear}`));
  card.append(heading, name, total);
  if (currentCost !== undefined) {
    card.append(element(doc, 'p', difference(result.household, currentCost), 'hint'));
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

function setStatus(node: HTMLElement, text: string) {
  if (node.textContent !== text) node.textContent = text;
}

function usesPayroll(kind: EmployerKind): boolean {
  return kind === 'private' ||
    (kind === 'public' && MODELS.some(model => model.payroll.publicEmployer === 'same-as-private'));
}

/** Mount the calculator in a host and return a function that removes it. */
export function mount(host: HTMLElement, options: WidgetOptions = {}): () => void {
  mounted.get(host)?.();
  const doc = host.ownerDocument;
  const prefix = `oregon-uhp-${++nextId}`;
  const id = (name: string) => `${prefix}-${name}`;
  const root = element(doc, 'div', undefined, 'oregon-uhp');
  root.lang = locale;
  const header = element(doc, 'header', undefined, 'widget-header');
  header.append(
    element(doc, 'p', copy.snapshot, 'snapshot'),
    element(doc, 'h1', copy.title),
    element(doc, 'p', copy.intro, 'intro'),
  );

  const household = element(doc, 'section', undefined, 'calculator-section');
  household.append(element(doc, 'h2', copy.household));
  const inputs = element(doc, 'div', undefined, 'fields');
  const sizes = [1, 2, 3, 4, 5].map(value => ({ value: String(value), label: String(value) }));
  const size = select(doc, id('size'), sizes, String(options.initialHouseholdSize ?? 2));
  const income = moneyField(doc, id('income'), copy.income, options.initialIncome ?? 85_000, copy.incomeHint);
  income.control.required = true;

  const slider = element(doc, 'input');
  slider.id = id('income-slider');
  slider.type = 'range';
  slider.min = '0';
  slider.max = String(SLIDER_POSITIONS);

  const employers = EMPLOYERS.map(({ kind, label }) => ({ value: kind, label }));
  const employer = select(doc, id('employer'), employers, options.initialEmployer ?? 'private');
  const payroll = moneyField(doc, id('payroll'), copy.payroll, options.initialPayroll, copy.payrollHint);
  const currentCost = moneyField(doc, id('current-cost'), copy.currentCost, undefined, copy.currentCostHint);
  const incomeFields = element(doc, 'div', undefined, 'field-group');
  incomeFields.append(income.field, labeled(doc, copy.slider, slider));

  const employerFields = element(doc, 'div', undefined, 'field-group');
  const wagesNote = element(doc, 'p', copy.allWages, 'hint');
  employerFields.append(labeled(doc, copy.wageSource, employer, wagesNote), payroll.field);
  inputs.append(labeled(doc, copy.size, size), incomeFields, employerFields, currentCost.field);

  const householdStatus = element(doc, 'p', undefined, 'result-status');
  const householdLive = status(doc);
  householdLive.classList.add('visually-hidden');
  const householdResults = element(doc, 'div');
  const cards = element(doc, 'div', undefined, 'bills');
  const chart = createChart(doc, id('chart-income'));
  const assumption = element(doc, 'p', copy.unchangedPay, 'hint');
  householdResults.append(element(doc, 'h3', copy.results), cards, assumption, chart.figure);
  household.append(inputs, householdStatus, householdLive, householdResults);

  function updateHousehold() {
    const amount = income.read();
    if (amount !== undefined) {
      slider.value = String(positionOf(amount));
    }
    slider.setAttribute('aria-valuetext', dollars.format(incomeAt(slider.valueAsNumber)));

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
    if (missing) {
      cards.replaceChildren();
      chart.update(undefined);
      const prompt = amount === undefined ? copy.enterIncome : copy.enterPayroll;
      setStatus(householdStatus, prompt);
      setStatus(householdLive, prompt);
      return;
    }

    const householdSize = Number(size.value);
    const results = MODELS.map(model => bill(model, amount, householdSize, kind, payrollAmount));
    const totals = results.map(result => result.household);
    const low = dollars.format(Math.min(...totals));
    const high = dollars.format(Math.max(...totals));
    const message = low === high ? copy.singleAmount(low) : copy.range(low, high);
    setStatus(householdStatus, message);
    const selectedEmployer = employer.selectedOptions[0].text;
    setStatus(householdLive, [
      message,
      copy.householdContext(dollars.format(amount), householdSize, selectedEmployer,
        payrollAmount === undefined ? undefined : dollars.format(payrollAmount)),
      baseline === undefined ? undefined : copy.comparisonSummary(dollars.format(baseline)),
    ].filter(Boolean).join(' '));
    cards.replaceChildren(...results.map((result, i) => billCard(doc, result, i, baseline)));
    assumption.hidden = kind === 'none';
    chart.update({ income: amount, size: householdSize, employer: kind, payroll: payrollAmount, currentCost: baseline, bills: results });
  }

  slider.addEventListener('input', () => {
    income.control.value = String(incomeAt(slider.valueAsNumber));
    updateHousehold();
  });
  for (const control of [income.control, payroll.control, currentCost.control]) {
    control.addEventListener('input', updateHousehold);
  }
  size.addEventListener('change', updateHousehold);
  employer.addEventListener('change', updateHousehold);

  const business = element(doc, 'section', undefined, 'calculator-section');
  business.append(element(doc, 'h2', copy.business));
  const businessInputs = element(doc, 'div', undefined, 'fields business-fields');
  const businessKind = select(doc, id('business-kind'), employers.filter(option => option.value !== 'none'), 'private');
  const businessPayroll = moneyField(doc, id('business-payroll'), copy.businessPayroll);
  businessPayroll.control.required = true;
  const spend = moneyField(doc, id('spend'), copy.businessSpend, undefined, copy.businessSpendHint);
  businessInputs.append(labeled(doc, copy.businessKind, businessKind), businessPayroll.field, spend.field);
  const businessStatus = status(doc);
  const businessResults = scrollRegion(doc, copy.businessResults);
  const businessHeading = element(doc, 'h3', copy.businessResults);
  business.append(businessInputs, businessHeading, businessStatus, businessResults);

  function updateBusiness() {
    const yearlyPayroll = businessPayroll.read();
    const baseline = spend.read();
    businessResults.hidden = yearlyPayroll === undefined;
    businessHeading.hidden = businessResults.hidden;
    businessStatus.classList.toggle('visually-hidden', !businessResults.hidden);
    if (yearlyPayroll === undefined) {
      businessResults.replaceChildren();
      setStatus(businessStatus, copy.enterBusinessPayroll);
      return;
    }

    const rows = MODELS.map(model => {
      const label = copy.model(model.id);
      const tax = businessKind.value === 'public'
        ? employerRate('public', model, yearlyPayroll) * yearlyPayroll
        : payrollTax(yearlyPayroll, model);
      const cells = [label, dollars.format(tax), percent.format(yearlyPayroll > 0 ? tax / yearlyPayroll : 0)];
      if (baseline !== undefined) cells.push(difference(tax, baseline));
      return cells;
    });
    const headings: string[] = [copy.modelColumn, copy.businessResults, copy.effectiveRate];
    if (baseline !== undefined) headings.push(copy.comparison);
    businessResults.replaceChildren(table(doc, headings, rows));
    const amounts = rows.map(([label, tax]) => copy.modelAmount(label, tax)).join(' ');
    setStatus(businessStatus, [
      copy.businessSummary(amounts),
      baseline === undefined ? undefined : copy.comparisonSummary(dollars.format(baseline)),
    ].filter(Boolean).join(' '));
  }

  businessKind.addEventListener('change', updateBusiness);
  businessPayroll.control.addEventListener('input', updateBusiness);
  spend.control.addEventListener('input', updateBusiness);

  root.append(header, household, business, element(doc, 'p', copy.privacy, 'privacy'));
  // Keep widget controls independent of any form that contains the host.
  root.querySelectorAll('input, select').forEach(control => control.setAttribute('form', id('unowned-form')));
  host.replaceChildren(root);
  updateHousehold();
  updateBusiness();

  const destroy = () => {
    chart.destroy();
    root.remove();
    if (mounted.get(host) === destroy) mounted.delete(host);
  };
  mounted.set(host, destroy);
  return destroy;
}
