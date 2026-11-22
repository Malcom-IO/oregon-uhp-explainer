// @vitest-environment happy-dom
import { incomeAt, SLIDER_POSITIONS } from '../model/income-scale';
import { bill, employerRate, MODELS, payrollTax } from '../model/uhp-model';
import type { EmployerKind } from '../model/uhp-model';
import { ANNOUNCE_DELAY, ANNOUNCE_LINGER, parseAmount } from './dom';
import { mount } from './index';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const pct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1,
});
const words = new Intl.ListFormat('en-US', { style: 'long', type: 'conjunction' });
const LOOKUP = 'Look up yearly income on the chart ($, optional)';
const BAD_AMOUNT = 'Enter a dollar amount in digits, such as 85,000 or 85000.50.';
const named = (label: string, message: string) => `${label}: ${message}`;

const INCOME = 'Yearly household income ($, required)';
const PAYROLL = 'Employer’s total yearly payroll ($, required)';
const CURRENT_COST = 'What you pay for health care now ($ per year, optional)';
const BUSINESS_PAYROLL = 'Total yearly payroll ($, required)';
const BUSINESS_SPEND = 'Current yearly spending on employee health benefits ($, optional)';

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

function expectBills(income: number, size: number, employer: EmployerKind, payroll?: number) {
  const cards = [...host.querySelectorAll('.uhp-bill')];
  expect(cards).toHaveLength(MODELS.length);
  MODELS.forEach((model, i) => {
    const expected = bill(model, income, size, employer, payroll);
    const card = cards[i];
    expect(card.querySelector('.uhp-bill-title')?.textContent).toBe(`Model ${model.id}`);
    expect(card.querySelector('.uhp-bill-amount')?.textContent).toBe(`${usd.format(expected.household)} / year`);
    expect([...card.querySelectorAll('dd')].map(node => node.textContent)).toEqual(
      [expected.gross, expected.credit, expected.employer].map(value => usd.format(value)),
    );
  });
}

function expectNoResults(prompt: RegExp) {
  expect(host.querySelector('.uhp-result-status')?.textContent).toMatch(prompt);
  expect(host.querySelectorAll('.uhp-bill')).toHaveLength(0);
  expect(host.querySelector('figure')?.hidden).toBe(true);
  // Nothing computed earlier may linger in the hidden chart.
  expect(host.querySelector('figure')?.textContent).not.toMatch(/\$\d/);
  expect(host.querySelector('.uhp-plot svg')?.childElementCount).toBe(0);
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
  it.each([
    { income: 0, size: 1, employer: 'none' },
    { income: 485_000, size: 3, employer: 'none' },
    { income: 150_000, size: 4, employer: 'public' },
    { income: 85_000, size: 2, employer: 'private', payroll: 8_500_000 },
    { income: 300_000, size: 5, employer: 'private', payroll: 20_000_000 },
    { income: 125_000, size: 2, employer: 'private', payroll: 400_000 },
  ] as const)('matches all four bill amounts for all models at $income ($employer)', ({
    income, size, employer, ...options
  }) => {
    const payroll = 'payroll' in options ? options.payroll : undefined;
    destroy = mount(host, {
      initialIncome: income,
      initialHouseholdSize: size,
      initialEmployer: employer,
      initialPayroll: payroll,
    });
    expectBills(income, size, employer, payroll);
    expect(host.querySelectorAll('.uhp-plot path.uhp-series')).toHaveLength(MODELS.length);
    const sampleRow = [...host.querySelectorAll('figure tbody tr')]
      .find(row => row.firstElementChild?.textContent === usd.format(income));
    expect([...sampleRow!.querySelectorAll('td')].map(cell => cell.textContent)).toEqual(
      MODELS.map(model => usd.format(bill(model, income, size, employer, payroll).household)),
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

    // The "your income" marker: one dot per model at the bill shown on its card.
    const dots = [...host.querySelectorAll('.uhp-plot .uhp-dot')].slice(0, MODELS.length);
    expect(dots).toHaveLength(MODELS.length);
    dots.forEach((dot, i) => {
      expect(Number(dot.getAttribute('cx'))).toBeCloseTo(scale.x(income), 6);
      expect(Number(dot.getAttribute('cy'))).toBeCloseTo(scale.y(amounts[i]), 6);
    });

    // The "what you pay now" line.
    const costLine = host.querySelector('.uhp-plot .uhp-cost-line')!;
    expect(Number(costLine.getAttribute('y1'))).toBeCloseTo(scale.y(currentCost), 6);
    expect(Number(costLine.getAttribute('y2'))).toBeCloseTo(scale.y(currentCost), 6);
    expect(host.querySelector('figure details .uhp-hint')?.textContent).toBe(
      `Current yearly health care cost for comparison is ${usd.format(currentCost)}.`,
    );

    // The legend lists the models in the order of the lines, then the comparison line.
    const legend = [...host.querySelectorAll('.uhp-chart-legend li')];
    expect(legend.map(item => item.textContent)).toEqual([...MODELS.map(model => `Model ${model.id}`), 'What you pay now']);
    expect(legend.map(item => item.querySelector('line')?.getAttribute('class'))).toEqual(
      [...MODELS.map((_, i) => `uhp-series uhp-series-${i + 1}`), 'uhp-cost-line'],
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

    // Looking up another income uses the same household size, employer and payroll.
    change(LOOKUP, '123,456');
    const readout = host.querySelector('.uhp-chart-inspection')?.textContent;
    expect(readout).toBe(['At $123,456 in yearly income:', ...MODELS.map(model =>
      `Model ${model.id} ${usd.format(bill(model, 123_456, size, employer, payroll).household)}.`)].join(' '));
  });

  it('labels each card, option and count from the data', () => {
    destroy = mount(host, { initialPayroll: 8_500_000 });
    expect(host.querySelector('.uhp-intro')?.textContent).toContain(`Board’s ${MODELS.length} draft financing models`);
    const cards = [...host.querySelectorAll('.uhp-bill')];
    cards.forEach((card, i) => {
      expect(card.classList.contains(`uhp-series-${i + 1}`)).toBe(true);
      expect(card.querySelector('.uhp-bill-name')?.textContent).toBe(MODELS[i].name);
      expect([...card.querySelectorAll('dt')].map(node => node.textContent)).toEqual([
        'Before credit', 'Worker credit used', 'Payroll tax paid by your employer on your wages',
      ]);
    });
    const sizes = [...control<HTMLSelectElement>('People in your household').options];
    expect(sizes.map(option => option.text)).toEqual(sizes.map(option => option.value));
    expect(sizes.map(option => option.value)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('keeps one table row per income when the income has cents', () => {
    destroy = mount(host, { initialEmployer: 'none', initialIncome: 50_000.4 });
    const labels = [...host.querySelectorAll('figure tbody th')].map(node => node.textContent);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).toContain('$50,000');
  });

  it('summarizes the lowest and highest bill and compares each card with current spending', () => {
    const [income, size, payroll] = [85_000, 2, 8_500_000];
    destroy = mount(host, { initialIncome: income, initialHouseholdSize: size, initialPayroll: payroll });
    const bills = MODELS.map(model => bill(model, income, size, 'private', payroll));
    const totals = bills.map(result => result.household);
    expect(Math.min(...totals)).not.toBe(Math.max(...totals));
    // A current cost between the lowest and highest bill, so some models cost more and some less.
    const currentCost = Math.round((Math.min(...totals) + Math.max(...totals)) / 2);
    change(CURRENT_COST, String(currentCost));
    expect(host.querySelector('.uhp-result-status')?.textContent).toBe(
      `Estimated household contribution across the ${MODELS.length} models is ` +
      `${usd.format(Math.min(...totals))} to ${usd.format(Math.max(...totals))} per year.`,
    );

    // The credit makes the bill differ from the amount before credit, so the two cannot be confused.
    expect(bills.some(result => Math.round(result.gross) !== Math.round(result.household))).toBe(true);
    const shown = [...host.querySelectorAll('.uhp-bill-difference')].map(node => node.textContent);
    expect(shown).toEqual(bills.map(result => {
      const delta = Math.round(result.household) - currentCost;
      if (delta === 0) return 'Same as today';
      return `${usd.format(Math.abs(delta))} ${delta > 0 ? 'more' : 'less'} than today`;
    }));
    expect(shown.some(text => text?.includes('more'))).toBe(true);
    expect(shown.some(text => text?.includes('less'))).toBe(true);
  });

  it('requires a private payroll above zero and clears old results when it is removed', () => {
    destroy = mount(host);
    const field = control<HTMLInputElement>(PAYROLL);
    const fieldError = () => host.querySelector(`#${field.id}-error`) as HTMLElement;
    expectNoResults(/enter your employer’s total yearly payroll/i);
    expect(field.required).toBe(true);
    expect(fieldError().hidden).toBe(false);
    expect(field.getAttribute('aria-describedby')).toContain(fieldError().id);
    expect(field.hasAttribute('aria-invalid')).toBe(false);

    change(PAYROLL, '$8,500,000');
    expectBills(85_000, 2, 'private', 8_500_000);
    expect(fieldError().hidden).toBe(true);

    for (const invalid of ['', '-1', 'abc', '0', '0.0', ' ']) {
      change(PAYROLL, invalid);
      expectNoResults(/enter your employer’s total yearly payroll/i);
      expect(fieldError().hidden).toBe(false);
    }
    expect(field.getAttribute('aria-invalid')).toBeNull();
    change(PAYROLL, '0');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(fieldError().textContent).toBe('Enter a payroll above $0.');

    change('Who pays your wages', 'public', 'change');
    expectBills(85_000, 2, 'public');
    expect(field.disabled).toBe(true);
  });

  it('explains the payroll tax rate behind the worker credit', () => {
    destroy = mount(host, { initialPayroll: 8_500_000 });
    const note = () => host.querySelector('.uhp-employer-note') as HTMLElement;
    const rates = (kind: EmployerKind, payroll?: number) =>
      [...new Set(MODELS.map(model => pct.format(employerRate(kind, model, payroll))))];

    for (const rate of rates('private', 8_500_000)) expect(note().textContent).toContain(rate);
    expect(note().textContent).toMatch(/^On that payroll the tax works out to /);

    // Where the models differ, each rate is attached to its own models.
    const inWords = (kind: EmployerKind, payroll?: number) => {
      const groups = new Map<string, string[]>();
      for (const model of MODELS) {
        const rate = pct.format(employerRate(kind, model, payroll));
        groups.set(rate, [...(groups.get(rate) ?? []), String(model.id)]);
      }
      expect(groups.size).toBeGreaterThan(1);
      return words.format([...groups].map(([rate, ids]) =>
        `${rate} of wages under ${ids.length > 1 ? 'Models' : 'Model'} ${words.format(ids)}`));
    };
    change(PAYROLL, '20,000,000');
    expect(note().textContent).toBe(`On that payroll the tax works out to ${inWords('private', 20_000_000)}.`);
    const first = pct.format(employerRate('private', MODELS[0], 20_000_000));
    expect(note().textContent).toContain(`${first} of wages under Model ${MODELS[0].id} `);

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

    change('Who pays your wages', 'public', 'change');
    expect(note().textContent).toBe(
      `Public employers would pay the top payroll rate from the first dollar: ${inWords('public')}.`,
    );

    change('Who pays your wages', 'none', 'change');
    expect(note().textContent).toMatch(/no worker credit/);

    change('Who pays your wages', 'private', 'change');
    change(PAYROLL, '');
    expect(note().hidden).toBe(true);
    expect(note().textContent).toBe('');
  });

  it('updates the results for income, slider and household size changes', () => {
    destroy = mount(host, { initialEmployer: 'none' });
    const slider = control<HTMLInputElement>('Adjust yearly household income');

    change(INCOME, '6,100,000');
    expectBills(6_100_000, 2, 'none');
    expect(slider.valueAsNumber).toBe(SLIDER_POSITIONS);
    // The slider stops at its top position, but it announces the income the results use.
    expect(slider.getAttribute('aria-valuetext')).toBe('$6,100,000');

    change(INCOME, '85500');
    expect(slider.getAttribute('aria-valuetext')).toBe('$85,500');
    expectBills(85_500, 2, 'none');

    change('Adjust yearly household income', '150');
    expect(control<HTMLInputElement>(INCOME).value).toBe(String(incomeAt(150)));
    expect(slider.getAttribute('aria-valuetext')).toBe(usd.format(incomeAt(150)));
    expectBills(incomeAt(150), 2, 'none');

    change('People in your household', '5', 'change');
    expectBills(incomeAt(150), 5, 'none');
    for (const invalid of ['', '-5', 'lots']) {
      change(INCOME, invalid);
      expectNoResults(/enter a yearly household income/i);
    }
  });

  it('leaves what the reader typed in the field', () => {
    destroy = mount(host, { initialEmployer: 'none' });
    for (const typed of ['8', '85', '85,4', '85,43', '85,432', '$85,432.10']) {
      change(INCOME, typed);
      expect(control<HTMLInputElement>(INCOME).value).toBe(typed);
    }
    expectBills(85_432.1, 2, 'none');
  });

  it('announces a result once typing pauses, not on every keystroke', () => {
    vi.useFakeTimers();
    destroy = mount(host, { initialEmployer: 'private', initialPayroll: 8_500_000 });
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
      `Estimated household contribution across the ${MODELS.length} models is ` +
      `${usd.format(Math.min(...totals))} to ${usd.format(Math.max(...totals))} per year. ` +
      'Yearly income $90,500, household size 2. A private employer. Employer payroll $8,500,000.',
    );
    // The rate note is said when the payroll changes, not again with every income.
    change(PAYROLL, '20,000,000');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(host.querySelector('.uhp-employer-note')!.textContent).toMatch(/^On that payroll/);
    expect(live.textContent).toContain(host.querySelector('.uhp-employer-note')!.textContent);
    change(INCOME, '91,000');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toContain('Yearly income $91,000');
    expect(live.textContent).not.toContain('On that payroll');
    change(PAYROLL, '8,500,000');
    change(INCOME, '90500');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toContain('Yearly income $90,500');

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
    // A second rejected field is announced too, and so is the first once the second is fixed.
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
    change(CURRENT_COST, '4,700');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toContain('Compared with $4,700');
  });

  it('uses the private and public employer payroll calculations for every model', () => {
    destroy = mount(host);
    const payroll = 14_500_000;
    change(BUSINESS_PAYROLL, String(payroll));
    const displayed = () => [...host.querySelectorAll('.uhp-business tbody tr')]
      .map(row => row.querySelector('td')?.textContent);
    expect(displayed()).toEqual(MODELS.map(model => usd.format(payrollTax(payroll, model))));

    change('Type of employer', 'public', 'change');
    expect(displayed()).toEqual(MODELS.map(model => usd.format(employerRate('public', model, payroll) * payroll)));
  });

  it('requires business payroll and updates comparisons and effective rates', () => {
    vi.useFakeTimers();
    destroy = mount(host, { initialEmployer: 'none', initialIncome: 0 });
    const business = host.querySelector('.uhp-business')!;
    const live = business.querySelector('[role="status"]')!;
    const payrollError = () => business.querySelector(`#${control(BUSINESS_PAYROLL).id}-error`) as HTMLElement;
    expect(business.querySelector('table')).toBeNull();
    expect(payrollError().textContent).toBe('Enter a total yearly payroll to see results.');
    change(CURRENT_COST, '0.50');
    expect(host.querySelector('.uhp-bill-difference')?.textContent).toBe('$1 less than today');

    change(BUSINESS_PAYROLL, '1,100,000');
    change(BUSINESS_SPEND, '0');
    const first = business.querySelector('tbody tr')!;
    const tax = payrollTax(1_100_000, MODELS[0]);
    expect(tax).toBeGreaterThan(0);
    expect([...first.querySelectorAll('td')].map(cell => cell.textContent)).toEqual([
      usd.format(tax), pct.format(tax / 1_100_000), `${usd.format(tax)} more than today`,
    ]);
    expect(business.querySelector('caption')?.textContent).toBe('Estimated yearly employer payroll tax');
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toBe(['Estimated yearly payroll tax.', ...MODELS.map(model =>
      `Model ${model.id} ${usd.format(payrollTax(1_100_000, model))}.`), 'Compared with $0 in yearly spending today.'].join(' '));

    // Every row has its own model's tax and share of payroll, for both kinds of employer.
    for (const kind of ['private', 'public'] as const) {
      change('Type of employer', kind, 'change');
      for (const payroll of [1_100_000, 14_500_000, 500_100]) {
        change(BUSINESS_PAYROLL, String(payroll));
        const shown = [...business.querySelectorAll('tbody tr')]
          .map(row => [...row.querySelectorAll('td')].slice(0, 2).map(cell => cell.textContent));
        expect(shown).toEqual(MODELS.map(model => {
          const owed = kind === 'public' ? employerRate('public', model, payroll) * payroll : payrollTax(payroll, model);
          const share = owed / payroll;
          return [usd.format(owed), share > 0 && share < 0.00005 ? 'less than 0.01%' : pct.format(share)];
        }));
      }
    }
    expect(MODELS.some(model => payrollTax(500_100, model) > 0)).toBe(true);

    // The announcement carries each model's own amount, at a payroll where the models differ.
    change('Type of employer', 'private', 'change');
    change(BUSINESS_PAYROLL, '20,000,000');
    const owed = MODELS.map(model => payrollTax(20_000_000, model));
    expect(new Set(owed.map(amount => usd.format(amount))).size).toBeGreaterThan(1);
    vi.advanceTimersByTime(ANNOUNCE_DELAY);
    expect(live.textContent).toBe(['Estimated yearly payroll tax.', ...MODELS.map((model, i) =>
      `Model ${model.id} ${usd.format(owed[i])}.`), 'Compared with $0 in yearly spending today.'].join(' '));

    for (const [typed, heard] of [['-1', BAD_AMOUNT], ['0', 'Enter a payroll above $0.']]) {
      change(BUSINESS_PAYROLL, typed);
      expect(business.querySelector('table')).toBeNull();
      expect(payrollError().textContent).toBe(heard);
      vi.advanceTimersByTime(ANNOUNCE_DELAY);
      expect(live.textContent).toBe(named(BUSINESS_PAYROLL, heard));
    }
  });

  it('looks up a separate chart income with the same calculation assumptions', () => {
    destroy = mount(host, { initialEmployer: 'public' });
    change(LOOKUP, '140,123');
    const readout = () => host.querySelector('.uhp-chart-inspection')?.textContent;
    expect(readout()).toContain('$140,123');
    for (const model of MODELS) {
      expect(readout()).toContain(`Model ${model.id} ${usd.format(bill(model, 140_123, 2, 'public').household)}.`);
    }
    expectBills(85_000, 2, 'public');

    // Past the end of the axis, or not an amount: fall back to the reader's own income.
    const lookup = control<HTMLInputElement>(LOOKUP);
    const lookupError = () => host.querySelector(`#${lookup.id}-error`) as HTMLElement;
    expect(lookupError().hidden).toBe(true);
    for (const invalid of ['99999999', 'abc', '250,000.01']) {
      change(LOOKUP, invalid);
      expect(lookup.getAttribute('aria-invalid')).toBe('true');
      expect(lookupError().hidden).toBe(false);
      expect(lookupError().textContent).toBe(
        'Enter a dollar amount from $0 to $250,000. The figures shown here are for your own income.',
      );
      expect(lookup.getAttribute('aria-describedby')).toBe(lookupError().id);
      expect(readout()).toContain('At $85,000 in yearly income');
    }
    change(LOOKUP, '250,000');
    expect(lookupError().hidden).toBe(true);
    expect(lookup.hasAttribute('aria-invalid')).toBe(false);
    expect(readout()).toContain('At $250,000 in yearly income');
  });

  it('falls back to defaults for options a host passes out of range', () => {
    destroy = mount(host, {
      initialHouseholdSize: 9,
      initialEmployer: 'union' as EmployerKind,
      initialIncome: -4,
      initialPayroll: 0,
      headingLevel: 7 as 1,
      theme: 'sepia' as 'auto',
    });
    expect(control<HTMLSelectElement>('People in your household').value).toBe('2');
    expect(control<HTMLSelectElement>('Who pays your wages').value).toBe('private');
    expect(control<HTMLInputElement>(INCOME).value).toBe('85000');
    expect(control<HTMLInputElement>(PAYROLL).value).toBe('');
    expect(host.querySelector('.uhp-title')?.tagName).toBe('H2');
    expect(host.querySelector<HTMLElement>('.oregon-uhp')?.dataset['uhpTheme']).toBeUndefined();

    for (const initialIncome of [1e21, 1e-7, Number.NaN, Infinity]) {
      destroy = mount(host, { initialIncome, initialEmployer: 'none' });
      expect(control<HTMLInputElement>(INCOME).value).toBe('85000');
      expectBills(85_000, 2, 'none');
    }
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

  it('associates each control with its own visible label across mounts', () => {
    destroy = mount(host);
    const otherHost = document.createElement('div');
    document.body.append(otherHost);
    const destroyOther = mount(otherHost);
    try {
      for (const widget of [host, otherHost]) {
        const controls = widget.querySelectorAll('input, select');
        for (const input of controls) {
          const label = widget.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`);
          expect(label?.control).toBe(input);
          expect(label?.textContent).toBeTruthy();
        }
      }
      expect(new Set([...document.querySelectorAll('[id]')].map(node => node.id)).size)
        .toBe(document.querySelectorAll('[id]').length);
    } finally {
      destroyOther();
      otherHost.remove();
    }
  });
});
