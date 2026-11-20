// @vitest-environment happy-dom
import { incomeAt, SLIDER_POSITIONS } from '../model/income-scale';
import { bill, employerRate, MODELS, payrollTax } from '../model/uhp-model';
import type { EmployerKind } from '../model/uhp-model';
import { mount } from './index';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

let host: HTMLDivElement;
let destroy: () => void;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  destroy?.();
  host.remove();
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
  const cards = [...host.querySelectorAll('.bill')];
  expect(cards).toHaveLength(MODELS.length);
  MODELS.forEach((model, i) => {
    const expected = bill(model, income, size, employer, payroll);
    const card = cards[i];
    expect(card.querySelector('h4')?.textContent).toBe(`Model ${model.id}`);
    expect(card.querySelector('.bill-amount')?.textContent).toBe(`${usd.format(expected.household)} / year`);
    expect([...card.querySelectorAll('dd')].map(node => node.textContent)).toEqual(
      [expected.gross, expected.credit, expected.employer].map(value => usd.format(value)),
    );
  });
}

describe('calculator widget', () => {
  it.each([
    { income: 0, size: 1, employer: 'none' },
    { income: 485_000, size: 3, employer: 'none' },
    { income: 150_000, size: 4, employer: 'public' },
    { income: 85_000, size: 2, employer: 'private', payroll: 8_500_000 },
    { income: 300_000, size: 5, employer: 'private', payroll: 20_000_000 },
    { income: 125_000, size: 2, employer: 'private', payroll: 0 },
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
    expect(host.querySelectorAll('.uhp-plot path.series')).toHaveLength(MODELS.length);
    const sampleRow = [...host.querySelectorAll('figure tbody tr')]
      .find(row => row.firstElementChild?.textContent === usd.format(income));
    expect([...sampleRow!.querySelectorAll('td')].map(cell => cell.textContent)).toEqual(
      MODELS.map(model => usd.format(bill(model, income, size, employer, payroll).household)),
    );
  });

  it('requires a valid private payroll and clears old household results when it is removed', () => {
    destroy = mount(host);
    const prompt = host.querySelector('[role="status"]');
    expect(prompt?.getAttribute('aria-live')).toBe('polite');
    expect(prompt?.textContent).toMatch(/enter your employer’s total yearly payroll/i);
    expect(host.querySelectorAll('.bill')).toHaveLength(0);

    change('Employer’s total yearly payroll ($)', '8500000');
    expectBills(85_000, 2, 'private', 8_500_000);

    for (const invalid of ['', '-1']) {
      change('Employer’s total yearly payroll ($)', invalid);
      expect(prompt?.textContent).toMatch(/enter your employer’s total yearly payroll/i);
      expect(host.querySelectorAll('.bill')).toHaveLength(0);
      expect(host.querySelector('figure')?.hidden).toBe(true);
    }

    change('Who pays your wages', 'public', 'change');
    expectBills(85_000, 2, 'public');
    expect(control<HTMLInputElement>('Employer’s total yearly payroll ($)').disabled).toBe(true);
  });

  it('updates the results for income, slider and household size changes', () => {
    destroy = mount(host, { initialEmployer: 'none' });
    change('Yearly household income ($)', '6100000');
    expectBills(6_100_000, 2, 'none');
    const slider = control<HTMLInputElement>('Adjust yearly household income');
    expect(slider.valueAsNumber).toBe(SLIDER_POSITIONS);
    expect(slider.getAttribute('aria-valuetext')).toBe(usd.format(incomeAt(SLIDER_POSITIONS)));

    change('Adjust yearly household income', '150');
    expect(control<HTMLInputElement>('Yearly household income ($)').valueAsNumber).toBe(incomeAt(150));
    expectBills(incomeAt(150), 2, 'none');

    change('People in your household', '5', 'change');
    expectBills(incomeAt(150), 5, 'none');
    change('Yearly household income ($)', '');
    expect(host.querySelectorAll('.bill')).toHaveLength(0);
  });

  it('uses the private and public employer payroll calculations for every model', () => {
    destroy = mount(host);
    const payroll = 14_500_000;
    change('Total yearly payroll ($)', String(payroll));
    const displayed = () => [...host.querySelectorAll('.calculator-section:last-of-type tbody tr')]
      .map(row => row.querySelector('td')?.textContent);
    expect(displayed()).toEqual(MODELS.map(model => usd.format(payrollTax(payroll, model))));

    change('Type of employer', 'public', 'change');
    expect(displayed()).toEqual(MODELS.map(model => usd.format(employerRate('public', model, payroll) * payroll)));
  });

  it('requires business payroll and updates comparisons and effective rates', () => {
    destroy = mount(host, { initialEmployer: 'none', initialIncome: 0 });
    const status = host.querySelectorAll('[role="status"]');
    const business = host.querySelector('.calculator-section:last-of-type')!;
    expect(business.querySelector('table')).toBeNull();
    change('What you pay for health care now ($ per year, optional)', '0.50');
    expect(host.querySelector('.bill .hint')?.textContent).toBe('$1 less than today');
    expect(status[0].textContent).toContain('Compared with $1');

    change('Total yearly payroll ($)', '1100000');
    change('Current yearly spending on employee health benefits ($, optional)', '0');
    expect(business.querySelector('tbody tr')?.textContent).toContain('5.24%');
    expect(business.querySelector('tbody tr')?.textContent).toContain('$57,600 more than today');
    expect(business.querySelector('[role="status"]')?.textContent).toContain('Compared with $0');

    change('Total yearly payroll ($)', '-1');
    expect(business.querySelector('table')).toBeNull();
    expect(business.querySelector('[role="status"]')?.textContent).toContain('Enter a valid total yearly payroll');
  });

  it('looks up a separate chart income with the same calculation assumptions', () => {
    destroy = mount(host, { initialEmployer: 'public' });
    change('Look up yearly income on the chart ($)', '140123');
    const readout = host.querySelector('.chart-inspection')?.textContent;
    expect(readout).toContain('$140,123');
    for (const model of MODELS) {
      expect(readout).toContain(`Model ${model.id} ${usd.format(bill(model, 140_123, 2, 'public').household)}.`);
    }
    expectBills(85_000, 2, 'public');
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
    } finally {
      destroyOther();
      otherHost.remove();
    }
  });
});
