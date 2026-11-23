// @vitest-environment happy-dom
import page from '../../index.html?raw';
import comparePage from '../../compare/index.html?raw';
import { HOUSEHOLD_EXAMPLES, HOUSEHOLD_ROWS } from '../model/uhp-households';
import { MODELS, SCENARIOS, payrollTax } from '../model/uhp-model';
import {
  BEST,
  BOARD,
  BRIDGE,
  LOW,
  POPULATION_2032,
  PRIVATE_TODAY,
  RAISED_IN_OREGON,
  REVENUE_TARGET,
  SCENARIOS_STATEWIDE,
} from '../model/uhp-statewide';
import { blocks, markers, renderBlocks } from './blocks';

// The spec formats numbers on its own, so a slip in the page's formatters fails here.
const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd = (value: number) => dollars.format(Math.round(value));
const percent = (value: number, digits = 1) => `${Number((value * 100).toFixed(digits))}%`;
const billions = (value: number) => `$${value.toFixed(1)}B`;
const MODEL_HEADS = MODELS.map((m) => `Model ${m.id}`);

function render(name: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = blocks[name]();
  return host;
}

const text = (node: Element | null | undefined) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
const texts = (root: ParentNode, selector: string) => [...root.querySelectorAll(selector)].map(text);

/** Body rows of a table as text: the row header, then each cell. */
function bodyRows(table: Element): string[][] {
  return [...table.querySelectorAll('tbody tr')].map((row) => [...row.children].map(text));
}

/** A dollar cell as the page marks it against what the household pays today. */
function compared(value: number, now: number, slack: number): string {
  const mark = value < now - slack ? '↓Less than today: ' : value > now + slack ? '↑More than today: ' : '';
  return `${mark}${usd(value)}`;
}

describe('markers', () => {
  it('has a renderer for every marker in the pages, and a marker for every renderer', () => {
    // Each page uses a marker once; together they use every renderer.
    for (const html of [page, comparePage]) expect(new Set(markers(html)).size).toBe(markers(html).length);
    const inPages = new Set([...markers(page), ...markers(comparePage)]);
    expect([...inPages].sort()).toEqual(Object.keys(blocks).sort());
  });

  it('replaces every marker', () => {
    const built = renderBlocks(page) + renderBlocks(comparePage);
    expect(markers(built)).toEqual([]);
    for (const name of Object.keys(blocks)) expect(built, name).toContain(blocks[name]());
  });

  it('refuses a marker with no renderer', () => {
    expect(() => renderBlocks('<p><!-- uhp:no-such-block --></p>')).toThrow(/uhp:no-such-block/);
  });
});

describe('every table', () => {
  const host = document.createElement('div');
  host.innerHTML = renderBlocks(/<body>([\s\S]*)<\/body>/.exec(page)![1]);
  const tables = [...host.querySelectorAll('table')];

  it('has a caption, column and row headers with scope, and a region that scrolls', () => {
    expect(tables).toHaveLength(8);
    for (const table of tables) {
      const caption = table.querySelector('caption');
      expect(text(caption)).not.toBe('');
      for (const th of table.querySelectorAll('thead th')) expect(th.getAttribute('scope')).toBe('col');
      for (const row of table.querySelectorAll('tbody tr')) {
        expect(row.firstElementChild?.tagName).toBe('TH');
        expect(row.firstElementChild?.getAttribute('scope')).toBe('row');
        expect(row.children).toHaveLength(table.querySelectorAll('thead th').length);
      }
      const region = table.parentElement!;
      expect(region.className).toBe('xp-scroll');
      expect(region.getAttribute('role')).toBe('region');
      expect(region.getAttribute('tabindex')).toBe('0');
      expect(region.getAttribute('aria-labelledby')).toBe(caption!.id);
    }
  });
});

describe('the five models', () => {
  it('gives each model a card with its design and five measures', () => {
    const cards = [...render('model-cards').querySelectorAll('.xp-model')];
    expect(cards).toHaveLength(MODELS.length);
    cards.forEach((card, i) => {
      const m = MODELS[i];
      const rates = m.household.brackets.map((b) => percent(b.rate, 2));
      expect(text(card.querySelector('h4'))).toBe(`Model ${m.id} ${m.name}`);
      expect(text(card.querySelector('p'))).toBe(m.blurb);
      expect(texts(card, '.xp-chips li')).toEqual([
        m.household.creditShare ? 'Worker credit' : 'No worker credit',
        `First ${usd(m.household.brackets[0].from.bySize[4])} exempt`,
        rates.length === 1 ? `One rate: ${rates[0]}` : `Rates: ${rates.join(', ')}`,
      ]);
      expect(texts(card, '.xp-metric').map((line) => line.replace(/\s+/g, ' '))).toEqual([
        `Tax filers who pay nothing${Math.round(m.published!.returnsOwingNothing * 100)} of 100`,
        `Top rate, on the highest slice of income${rates[rates.length - 1]}`,
        `Household contribution, middle fifth${percent(m.published!.middleFifthRate)} of income`,
        `With the payroll tax, middle fifth${percent(m.published!.combinedByFifth[2])} of income`,
        `Share paid by the top 1%${percent(m.published!.top1Share, 0)}`,
      ]);
    });
  });

  it('prints the figures the Board published', () => {
    const cards = render('model-cards');
    expect(texts(cards, '.xp-metric-value').slice(0, 5)).toEqual(['55 of 100', '13.5%', '2% of income', '8.1% of income', '31%']);
    expect(texts(cards, '.xp-chips li').slice(9, 12)).toEqual(['Worker credit', 'First $45,540 exempt', 'Rates: 3%, 9%, 12%, 14.3%']);
  });

  it('draws each bar to the length of its figure', () => {
    const bars = [...render('model-cards').querySelectorAll<HTMLElement>('.xp-model:first-child .xp-track span')];
    const m = MODELS[0].published!;
    expect(bars.map((bar) => bar.getAttribute('style'))).toEqual([
      `width:${(m.returnsOwingNothing * 100).toFixed(2)}%`,
      `width:${((0.135 / 0.15) * 100).toFixed(2)}%`,
      `width:${((m.middleFifthRate / 0.03) * 100).toFixed(2)}%`,
      `width:${((m.combinedByFifth[2] / 0.12) * 100).toFixed(2)}%`,
      `width:${((m.top1Share / 0.45) * 100).toFixed(2)}%`,
    ]);
  });

  it('lists every model in the table', () => {
    const table = render('models-table').querySelector('table')!;
    expect(texts(table, 'thead th')).toEqual([
      'Model', 'Employer payroll tax', 'Credit for workers', 'Income exempt', 'Rates above the exemption',
      'Top household rate', 'Tax returns owing $0', 'Middle-income average', 'Paid by top 1%',
    ]);
    expect(bodyRows(table)).toEqual(MODELS.map((m) => {
      const rates = m.household.brackets.map((b) => b.rate);
      return [
        String(m.id),
        m.payroll.summary,
        m.household.creditShare ? '50%' : 'None',
        m.household.exemption,
        rates.length === 1 ? 'One' : String(rates.length),
        percent(rates[rates.length - 1], 2),
        percent(m.published!.returnsOwingNothing),
        percent(m.published!.middleFifthRate),
        percent(m.published!.top1Share),
      ];
    }));
    expect(bodyRows(table)[3]).toEqual([
      '4', '9.6% above $500,000, 14% above $10 million', '50%', '138% FPL', '4', '14.3%', '64.9%', '0.8%', '39.9%',
    ]);
  });

  it('shows the combined rate for each fifth of incomes', () => {
    const table = render('fifths-table').querySelector('table')!;
    const fifths = ['Lowest fifth', 'Second fifth', 'Middle fifth', 'Fourth fifth', 'Top fifth'];
    expect(texts(table, 'thead th')).toEqual(['Income group', ...MODEL_HEADS]);
    expect(bodyRows(table)).toEqual(
      fifths.map((fifth, i) => [fifth, ...MODELS.map((m) => percent(m.published!.combinedByFifth[i]))]),
    );
    expect(bodyRows(table)[0]).toEqual(['Lowest fifth', '7.6%', '9.7%', '9.7%', '9.7%', '9.7%']);
    expect(table.querySelector('tbody td .xp-cellbar span')?.getAttribute('style')).toBe(`width:${((0.076 / 0.14) * 100).toFixed(2)}%`);
  });
});

describe('households', () => {
  it('runs the twelve example households through every model', () => {
    const table = render('households-table').querySelector('table')!;
    expect(texts(table, 'thead th')).toEqual(['Household', 'Pays today', ...MODEL_HEADS]);
    expect(HOUSEHOLD_ROWS).toHaveLength(12);
    expect(bodyRows(table)).toEqual(HOUSEHOLD_ROWS.map((row, i) => [
      `${HOUSEHOLD_EXAMPLES[i].who}, ${usd(HOUSEHOLD_EXAMPLES[i].income)}${HOUSEHOLD_EXAMPLES[i].detail}`,
      usd(HOUSEHOLD_EXAMPLES[i].now),
      ...row.models.map((v) => compared(v, row.now, 0.5)),
    ]));
    // The couple of Table S2, to the dollar.
    expect(bodyRows(table)[3]).toEqual([
      'Couple, private employer, $85,0002 people, the median for two',
      '$4,700', '↓Less than today: $2,032', '↓Less than today: $1,427', '↓Less than today: $3,208',
      '↓Less than today: $557', '↓Less than today: $2,263',
    ]);
  });

  it('marks less and more in words as well as with an arrow', () => {
    const table = render('households-table');
    const less = table.querySelector('td.xp-less')!;
    const more = table.querySelector('td.xp-more')!;
    expect(less.querySelector('[aria-hidden="true"]')?.textContent).toBe('↓');
    expect(less.querySelector('.xp-vh')?.textContent).toBe('Less than today: ');
    expect(more.querySelector('[aria-hidden="true"]')?.textContent).toBe('↑');
    expect(more.querySelector('.xp-vh')?.textContent).toBe('More than today: ');
  });

  it("prints the Board's examples as the Board printed them", () => {
    const examples = [...render('board-examples').querySelectorAll<HTMLElement>('.xp-example')];
    expect(examples.map((e) => e.dataset['example'])).toEqual(SCENARIOS.map((s) => s.id));
    examples.forEach((example, i) => {
      const s = SCENARIOS[i];
      expect(example.dataset['tab']).toBe(s.tab);
      expect(text(example.querySelector('h3'))).toBe(s.tab);
      expect(texts(example, 'p')).toEqual([s.who, s.today]);
      const table = example.querySelector('table')!;
      expect(text(table.querySelector('caption'))).toBe(`Board example figures: ${s.tab}`);
      expect(texts(table, 'thead th')).toEqual([
        s.id === 'medicare' ? 'Income, not counting Social Security' : 'Income', 'Pays today', ...MODEL_HEADS,
      ]);
      expect(bodyRows(table)).toEqual(
        s.rows.map((row) => [usd(row.income), usd(row.now), ...row.models.map((v) => compared(v, row.now, 0))]),
      );
    });
    // Table S1 at $90,000, with the cell the report prints as $3,699.
    expect(bodyRows(examples[0].querySelector('table')!)[2]).toEqual([
      '$90,000', '$6,900', '↑More than today: $7,841', '↑More than today: $6,999', '↓Less than today: $4,466',
      '↓Less than today: $6,462', '↓Less than today: $3,699',
    ]);
  });
});

describe('employers', () => {
  it('shows the payroll tax at five payroll sizes', () => {
    const table = render('business-table').querySelector('table')!;
    const cell = (tax: number, payroll: number) => `${usd(tax)} (${((tax / payroll) * 100).toFixed(1)}%)`;
    expect(texts(table, 'thead th')).toEqual(["Private employer's yearly payroll", 'Model 1', 'Models 2 to 5']);
    expect(bodyRows(table)).toEqual(
      [420_000, 1_100_000, 8_500_000, 20_000_000, 190_000_000].map((payroll) => [
        usd(payroll),
        cell(payrollTax(payroll, MODELS[0]), payroll),
        cell(payrollTax(payroll, MODELS[1]), payroll),
      ]),
    );
    expect(bodyRows(table)).toEqual([
      ['$420,000', '$0 (0.0%)', '$0 (0.0%)'],
      ['$1,100,000', '$57,600 (5.2%)', '$57,600 (5.2%)'],
      ['$8,500,000', '$768,000 (9.0%)', '$768,000 (9.0%)'],
      ['$20,000,000', '$1,872,000 (9.4%)', '$2,312,000 (11.6%)'],
      ['$190,000,000', '$18,192,000 (9.6%)', '$26,112,000 (13.7%)'],
    ]);
    // Models 3 to 5 share Model 2's tiers, which is what the second column's heading says.
    for (const m of MODELS.slice(2)) expect(payrollTax(20_000_000, m)).toBe(payrollTax(20_000_000, MODELS[1]));
  });
});

describe('the statewide math', () => {
  it('sets the two published estimates side by side', () => {
    const cards = [...render('statewide-estimates').querySelectorAll('.xp-est-card')];
    const inputs = [
      { name: "Milliman's best estimate", current: BEST.statusQuo, plan: BEST.plan, taxes: REVENUE_TARGET.best, now: PRIVATE_TODAY.best },
      { name: "The board's assumptions", current: LOW.statusQuo, plan: BOARD.plan, taxes: REVENUE_TARGET.board, now: PRIVATE_TODAY.board },
    ];
    expect(cards).toHaveLength(2);
    cards.forEach((card, i) => {
      const e = inputs[i];
      const each = dollars.format(Math.round((e.taxes * 1e9) / POPULATION_2032 / 100) * 100);
      expect(text(card.querySelector('.xp-est-name'))).toBe(e.name);
      expect(texts(card, '.xp-est-value')).toEqual([billions(e.current), billions(e.plan)]);
      expect(text(card.querySelector('p.xp-vh'))).toBe(`Current system ${billions(e.current)} a year in 2032; the plan ${billions(e.plan)}.`);
      expect(texts(card, 'dd')).toEqual([`−${billions(e.now)}`, `+${billions(e.taxes)}`]);
      expect(texts(card, 'dt small')[1]).toBe(`about ${each} per Oregonian`);
      expect(text(card.querySelector('.xp-est-big'))).toBe(billions(e.now - e.taxes));
      expect(text(card.querySelector('.xp-est-saves'))).toContain(`about ${percent((e.now - e.taxes) / e.now, 0)} our math`);
      expect([...card.querySelectorAll('.xp-est-bars .xp-track span')].map((bar) => bar.getAttribute('style'))).toEqual([
        `width:${((e.current / 80) * 100).toFixed(2)}%`,
        `width:${((e.plan / 80) * 100).toFixed(2)}%`,
      ]);
    });
    expect(text(cards[0])).toContain('$78.3B');
    expect(text(cards[0])).toContain('$77.7B');
    expect(text(cards[0])).toContain('about $8,800 per Oregonian');
    expect(texts(cards[1], '.xp-est-big')).toEqual(['$6.6B']);
    expect(text(cards[1])).toContain('about 18% our math');
  });

  it('walks from the current system to the plan', () => {
    const items = [...render('bridge').querySelectorAll('li')];
    expect(items).toHaveLength(BRIDGE.length);
    items.forEach((item, i) => {
      const step = BRIDGE[i];
      const value = step.total !== undefined
        ? billions(step.total)
        : `${step.delta! < 0 ? '−' : '+'}$${Math.abs(step.delta!).toFixed(1)}B`;
      expect(text(item.querySelector('.xp-bridge-value'))).toBe(value);
      expect(text(item.querySelector('.xp-bridge-label'))).toBe(
        step.label + (step.conditional ? ' (saves cost only if provider rates are reset)' : ''),
      );
      expect(item.classList.contains('xp-total')).toBe(step.total !== undefined);
      const bar = item.querySelector('.xp-track span');
      if (step.delta === undefined) expect(bar).toBeNull();
      else {
        expect(bar!.getAttribute('style')).toBe(`width:${((Math.abs(step.delta) / 8) * 100).toFixed(2)}%`);
        expect(bar!.className).toBe(`${step.delta > 0 ? 'xp-up' : 'xp-down'}${step.conditional ? ' xp-cond' : ''}`);
      }
    });
    expect(texts(render('bridge'), '.xp-bridge-value')).toEqual([
      '$78.3B', '+$7.2B', '+$1.2B', '−$1.3B', '$85.5B', '−$3.3B', '−$4.5B', '$77.7B',
    ]);
  });

  it('compares the plan with the current system under each set of assumptions', () => {
    const items = [...render('statewide-scenarios').querySelectorAll('li')];
    expect(items).toHaveLength(SCENARIOS_STATEWIDE.length);
    items.forEach((item, i) => {
      const s = SCENARIOS_STATEWIDE[i];
      expect(text(item.querySelector('.xp-diverge-label strong'))).toBe(s.label + (s.published ? '' : ' our math'));
      expect(text(item.querySelector('.xp-diverge-label > span'))).toBe(s.detail);
      expect(text(item.querySelector('.xp-diverge-value'))).toBe(
        `$${Math.abs(s.delta).toFixed(1)}B ${s.delta < 0 ? 'less' : 'more'} (${percent(Math.abs(s.delta) / s.baseline, 0)})`,
      );
      const bar = item.querySelector('.xp-diverge-track span')!;
      expect(bar.className).toBe(s.delta > 0 ? 'xp-up' : 'xp-down');
      expect(bar.getAttribute('style')).toBe(`width:${((Math.abs(s.delta) / 8 / 2) * 100).toFixed(2)}%`);
    });
    expect(texts(render('statewide-scenarios'), '.xp-diverge-value')).toEqual([
      '$0.6B less (1%)', '$6.6B less (9%)', '$7.2B more (9%)', '$1.4B more (2%)',
    ]);
  });

  it('shows what is raised from Oregon employers and households, today and under the plan', () => {
    const host = render('raised');
    const groups = [RAISED_IN_OREGON.best, RAISED_IN_OREGON.board];
    expect(texts(host, '.xp-raised-title')).toEqual(["Milliman's best estimate our math", "The board's assumptions our math"]);
    const rows = [...host.querySelectorAll('.xp-stack-row')];
    expect(rows).toHaveLength(4);
    groups.flat().forEach((r, i) => {
      const total = Math.round((r.main + r.partB) * 10) / 10;
      expect(text(rows[i].querySelector('.xp-stack-name'))).toBe(r.name);
      // The amounts are text beside the bar, where a narrow screen cannot clip them.
      expect(texts(rows[i], '.xp-raised span')).toEqual(['', '']);
      expect(text(rows[i].querySelector('.xp-stack-total'))).toBe(
        `${billions(r.main)} + ${billions(r.partB)} of Part B premiums = ${billions(total)}`,
      );
      expect([...rows[i].querySelectorAll('.xp-raised span')].map((bar) => bar.getAttribute('style'))).toEqual([
        `width:${((r.main / 40) * 100).toFixed(2)}%`,
        `width:${((r.partB / 40) * 100).toFixed(2)}%`,
      ]);
    });
    expect(texts(host, '.xp-stack-total').map((line) => line.split('= ')[1])).toEqual(['$39.6B', '$39.0B', '$36.6B', '$30.0B']);
  });

  it('hides each drawing from assistive technology and leaves its figures in text', () => {
    const host = document.createElement('div');
    host.innerHTML = Object.values(blocks).map((block) => block()).join('');
    for (const bar of host.querySelectorAll('[style^="width:"]')) {
      expect(bar.closest('[aria-hidden="true"]'), bar.outerHTML).not.toBeNull();
    }
  });
});
