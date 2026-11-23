// @vitest-environment happy-dom
import { incomeAt, SLIDER_POSITIONS } from '../model/income-scale';
import { bill, employerRate, MODELS, payrollTax, SCENARIOS, schedule } from '../model/uhp-model';
import type { EmployerKind } from '../model/uhp-model';
import { ANNOUNCE_DELAY, ANNOUNCE_LINGER, parseAmount } from './dom';
import { mount } from './index';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const words = new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' });
const pct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
});
const BAD_AMOUNT = 'Enter a dollar amount in digits, such as 85,000 or 85000.50.';
const named = (label: string, message: string) => `${label}: ${message}`;
const DRAFTS = 'a year, in today’s dollars. None has been chosen, and all of them are drafts that may change.';

const COVERAGE = 'How you are covered today';
const INCOME = 'Household income per year';
const EMPLOYER = 'Who pays your wages';
const PAYROLL = 'Its total payroll per year, roughly';
const CURRENT_COST = 'What you pay for health care now, per year';
const BUSINESS_KIND = 'Type of employer';
const BUSINESS_PAYROLL = 'Total payroll per year';
const BUSINESS_SPEND = 'What you spend on employee health benefits now, per year';

/** The Board's examples of what households pay today (report Tables S1, S2 and S4). */
const boardToday = (id: string) => Math.max(...SCENARIOS.find(s => s.id === id)!.rows.map(row => row.now));

let host: HTMLDivElement;
let destroy: () => void;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  destroy?.();
  host.remove();
  vi.useRealTimers();
});

function control<T extends HTMLInputElement | HTMLSelectElement>(label: string): T {
  const match = [...host.querySelectorAll('label')].find(node => node.textContent === label);
  if (!match?.control) throw new Error(`Missing control for ${label}`);
  return match.control as T;
}

function change(name: string, value: string, event = 'input') {
  const input = control(name);
  input.value = value;
  input.dispatchEvent(new Event(event, { bubbles: true }));
}

const slider = () => host.querySelector<HTMLInputElement>('.uhp-slider')!;
const householdCards = () => [...host.querySelectorAll('.uhp-section:not(.uhp-business) .uhp-bill')];
const businessCards = () => [...host.querySelectorAll('.uhp-business .uhp-bill')];
const rangeLine = () => host.querySelector('.uhp-section:not(.uhp-business) .uhp-result-status')?.textContent;

function setSize(size: number) {
  host.querySelector<HTMLButtonElement>(`button[data-size="${size}"]`)!.click();
}

function topRate(index: number) {
  const model = MODELS[index];
  return `${model.rates.length > 1 ? 'up to ' : ''}${pct.format(model.topRate)}`;
}

/** Every household card against the engine: title, amount, and the lines beneath it. */
function expectBills(income: number, size: number, employer: EmployerKind, payroll?: number) {
  const cards = householdCards();
  expect(cards).toHaveLength(MODELS.length);
  MODELS.forEach((model, i) => {
    const expected = bill(model, income, size, employer, payroll);
    const card = cards[i];
    expect(card.querySelector('.uhp-bill-title')?.textContent).toBe(`Model ${model.id} · ${topRate(i)}`);
    expect(card.querySelector('.uhp-bill-name')?.textContent).toBe(model.name);
    expect(card.querySelector('.uhp-bill-amount')?.textContent).toBe(`${usd.format(expected.household)} / year`);
    const details = [...card.querySelectorAll('.uhp-bill-detail')].map(node => node.textContent);
    const want: string[] = [];
    if (expected.household < 0.5) {
      want.push(expected.gross < 0.5
        ? 'Your income is within this model’s exemption.'
        : 'The worker credit covers the whole bill, if your employer pays the payroll tax shown.');
    } else if (expected.credit >= 0.5) {
      want.push(`${usd.format(expected.gross)} before a ${usd.format(expected.credit)} worker credit.`);
    }
    if (expected.employer >= 0.5) want.push(`Your employer would pay about ${usd.format(expected.employer)} on your wages.`);
    expect(details).toEqual(want);
  });
}

function expectRange(income: number, size: number, employer: EmployerKind, payroll?: number) {
  const totals = MODELS.map(model => bill(model, income, size, employer, payroll).household);
  const [low, high] = [usd.format(Math.min(...totals)), usd.format(Math.max(...totals))];
  expect(rangeLine()).toBe(low === high
    ? `Your range across the five models: ${low} a year in every model, in today’s dollars. None has been chosen, and all of them are drafts that may change.`
    : `Your range across the five models: ${low} to ${high} ${DRAFTS}`);
  expect(host.querySelector('.uhp-sticky strong')?.textContent).toBe(low === high ? low : `${low} to ${high}`);
}

function expectNoResults(prompt: RegExp) {
  expect(rangeLine()).toMatch(prompt);
  expect(householdCards()).toHaveLength(0);
  expect(host.querySelector('figure')?.hidden).toBe(true);
  expect(host.querySelector<HTMLElement>('.uhp-sticky')?.hidden).toBe(true);
  // Nothing computed earlier may linger in the hidden chart.
  expect(host.querySelector('figure')?.textContent).not.toMatch(/\$\d/);
  expect(host.querySelector('.uhp-plot svg')?.childElementCount).toBe(0);
}

/** Model IDs a card title names: "Model 1", "Models 2 to 5", "Models 4 and 5". */
function idsIn(title: string): string[] {
  const text = title.replace(/^Models? /, '');
  const run = text.match(/^(\d+) to (\d+)$/);
  if (run) {
    return Array.from({ length: Number(run[2]) - Number(run[1]) + 1 }, (_, i) => String(Number(run[1]) + i));
  }
  return text.split(/,\s*(?:and\s+)?|\s+and\s+/).filter(Boolean);
}

/**
 * Read the chart's own axes back out of the SVG: where the gridlines and the
 * income ticks sit, and which amounts they are labeled with. Everything
 * plotted is then checked against those axes and the engine.
 */
function axes() {
  const attr = (node: Element, name: string) => Number(node.getAttribute(name));
  const grid = [...host.querySelectorAll('.uhp-plot .uhp-grid-line')]
    .map(node => ({ amount: attr(node, 'data-amount'), y: attr(node, 'y1'), y2: attr(node, 'y2') }));
  const ticks = [...host.querySelectorAll('.uhp-plot .uhp-tick[data-income]')]
    .map(node => ({ income: attr(node, 'data-income'), x: attr(node, 'x') }));
  const [y0, yN] = [grid[0], grid[grid.length - 1]];
  const [x0, xN] = [ticks[0], ticks[ticks.length - 1]];
  expect(y0.amount).toBe(0);
  expect(x0.income).toBe(0);
  expect(yN.amount).toBeGreaterThan(0);
  expect(xN.income).toBeGreaterThan(0);
  const y = (amount: number) => y0.y + (yN.y - y0.y) * (amount / yN.amount);
  // Every gridline is level and evenly placed, and each axis label prints the amount it marks.
  for (const line of grid) {
    expect(line.y).toBeCloseTo(y(line.amount), 6);
    expect(line.y2).toBe(line.y);
  }
  const yLabels = [...host.querySelectorAll('.uhp-plot text.uhp-tick[data-amount]')];
  expect(yLabels.map(node => node.textContent)).toEqual(grid.map(line => compact.format(line.amount)));
  expect(yLabels.map(node => attr(node, 'data-amount'))).toEqual(grid.map(line => line.amount));
  const xLabels = [...host.querySelectorAll('.uhp-plot .uhp-tick[data-income]')];
  expect(xLabels.map(node => node.textContent)).toEqual(ticks.map(tick => compact.format(tick.income)));
  for (const tick of ticks) {
    expect(tick.x).toBeCloseTo(x0.x + (xN.x - x0.x) * (tick.income / xN.income), 6);
  }
  return {
    top: yN.y,
    bottom: y0.y,
    y,
    x: (income: number) => x0.x + (xN.x - x0.x) * (income / xN.income),
    incomeAt: (x: number) => (x - x0.x) / (xN.x - x0.x) * xN.income,
  };
}

describe('typed dollar amounts', () => {
  it.each([
    ['85000', 85_000], ['85,000', 85_000], ['$85,000', 85_000], [' $ 1,234.50 ', 1234.5], ['.5', 0.5], ['0', 0],
    ['00085', 85], ['85,000.', 85_000],
    ['1,234,567.5', 1_234_567.5], ['85.', 85], ['0.07', 0.07],
  ])('reads %j as %d', (raw, value) => {
    expect(parseAmount(raw)).toBe(value);
  });

  it('reads an empty field as no answer', () => {
    expect(parseAmount('')).toBeUndefined();
    expect(parseAmount('  ')).toBeUndefined();
    expect(parseAmount(' $ ')).toBeUndefined();
  });

  it.each([
    '-1', 'abc', '1e7', '85k', '1.2.3', '.', '99999999999999999999', '+5',
    // Separators used the other way around must not be read as a small amount.
    '85.000', '1.234,56', '1,2,3', '8,5', '85,0000', ',500', '1,234,56', '85,000.123', '0,085', '000,085',
    // Two numbers, or a stray character inside one, are not one amount.
    '85000 50', '1 2 3', '85 000', '8$5', '85,000$', '85 , 000', ',', '$,',
  ])('rejects %j', raw => {
    expect(parseAmount(raw)).toBeNaN();
  });
});

describe('calculator widget', () => {
  it('shows results for the Board’s example couple as soon as it loads', () => {
    destroy = mount(host);
    // The couple insured through an $8.5 million private employer, Table S2.
    expect(control(COVERAGE).value).toBe('employer');
    expect(control(INCOME).value).toBe('85,000');
    expect(control(EMPLOYER).value).toBe('private');
    expect(control(PAYROLL).value).toBe('8,500,000');
    expect(control(CURRENT_COST).value).toBe(new Intl.NumberFormat('en-US').format(boardToday('private')));
    expect(boardToday('private')).toBe(4_700);
    expect(host.querySelector('button[aria-pressed="true"]')?.textContent).toBe('2');
    expectBills(85_000, 2, 'private', 8_500_000);
    expectRange(85_000, 2, 'private', 8_500_000);
    expect(host.querySelector<HTMLElement>('figure')?.hidden).toBe(false);
    expect(host.querySelectorAll('.uhp-plot path.uhp-series')).toHaveLength(MODELS.length);
    expect(host.querySelector('.uhp-callout')?.textContent).toContain('Two assumptions behind the comparison below:');

    // The employer calculator opens with its labeled example, also with results.
    expect(control(BUSINESS_PAYROLL).value).toBe('1,100,000');
    expect(control(BUSINESS_SPEND).value).toBe('110,000');
    expect(businessCards().length).toBeGreaterThan(0);
    expect(host.querySelector('.uhp-business')?.textContent).toContain('The figures shown are an example.');
  });

  it.each([
    { income: 0, size: 1, employer: 'none' },
    { income: 485_000, size: 3, employer: 'none' },
    { income: 150_000, size: 4, employer: 'public' },
    { income: 85_000, size: 2, employer: 'private', payroll: 8_500_000 },
    { income: 300_000, size: 5, employer: 'private', payroll: 20_000_000 },
    { income: 125_000, size: 2, employer: 'private', payroll: 400_000 },
    { income: 61_000, size: 1, employer: 'private', payroll: 600_000 },
  ] as const)('matches every card for all models at $income ($employer)', ({
    income, size, employer, ...options
  }) => {
    const payroll = 'payroll' in options ? options.payroll : undefined;
    destroy = mount(host, {
      initialIncome: income,
      initialHouseholdSize: size,
      initialEmployer: employer,
      initialPayroll: payroll,
    });
    const used = employer === 'private' ? payroll : undefined;
    expectBills(income, size, employer, used);
    expectRange(income, size, employer, used);
    expect(host.querySelectorAll('.uhp-plot path.uhp-series')).toHaveLength(MODELS.length);
    const sampleRow = [...host.querySelectorAll('figure tbody tr')]
      .find(row => row.firstElementChild?.textContent === usd.format(income));
    expect([...sampleRow!.querySelectorAll('td')].map(cell => cell.textContent)).toEqual(
      MODELS.map(model => usd.format(bill(model, income, size, employer, used).household)),
    );
  });

  it.each([
    { income: 85_000, size: 2, employer: 'private', payroll: 8_500_000, currentCost: 4_700 },
    { income: 310_000, size: 4, employer: 'private', payroll: 20_000_000, currentCost: 90_000 },
    { income: 150_000, size: 5, employer: 'public', payroll: undefined, currentCost: 12_000 },
    { income: 60_000, size: 1, employer: 'none', payroll: undefined, currentCost: 0 },
  ] as const)('plots the engine’s figures against its own axes at $income ($employer)', ({
    income, size, employer, payroll, currentCost,
  }) => {
    destroy = mount(host, {
      initialIncome: income, initialHouseholdSize: size, initialEmployer: employer, initialPayroll: payroll,
    });
    change(CURRENT_COST, String(currentCost));
    const scale = axes();
    const amounts = MODELS.map(model => bill(model, income, size, employer, payroll).household);

    // Each line: every plotted point sits at the engine's amount for its income.
    const paths = [...host.querySelectorAll('.uhp-plot path.uhp-series')];
    paths.forEach((path, i) => {
      const points = [...path.getAttribute('d')!.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)]
        .map(match => ({ x: Number(match[1]), y: Number(match[2]) }));
      expect(points.length).toBeGreaterThan(200);
      for (const point of points) {
        const expected = bill(MODELS[i], scale.incomeAt(point.x), size, employer, payroll).household;
        expect(Math.abs(point.y - scale.y(expected))).toBeLessThan(0.05);
        // The line stays inside the plot.
        expect(point.y).toBeGreaterThanOrEqual(scale.top - 0.01);
        expect(point.y).toBeLessThanOrEqual(scale.bottom + 0.01);
      }
      expect(path.getAttribute('class')).toBe(`uhp-series uhp-series-${i + 1}`);
    });

    // The "you" marker: one dot per model at the bill shown on its card.
    const dots = [...host.querySelectorAll('.uhp-plot .uhp-dot')];
    expect(dots).toHaveLength(MODELS.length);
    dots.forEach((dot, i) => {
      expect(Number(dot.getAttribute('cx'))).toBeCloseTo(scale.x(income), 6);
      expect(Number(dot.getAttribute('cy'))).toBeCloseTo(scale.y(amounts[i]), 6);
    });

    // The "what you pay now" line.
    const costLine = host.querySelector('.uhp-plot .uhp-cost-line')!;
    expect(Number(costLine.getAttribute('y1'))).toBeCloseTo(scale.y(currentCost), 6);
    expect(Number(costLine.getAttribute('y2'))).toBeCloseTo(scale.y(currentCost), 6);
    expect(host.querySelector('figcaption')?.textContent).toBe(
      `Household contribution by incomeHousehold of ${size}, ${usd.format(currentCost)} a year today`,
    );

    // End labels name every model once, each beside the end of its own line.
    const ends = [...host.querySelectorAll('.uhp-plot .uhp-end-label')];
    const labeled = ends.flatMap(node => idsIn(node.textContent!.replace(' & ', ' and ')));
    expect(labeled.sort()).toEqual(MODELS.map(model => String(model.id)).sort());
    for (const node of ends) {
      for (const id of idsIn(node.textContent!.replace(' & ', ' and '))) {
        const i = MODELS.findIndex(model => String(model.id) === id);
        const lastIncome = scale.incomeAt(Number(paths[i].getAttribute('d')!.match(/L([\d.]+),[\d.]+$/)![1]));
        const endY = scale.y(bill(MODELS[i], lastIncome, size, employer, payroll).household);
        expect(Math.abs(Number(node.getAttribute('y')) - 4 - endY)).toBeLessThan(15 * MODELS.length);
      }
    }

    // The legend lists the models in the order of the lines, then the comparison line.
    const legend = [...host.querySelectorAll('.uhp-chart-legend li')];
    expect(legend.map(item => item.textContent)).toEqual([...MODELS.map(model => `Model ${model.id}`), 'What you pay now']);
    expect(legend.map(item => item.querySelector('.uhp-key')?.getAttribute('class'))).toEqual(
      [...MODELS.map((_, i) => `uhp-key uhp-series-${i + 1}`), 'uhp-key uhp-key-now'],
    );

    // The table under the chart: every row is the engine's figure for the income it is labeled with.
    const rows = [...host.querySelectorAll('figure tbody tr')];
    expect(rows.length).toBeGreaterThanOrEqual(6);
    for (const row of rows) {
      const rowIncome = Number(row.querySelector('th')!.textContent!.replace(/[$,]/g, ''));
      expect([...row.querySelectorAll('td')].map(cell => cell.textContent)).toEqual(
        MODELS.map(model => usd.format(bill(model, rowIncome, size, employer, payroll).household)),
      );
    }
    expect(new Set(rows.map(row => row.querySelector('th')!.textContent)).size).toBe(rows.length);
  });

  it('fills in the Board’s example cost and the employer for each kind of coverage', () => {
    destroy = mount(host);
    const cases = [
      { kind: 'own', cost: boardToday('self'), employer: 'none', note: undefined },
      { kind: 'medicare', cost: boardToday('medicare'), employer: 'none', note: 'Medicare:' },
      { kind: 'ohp', cost: 0, employer: 'none', note: 'Oregon Health Plan:' },
      { kind: 'none', cost: 0, employer: 'none', note: 'No insurance:' },
      { kind: 'employer', cost: boardToday('private'), employer: 'private', note: undefined },
    ] as const;
    expect([boardToday('self'), boardToday('medicare')]).toEqual([6_900, 9_600]);
    for (const { kind, cost, employer, note } of cases) {
      change(COVERAGE, kind, 'change');
      expect(control(CURRENT_COST).value).toBe(new Intl.NumberFormat('en-US').format(cost));
      expect(control(EMPLOYER).value).toBe(employer);
      const hint = host.querySelector(`#${control(CURRENT_COST).id}-hint`)!.textContent!;
      if (cost > 0) expect(hint).toContain(usd.format(cost));
      const callout = host.querySelector('.uhp-callout')!;
      const shownNotes = [...callout.querySelectorAll('p')].filter(p => !p.hidden).map(p => p.textContent!);
      if (note) expect(shownNotes[0]).toMatch(new RegExp(`^${note}`));
      expect(shownNotes.some(text => text.startsWith('Two assumptions'))).toBe(kind === 'employer');
      expectBills(85_000, 2, employer, employer === 'private' ? 8_500_000 : undefined);

      // Each card compares with what the household pays now; an uninsured household is told what it gets instead.
      const verdicts = householdCards().map(card => card.querySelector('.uhp-verdict')?.textContent);
      const expected = MODELS.map(model => {
        const owed = bill(model, 85_000, 2, employer, employer === 'private' ? 8_500_000 : undefined).household;
        if (kind === 'none') return owed < 0.5 ? 'You would owe nothing and be covered' : 'You would pay this and be covered';
        if (owed < 0.5 && cost < 0.5) return 'You would owe nothing';
        const delta = Math.round(owed) - cost;
        if (delta === 0) return 'About what you pay now';
        return delta < 0 ? `↓${usd.format(-delta)} less than you pay now` : `↑${usd.format(delta)} more than you pay now`;
      });
      expect(verdicts).toEqual(expected);
    }
  });

  it('compares each card with what the reader types for current spending', () => {
    const [income, size, payroll] = [85_000, 2, 8_500_000];
    destroy = mount(host);
    const totals = MODELS.map(model => bill(model, income, size, 'private', payroll).household);
    // A current cost between the lowest and highest bill, so some models cost more and some less.
    const currentCost = Math.round((Math.min(...totals) + Math.max(...totals)) / 2);
    change(CURRENT_COST, String(currentCost));
    const shown = householdCards().map(card => card.querySelector('.uhp-verdict')?.textContent);
    expect(shown).toEqual(totals.map(total => {
      const delta = Math.round(total) - currentCost;
      if (delta === 0) return 'About what you pay now';
      return delta < 0 ? `↓${usd.format(-delta)} less than you pay now` : `↑${usd.format(delta)} more than you pay now`;
    }));
    expect(shown.some(text => text?.includes('more'))).toBe(true);
    expect(shown.some(text => text?.includes('less'))).toBe(true);
    // The arrows are decoration; the words carry the meaning.
    for (const arrow of host.querySelectorAll('.uhp-arrow')) expect(arrow.getAttribute('aria-hidden')).toBe('true');

    change(CURRENT_COST, '');
    expect(householdCards().every(card => card.querySelector('.uhp-verdict') === null)).toBe(true);
    expect(host.querySelector('.uhp-chart-legend')?.textContent).not.toContain('What you pay now');
  });

  it('picks the household size with buttons and says where each model starts taxing', () => {
    destroy = mount(host, { initialEmployer: 'none' });
    for (const size of [1, 3, 5, 2]) {
      setSize(size);
      const pressed = [...host.querySelectorAll('button[data-size]')]
        .filter(button => button.getAttribute('aria-pressed') === 'true').map(button => button.textContent);
      expect(pressed).toEqual([String(size)]);
      expectBills(85_000, size, 'none');
      const hint = host.querySelector('fieldset .uhp-hint')!.textContent!;
      expect(hint).toMatch(/^Not taxed: /);
      // Every model's own exemption for this size appears, attached to that model.
      for (const model of MODELS) {
        const start = usd.format(schedule(model, size)[0].from);
        const part = hint.split(/, and |,? and the |Not taxed: /).find(text => text.includes(start));
        expect(part, `${start} for model ${model.id}`).toBeDefined();
        expect(idsIn(part!.replace(/^.*income in /, '').replace(/\.$/, '').replace(/^Models?/, m => m))).toContain(String(model.id));
      }
    }
    expect(host.querySelector('fieldset')?.getAttribute('aria-describedby')).toBe(host.querySelector('fieldset .uhp-hint')!.id);
  });

  it('requires a private payroll above zero and clears old results when it is removed', () => {
    destroy = mount(host);
    const field = control<HTMLInputElement>(PAYROLL);
    const fieldError = () => host.querySelector(`#${field.id}-error`) as HTMLElement;
    expect(field.required).toBe(true);
    expect(fieldError().hidden).toBe(true);
    expectBills(85_000, 2, 'private', 8_500_000);

    for (const invalid of ['', '-1', 'abc', '0', '0.0', ' ']) {
      change(PAYROLL, invalid);
      expectNoResults(/enter your employer’s total yearly payroll/i);
      expect(fieldError().hidden).toBe(false);
      expect(field.getAttribute('aria-describedby')).toContain(fieldError().id);
    }
    change(PAYROLL, '');
    expect(field.getAttribute('aria-invalid')).toBeNull();
    change(PAYROLL, '0');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(fieldError().textContent).toBe('Enter a payroll above $0.');

    change(PAYROLL, '$20,000,000');
    expectBills(85_000, 2, 'private', 20_000_000);
    expect(fieldError().hidden).toBe(true);

    change(EMPLOYER, 'public', 'change');
    expectBills(85_000, 2, 'public');
    expect(field.disabled).toBe(true);
  });

  it('explains the payroll tax rate behind the worker credit', () => {
    destroy = mount(host);
    // Each rate with the models it belongs to, written the way the note writes a group of models.
    const label = (ids: string[]) => {
      if (ids.length === 1) return `Model ${ids[0]}`;
      const run = ids.length >= 3 && ids.every((id, i) => i === 0 || Number(id) === Number(ids[i - 1]) + 1);
      return run ? `Models ${ids[0]} to ${ids[ids.length - 1]}` : `Models ${words.format(ids)}`;
    };
    const inWords = (kind: EmployerKind, payroll?: number) => {
      const groups = new Map<string, string[]>();
      for (const model of MODELS) {
        const rate = pct.format(employerRate(kind, model, payroll));
        groups.set(rate, [...(groups.get(rate) ?? []), String(model.id)]);
      }
      expect(groups.size).toBeGreaterThan(1);
      return words.format([...groups].map(([rate, ids]) => `${rate} of wages under ${label(ids)}`));
    };
    const note = () => host.querySelector('.uhp-employer-note') as HTMLElement;
    for (const rate of new Set(MODELS.map(model => pct.format(employerRate('private', model, 8_500_000))))) {
      expect(note().textContent).toContain(rate);
    }
    expect(note().textContent).toMatch(/^On that payroll the tax works out to /);

    // Where the models differ, each rate is attached to its own models.
    change(PAYROLL, '20,000,000');
    const text = note().textContent!;
    const groups = new Map<string, string[]>();
    for (const model of MODELS) {
      const rate = pct.format(employerRate('private', model, 20_000_000));
      groups.set(rate, [...(groups.get(rate) ?? []), String(model.id)]);
    }
    expect(groups.size).toBeGreaterThan(1);
    expect(text).toBe(`On that payroll the tax works out to ${inWords('private', 20_000_000)}.`);

    // A rate too small to print is never shown as 0%.
    change(PAYROLL, '500,001');
    expect(MODELS.some(model => employerRate('private', model, 500_001) > 0)).toBe(true);
    expect(note().textContent).toContain('less than 0.01% of wages');
    expect(note().textContent).not.toContain(' 0% ');

    change(PAYROLL, '400000');
    expect(MODELS.every(model => employerRate('private', model, 400_000) === 0)).toBe(true);
    expect(note().textContent).toBe(
      'A payroll of that size owes no payroll tax in any model, so there is no worker credit.',
    );
    expectBills(85_000, 2, 'private', 400_000);

    change(EMPLOYER, 'public', 'change');
    expect(note().textContent).toBe(
      `Public employers would pay the top payroll rate from the first dollar: ${inWords('public')}.`,
    );

    change(EMPLOYER, 'none', 'change');
    expect(note().textContent).toMatch(/no worker credit/);

    change(EMPLOYER, 'private', 'change');
    change(PAYROLL, '');
    expect(note().hidden).toBe(true);
    expect(note().textContent).toBe('');
  });

  it('updates the results for income, slider and household size changes', () => {
    destroy = mount(host, { initialEmployer: 'none' });
    change(INCOME, '6,100,000');
    expectBills(6_100_000, 2, 'none');
    expect(slider().valueAsNumber).toBe(SLIDER_POSITIONS);
    // The slider stops at its top position, but it announces the income the results use.
    expect(slider().getAttribute('aria-valuetext')).toBe('$6,100,000');

    change(INCOME, '85500');
    expect(slider().getAttribute('aria-valuetext')).toBe('$85,500');
    expectBills(85_500, 2, 'none');

    slider().value = '150';
    slider().dispatchEvent(new Event('input', { bubbles: true }));
    expect(control<HTMLInputElement>(INCOME).value).toBe(new Intl.NumberFormat('en-US').format(incomeAt(150)));
    expect(slider().getAttribute('aria-valuetext')).toBe(usd.format(incomeAt(150)));
    expectBills(incomeAt(150), 2, 'none');
    expect(slider().getAttribute('aria-label')).toBe('Adjust household income');

    setSize(5);
    expectBills(incomeAt(150), 5, 'none');
    for (const invalid of ['', '-5', 'lots']) {
      change(INCOME, invalid);
      expectNoResults(/enter a yearly household income/i);
    }
  });

  it('leaves what the reader is typing, and writes the commas in when the field is left', () => {
    destroy = mount(host, { initialEmployer: 'none' });
    for (const typed of ['8', '85', '85,4', '85,43', '85,432', '$85,432.10']) {
      change(INCOME, typed);
      expect(control<HTMLInputElement>(INCOME).value).toBe(typed);
    }
    expectBills(85_432.1, 2, 'none');
    change(INCOME, '123456', 'change');
    expect(control<HTMLInputElement>(INCOME).value).toBe('123,456');
    // A rejected entry is left as typed, for the reader to fix.
    change(INCOME, '12.3.4', 'change');
    expect(control<HTMLInputElement>(INCOME).value).toBe('12.3.4');
  });

  it('announces a result once typing pauses, not on every keystroke', () => {
    vi.useFakeTimers();
    destroy = mount(host);
    const [live] = host.querySelectorAll<HTMLElement>('[role="status"]');
    expect(live.getAttribute('aria-live')).toBe('polite');
    // What is on the page at load is not announced.
    vi.advanceTimersByTime(ANNOUNCE_DELAY * 2);
    expect(live.textContent).toBe('');

    for (const typed of ['9', '90', '905', '9050', '90500']) {
      change(INCOME, typed);
      vi.advanceTimersByTime(ANNOUNCE_DELAY / 2);
      expect(live.textContent).toBe('');
    }
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    // 90,500 is between slider stops, so this is the typed income, not the slider's.
    const totals = MODELS.map(model => bill(model, 90_500, 2, 'private', 8_500_000).household);
    expect(live.textContent).toBe(
      `Your range across the five models: ${usd.format(Math.min(...totals))} to ${usd.format(Math.max(...totals))} ${DRAFTS} ` +
      'Yearly income $90,500, household size 2. A private employer. Employer payroll $8,500,000. ' +
      'Compared with $4,700 in yearly spending today.',
    );
    // The rate note is said when the payroll changes, not again with every income.
    change(PAYROLL, '20,000,000');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toContain(host.querySelector('.uhp-employer-note')!.textContent);
    change(INCOME, '91,000');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toContain('Yearly income $91,000');
    expect(live.textContent).not.toContain('On that payroll');

    // The region empties afterward so the visible summary is not read twice.
    vi.advanceTimersByTime(ANNOUNCE_LINGER);
    expect(live.textContent).toBe('');

    change(PAYROLL, '');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toMatch(/enter your employer’s total yearly payroll/i);

    // A rejected entry is announced with the field's own error.
    for (const [typed, heard] of [['abc', BAD_AMOUNT], ['0', 'Enter a payroll above $0.'], ['85.000', BAD_AMOUNT]]) {
      change(PAYROLL, typed);
      vi.advanceTimersByTime(ANNOUNCE_DELAY);
      expect(live.textContent).toBe(named(PAYROLL, heard));
    }
    change(INCOME, 'xyz');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toBe(named(INCOME, BAD_AMOUNT));
    change(INCOME, '90500');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toBe(named(PAYROLL, BAD_AMOUNT));

    change(PAYROLL, '8500000');
    change(CURRENT_COST, 'x');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toContain('no comparison is shown');

    // Clicking a household size is announced too.
    setSize(4);
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toContain('household size 4');
  });

  it('groups models that charge an employer the same tax, for private and public employers', () => {
    destroy = mount(host);
    change(BUSINESS_SPEND, '');
    for (const kind of ['private', 'public'] as const) {
      change(BUSINESS_KIND, kind, 'change');
      for (const payroll of [1_100_000, 14_500_000, 500_100, 20_000_000]) {
        change(BUSINESS_PAYROLL, String(payroll));
        const seen: string[] = [];
        for (const card of businessCards()) {
          const ids = idsIn(card.querySelector('.uhp-bill-title')!.textContent!);
          for (const id of ids) {
            const model = MODELS.find(m => String(m.id) === id)!;
            const owed = kind === 'public' ? employerRate('public', model, payroll) * payroll : payrollTax(payroll, model);
            expect(card.querySelector('.uhp-bill-amount')?.textContent).toBe(`${usd.format(owed)} / year`);
            const share = owed / payroll;
            expect(card.querySelector('.uhp-bill-detail')?.textContent).toBe(
              `${share > 0 && share < 0.00005 ? 'less than 0.01%' : pct.format(share)} of payroll.`);
          }
          seen.push(...ids);
        }
        // Every model is on exactly one card.
        expect(seen.sort()).toEqual(MODELS.map(model => String(model.id)).sort());
      }
    }
    // Where the models differ there is more than one card, and each compares its own tax with the spending.
    change(BUSINESS_SPEND, '1,000,000');
    for (const [kind, payroll] of [['private', 20_000_000], ['public', 1_100_000]] as const) {
      change(BUSINESS_KIND, kind, 'change');
      change(BUSINESS_PAYROLL, String(payroll));
      expect(businessCards().length).toBeGreaterThan(1);
      for (const card of businessCards()) {
        const model = MODELS.find(m => String(m.id) === idsIn(card.querySelector('.uhp-bill-title')!.textContent!)[0])!;
        const owed = Math.round(kind === 'public' ? employerRate('public', model, payroll) * payroll : payrollTax(payroll, model));
        const delta = owed - 1_000_000;
        expect(card.querySelector('.uhp-verdict')?.textContent).toBe(delta === 0 ? 'About what you spend now'
          : delta < 0 ? `↓${usd.format(-delta)} less than you spend now` : `↑${usd.format(delta)} more than you spend now`);
      }
    }
  });

  it('requires business payroll and compares the tax with current benefit spending', () => {
    vi.useFakeTimers();
    destroy = mount(host, { show: 'employer' });
    const business = host.querySelector('.uhp-business')!;
    const live = business.querySelector('[role="status"]')!;
    const payrollError = () => business.querySelector(`#${control(BUSINESS_PAYROLL).id}-error`) as HTMLElement;

    change(BUSINESS_PAYROLL, '1,100,000');
    change(BUSINESS_SPEND, '0');
    const tax = payrollTax(1_100_000, MODELS[0]);
    expect(tax).toBeGreaterThan(0);
    expect(businessCards()[0].querySelector('.uhp-verdict')?.textContent).toBe(`↑${usd.format(tax)} more than you spend now`);
    change(BUSINESS_SPEND, String(Math.round(tax) + 10_000));
    expect(businessCards()[0].querySelector('.uhp-verdict')?.textContent).toBe('↓$10,000 less than you spend now');
    change(BUSINESS_SPEND, String(Math.round(tax)));
    expect(businessCards()[0].querySelector('.uhp-verdict')?.textContent).toBe('About what you spend now');

    change(BUSINESS_SPEND, '0');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    const cards = businessCards().map(card =>
      `${card.querySelector('.uhp-bill-title')!.textContent} ${card.querySelector('.uhp-bill-amount')!.textContent!.replace(' / year', '')}.`);
    expect(live.textContent).toBe(['Estimated yearly payroll tax.', ...cards, 'Compared with $0 in yearly spending today.'].join(' '));

    for (const [typed, heard] of [['-1', BAD_AMOUNT], ['0', 'Enter a payroll above $0.'], ['', 'Enter a total yearly payroll to see results.']]) {
      change(BUSINESS_PAYROLL, typed);
      expect(businessCards()).toHaveLength(0);
      expect(payrollError().textContent).toBe(heard);
      expect(business.querySelector('.uhp-result-status')?.textContent).toBe('Enter a total yearly payroll to see results.');
      vi.advanceTimersByTime(ANNOUNCE_DELAY);
      expect(live.textContent).toBe(named(BUSINESS_PAYROLL, heard));
    }
  });

  it('reads every model at the income under the pointer, with the same household, employer and payroll', () => {
    destroy = mount(host, { initialHouseholdSize: 3, initialPayroll: 20_000_000 });
    const svg = host.querySelector<SVGSVGElement>('.uhp-plot svg')!;
    const [width] = svg.getAttribute('viewBox')!.split(' ').slice(2).map(Number);
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width, height: 360, right: width, bottom: 360, x: 0, y: 0, toJSON: () => ({}) });
    const scale = axes();
    const at = (income: number) => {
      svg.dispatchEvent(new PointerEvent('pointermove', { clientX: scale.x(income), pointerType: 'mouse' }));
      const tip = host.querySelector<HTMLElement>('.uhp-tip')!;
      expect(tip.hidden).toBe(false);
      expect(tip.getAttribute('aria-hidden')).toBe('true');
      expect(tip.querySelector('strong')?.textContent).toBe(`${usd.format(income)} income`);
      expect([...tip.querySelectorAll('span:has(> b)')].map(row => row.textContent)).toEqual(
        MODELS.map(model => `Model ${model.id}${usd.format(bill(model, income, 3, 'private', 20_000_000).household)}`));
      // One dot per model on the crosshair, at the amount in the readout.
      const dots = [...host.querySelectorAll('.uhp-hover .uhp-dot')];
      expect(dots.map(dot => Number(dot.getAttribute('cy')))).toEqual(
        MODELS.map(model => expect.closeTo(scale.y(bill(model, income, 3, 'private', 20_000_000).household), 6)));
    };
    at(125_000);
    at(40_000);
    at(212_000);
    // Off the plot, the readout goes away.
    svg.dispatchEvent(new PointerEvent('pointermove', { clientX: 1, pointerType: 'mouse' }));
    expect(host.querySelector<HTMLElement>('.uhp-tip')!.hidden).toBe(true);
  });

  it('announces a change of coverage, even when the amounts stay the same', () => {
    vi.useFakeTimers();
    destroy = mount(host, { initialCoverage: 'ohp' });
    const [live] = host.querySelectorAll<HTMLElement>('[role="status"]');
    change(COVERAGE, 'none', 'change');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toMatch(/^How you are covered today: No insurance\. You would be covered\./);
    change(COVERAGE, 'ohp', 'change');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toMatch(/^How you are covered today: Oregon Health Plan\. You would keep your coverage\./);
    // Not repeated while the coverage stays the same.
    change(INCOME, '90,000');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toMatch(/^Your range across the five models/);
  });

  it('describes the payroll field with its guidance, and drops it when the field is hidden', () => {
    destroy = mount(host);
    const field = control<HTMLInputElement>(PAYROLL);
    const hint = host.querySelector(`#${field.id}-hint`)!;
    expect(hint.textContent).toMatch(/^A rough guess is fine/);
    expect(field.getAttribute('aria-describedby')).toBe(hint.id);
    change(EMPLOYER, 'none', 'change');
    expect(host.querySelector<HTMLElement>(`#${field.id}-hint`)!.hidden).toBe(true);
    change(EMPLOYER, 'private', 'change');
    expect(field.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('never calls a bill that prints as $1 nothing', () => {
    // Just past Model 3's exemption the bill is under a dollar but rounds up to $1.
    const income = schedule(MODELS[2], 1)[0].from + 9;
    const owed = bill(MODELS[2], income, 1, 'none').household;
    expect(owed).toBeGreaterThan(0.5);
    expect(owed).toBeLessThan(1);
    destroy = mount(host, { initialIncome: income, initialHouseholdSize: 1, initialCoverage: 'ohp' });
    expectBills(income, 1, 'none');
    const card = householdCards()[2];
    expect(card.querySelector('.uhp-bill-amount')?.textContent).toBe('$1 / year');
    expect(card.querySelector('.uhp-verdict')?.textContent).toBe('↑$1 more than you pay now');
    expect(card.textContent).not.toContain('exemption');
  });

  it('falls back to defaults for options a host passes out of range', () => {
    destroy = mount(host, {
      initialHouseholdSize: 9,
      initialEmployer: 'union' as EmployerKind,
      initialCoverage: 'gold' as 'own',
      initialIncome: -4,
      initialPayroll: 0,
      initialCurrentCost: -1,
      headingLevel: 7 as 1,
      theme: 'sepia' as 'auto',
    });
    expect(host.querySelector('button[aria-pressed="true"]')?.textContent).toBe('2');
    expect(control(COVERAGE).value).toBe('employer');
    expect(control(EMPLOYER).value).toBe('private');
    expect(control(INCOME).value).toBe('85,000');
    expect(control(PAYROLL).value).toBe('8,500,000');
    expect(control(CURRENT_COST).value).toBe('4,700');
    expect(host.querySelector('.uhp-title')?.tagName).toBe('H2');
    expect(host.querySelector<HTMLElement>('.oregon-uhp')?.dataset['uhpTheme']).toBeUndefined();

    for (const initialIncome of [1e21, 1e-7, Number.NaN, Infinity]) {
      destroy = mount(host, { initialIncome, initialEmployer: 'none' });
      expect(control(INCOME).value).toBe('85,000');
      expectBills(85_000, 2, 'none');
    }
  });

  it('takes a starting coverage, employer and current cost from the host', () => {
    destroy = mount(host, { initialCoverage: 'medicare', initialIncome: 75_000 });
    expect(control(EMPLOYER).value).toBe('none');
    expect(control(CURRENT_COST).value).toBe('9,600');
    expectBills(75_000, 2, 'none');
    // The Board's Medicare couple at $75,000 (Table S4), within the engine's tested tolerance.
    const row = SCENARIOS.find(s => s.id === 'medicare')!.rows.find(r => r.income === 75_000)!;
    householdCards().forEach((card, i) => {
      const shown = Number(card.querySelector('.uhp-bill-amount')!.textContent!.replace(/[^\d]/g, ''));
      expect(Math.abs(shown - row.models[i])).toBeLessThanOrEqual(4);
    });

    destroy = mount(host, { initialCoverage: 'own', initialEmployer: 'private', initialPayroll: 2_000_000, initialCurrentCost: 3_000 });
    expect(control(EMPLOYER).value).toBe('private');
    expect(control(CURRENT_COST).value).toBe('3,000');
    expectBills(85_000, 2, 'private', 2_000_000);
  });

  it('takes its heading level and color theme from the host', () => {
    destroy = mount(host, { headingLevel: 3, theme: 'light', initialEmployer: 'none' });
    expect(host.querySelector('.uhp-title')?.tagName).toBe('H3');
    expect(host.querySelector('.uhp-section-title')?.tagName).toBe('H4');
    expect(host.querySelector('.uhp-results-title')?.tagName).toBe('H5');
    expect(host.querySelector('.uhp-bill-title')?.tagName).toBe('H6');
    expect(host.querySelectorAll('h1, h2, header')).toHaveLength(0);
    expect(host.querySelector<HTMLElement>('.oregon-uhp')?.dataset['uhpTheme']).toBe('light');
  });

  it('shows one calculator, or none of the header, when the host asks', () => {
    destroy = mount(host, { show: 'household', header: false, headingLevel: 3, initialEmployer: 'none' });
    expect(host.querySelector('.uhp-header')).toBeNull();
    expect(host.querySelector('.uhp-business')).toBeNull();
    expect([...host.querySelectorAll('.uhp-section-title')].map(node => [node.tagName, node.textContent]))
      .toEqual([['H3', 'Household calculator']]);
    expect(host.querySelector('.uhp-results-title')?.tagName).toBe('H4');
    expect(host.querySelector('.uhp-bill-title')?.tagName).toBe('H5');
    expectBills(85_000, 2, 'none');
    expect(host.querySelector('.uhp-privacy')).not.toBeNull();

    destroy = mount(host, { show: 'employer' });
    expect(host.querySelector('.uhp-header')).not.toBeNull();
    expect(host.querySelectorAll('.uhp-section')).toHaveLength(1);
    expect(host.querySelector('.uhp-business .uhp-section-title')?.textContent).toBe('Employer payroll tax calculator');
    expect(householdCards()).toHaveLength(0);
    expect(businessCards().length).toBeGreaterThan(0);

    destroy = mount(host, { show: 'everything' as 'all', initialEmployer: 'none' });
    expect(host.querySelectorAll('.uhp-section')).toHaveLength(2);
  });

  it('leaves out the section titles when the host asks, keeping each section named', () => {
    destroy = mount(host, { header: false, sectionTitles: false, headingLevel: 3, initialEmployer: 'none' });
    expect(host.querySelectorAll('.uhp-section-title')).toHaveLength(0);
    const sections = [...host.querySelectorAll('section.uhp-section')];
    expect(sections.map(section => section.getAttribute('aria-label')))
      .toEqual(['Household calculator', 'Employer payroll tax calculator']);
    // The headings inside move up into the titles' place.
    expect(host.querySelector('.uhp-results-title')?.tagName).toBe('H3');
    expect(host.querySelector('.uhp-bill-title')?.tagName).toBe('H4');
    expect(host.querySelector('.uhp-business .uhp-results-title')?.tagName).toBe('H3');
    expect(host.querySelector('.uhp-business .uhp-bill-title')?.tagName).toBe('H4');
    expectBills(85_000, 2, 'none');

    destroy = mount(host, { header: false, headingLevel: 3 });
    expect(host.querySelectorAll('section.uhp-section[aria-label]')).toHaveLength(0);
    expect(host.querySelector('.uhp-section-title')?.tagName).toBe('H3');
  });

  it('takes starting values for the employer calculator', () => {
    destroy = mount(host, { show: 'employer', initialBusinessKind: 'public', initialBusinessPayroll: 20_000_000, initialBusinessSpend: 0 });
    expect(control(BUSINESS_KIND).value).toBe('public');
    expect(control(BUSINESS_PAYROLL).value).toBe('20,000,000');
    expect(control(BUSINESS_SPEND).value).toBe('0');
    for (const card of businessCards()) {
      const model = MODELS.find(m => String(m.id) === idsIn(card.querySelector('.uhp-bill-title')!.textContent!)[0])!;
      const owed = employerRate('public', model, 20_000_000) * 20_000_000;
      expect(card.querySelector('.uhp-bill-amount')?.textContent).toBe(`${usd.format(owed)} / year`);
      expect(card.querySelector('.uhp-verdict')?.textContent).toBe(`↑${usd.format(owed)} more than you spend now`);
    }
    // Values the fields would not accept fall back to the example.
    destroy = mount(host, { show: 'employer', initialBusinessKind: 'none' as 'private', initialBusinessPayroll: 0, initialBusinessSpend: -5 });
    expect(control(BUSINESS_KIND).value).toBe('private');
    expect(control(BUSINESS_PAYROLL).value).toBe('1,100,000');
    expect(control(BUSINESS_SPEND).value).toBe('110,000');
  });

  it('names every control and keeps ids unique across mounts', () => {
    destroy = mount(host);
    const otherHost = document.createElement('div');
    document.body.append(otherHost);
    const destroyOther = mount(otherHost);
    try {
      for (const widget of [host, otherHost]) {
        for (const input of widget.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')) {
          const label = widget.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`);
          if (input.type === 'range') expect(input.getAttribute('aria-label')).toBeTruthy();
          else {
            expect(label?.control).toBe(input);
            expect(label?.textContent).toBeTruthy();
          }
        }
        // The size buttons sit in a fieldset whose legend names them.
        expect(widget.querySelector('fieldset legend')?.textContent).toBe('People in your household');
        // The sticky range bar repeats what is on the page, so it is hidden from assistive technology and the tab order.
        const sticky = widget.querySelector<HTMLAnchorElement>('.uhp-sticky')!;
        expect(sticky.getAttribute('aria-hidden')).toBe('true');
        expect(sticky.tabIndex).toBe(-1);
        expect(sticky.getAttribute('href')).toBe(`#${widget.querySelector('.uhp-results')!.id}`);
      }
      expect(new Set([...document.querySelectorAll('[id]')].map(node => node.id)).size)
        .toBe(document.querySelectorAll('[id]').length);
    } finally {
      destroyOther();
      otherHost.remove();
    }
  });
});
