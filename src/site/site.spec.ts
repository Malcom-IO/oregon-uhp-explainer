// @vitest-environment happy-dom
import page from '../../index.html?raw';
import { HOUSEHOLD_ROWS } from '../model/uhp-households';
import { MODELS, SCENARIOS } from '../model/uhp-model';
import { HIGH_PLAN, RATE_RESET } from '../model/uhp-statewide';
import { BUSINESS_PAYROLLS, renderBlocks } from './blocks';
import { figures } from './figures';
import { enhance, themeFrom } from './main';
import css from './site.css?raw';
import widgetCss from '../widget/widget.css?raw';

/** Every keyed figure in the page: `<span data-fig="key">text</span>`. */
const FIGURE = /<span data-fig="([^"]*)">([^<]*)<\/span>/g;

function figuresIn(html: string): { key: string; text: string }[] {
  return [...html.matchAll(FIGURE)].map(([, key, text]) => ({ key, text }));
}

describe('figures in the prose', () => {
  const found = figuresIn(page);

  it('finds every data-fig attribute as a plain keyed span', () => {
    expect(found.length).toBeGreaterThan(0);
    expect(found).toHaveLength(page.split('data-fig=').length - 1);
  });

  it.each(found)('shows $key as the model computes it', ({ key, text }) => {
    expect(figures).toHaveProperty([key]);
    expect(text).toBe(figures[key]);
  });

  it('uses every key in the map', () => {
    expect([...new Set(found.map((f) => f.key))].sort()).toEqual(Object.keys(figures).sort());
  });

  it('keeps every span of a figure that appears more than once', () => {
    // A key used in several places stays "used" if one of its spans is unwrapped,
    // so the number of spans is pinned: removing a guard has to be done on purpose.
    const counts: Record<string, number> = {};
    for (const { key } of found) counts[key] = (counts[key] ?? 0) + 1;
    expect(found).toHaveLength(90);
    expect(Object.fromEntries(Object.entries(counts).filter(([, n]) => n > 1).sort())).toEqual({
      'household.exemption200Family': 2,
      'household.model1ReportRate': 3,
      'household.model1TopRate': 3,
      'household.topShareRange': 2,
      'household.workerCreditShare': 3,
      'payroll.examplePrivateRate': 2,
      'payroll.exemption': 9,
      'payroll.firstPrivateRate': 4,
      'payroll.publicRateModel1': 2,
      'payroll.publicRateOtherModels': 2,
      'payroll.topPrivateRate': 2,
      'payroll.upperTier': 3,
      'statewide.bestRevenueTarget': 3,
      'statewide.boardRevenueTarget': 3,
      'statewide.lowStatusQuo': 2,
      'statewide.rateResetBest': 2,
      'statewide.revenueIncrease': 3,
    });
  });

  it('computes each figure from the model, as the source page did', () => {
    expect(figures['statewide.highPlan']).toBe(String(HIGH_PLAN));
    expect(figures['statewide.rateResetBest']).toBe(`${Number((RATE_RESET.best * 100).toFixed(0))}%`);
    // Anchors, so a change to a formatter cannot move the page and the map together.
    expect(figures).toEqual({
      'household.exemption200Single': '$31,920',
      'household.exemption200Family': '$66,000',
      'household.exemption138Family': '$45,540',
      'household.singleWithoutCredit': '$1,766, $1,576 and $1,474',
      'household.exampleSinglePrivatePayment': '$0',
      'household.exemptionChoices': '200% or 138%',
      'household.workerCreditShare': 'half',
      'household.model5At90000': '$3,669',
      'household.reportedModel5At90000': '$3,699',
      'household.combinedRange': '6% to 13.5%',
      'household.middleFifthRange': '1% to 2.5%',
      'household.middleFifthCombinedRange': '8% to 10%',
      'household.topShareRange': '25% to 40%',
      'household.reportRateRange': '7.69% to 12.05%',
      'household.model1ReportRate': '12.0%',
      'household.model4ReportRate': '11.7%',
      'household.model5ReportRate': '10.4%',
      'household.model1TopRate': '13.5%',
      'household.model4TopRate': '14.3%',
      'household.model5TopRate': '12%',
      'household.examplePrivateWages': '$80,000',
      'household.examplePrivateIncome': '$85,000',
      'household.examplePrivateFamilyIncome': '$220,000',
      'household.examplePrivateHighIncome': '$220,000',
      'household.exampleSelfIncome': '$90,000',
      'household.highestReportExampleIncome': '$220,000',
      'payroll.exemption': '$500,000',
      'payroll.upperTier': '$10 million',
      'payroll.exampleAmount': '$520,000',
      'payroll.taxExample': '$1,920',
      'payroll.taxableExample': '$20,000',
      'payroll.firstPrivateRate': '9.6%',
      'payroll.topPrivateRate': '14%',
      'payroll.firstRateCents': '9.6',
      'payroll.topRateCents': '14',
      'payroll.publicRateModel1': '9.6%',
      'payroll.publicRateOtherModels': '14%',
      'payroll.examplePrivateRate': '9%',
      'payroll.examplePrivateTax': '$7,200',
      'payroll.examplePrivateHighTax': '$18,000',
      'statewide.highPlan': '86.5',
      'statewide.rateResetBest': '10%',
      'statewide.providerSavings': '$7.8 billion',
      'statewide.publishedSavingsRange': '1% to 9%',
      'statewide.noResetIncreaseRange': '2% to 9%',
      'statewide.bestStatusQuo': '$78.3 billion',
      'statewide.lowStatusQuo': '$72.8 billion',
      'statewide.boardSavings': '$6.6 billion',
      'statewide.boardSavingsRate': '9%',
      'statewide.publicFundingRange': '$40 to $42 billion',
      'statewide.partB': '$3.5',
      'statewide.bestIncreaseWithPartB': '$2.9 billion',
      'statewide.bestSavings': '$0.6 billion',
      'statewide.boardRevenueTarget': '$30 billion',
      'statewide.bestRevenueTarget': '$39 billion',
      'statewide.revenueIncrease': '30% more',
      'statewide.lowAddedCare': '$5.7',
    });
  });

  it('describes the lowest middle-fifth rate as under 1%', () => {
    expect(Math.min(...MODELS.map(model => model.middleFifthRate))).toBeLessThan(0.01);
  });

  it('fails on a wrong number in the page', () => {
    const planted = page.replace('<span data-fig="statewide.highPlan">86.5</span>', '<span data-fig="statewide.highPlan">88.5</span>');
    expect(planted).not.toBe(page);
    const wrong = figuresIn(planted).filter(({ key, text }) => figures[key] !== text);
    expect(wrong).toEqual([{ key: 'statewide.highPlan', text: '88.5' }]);
  });
});

describe('figures beside the tables and bars', () => {
  const doc = new DOMParser().parseFromString(page, 'text/html');

  it('describes the number of household and employer examples in the tables', () => {
    const counts = new Map([[4, 'four'], [5, 'five'], [12, 'twelve']]);
    const households = counts.get(HOUSEHOLD_ROWS.length);
    const payrolls = counts.get(BUSINESS_PAYROLLS.length);
    const scenarios = counts.get(SCENARIOS.length);
    expect(scenarios).toBeDefined();
    expect(households).toBeDefined();
    expect(payrolls).toBeDefined();
    expect(doc.querySelector('#uhp-household-calculator noscript')?.textContent).toContain(`${households} example households`);
    expect(doc.querySelector('#examples')?.textContent).toContain(`${scenarios} households`);
    expect(doc.querySelector('#households + p')?.textContent).toContain(`run for ${households} households`);
    expect(doc.querySelector('#uhp-employer-calculator noscript')?.textContent).toMatch(new RegExp(`at ${payrolls}\\s+payroll sizes`));
  });

  it('scales each status quo bar against the largest figure in its card', () => {
    const groups = [...doc.querySelectorAll('.xp-sq-bars')];
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      const tracks = [...group.querySelectorAll('.xp-track')];
      expect(tracks).toHaveLength(2);
      const values = tracks.map(track => Number(track.nextElementSibling?.textContent?.replace(/[, %]/g, '')));
      const largest = Math.max(...values);
      expect(Math.min(...values)).toBeGreaterThan(0);
      expect(tracks.map(track => track.firstElementChild?.getAttribute('style')))
        .toEqual(values.map(value => `width:${Number((100 * value / largest).toFixed(2))}%`));
    }
  });
});

describe('the page as a document', () => {
  const built = renderBlocks(page);

  it('is one root element with the page class, titled as unofficial', () => {
    expect(page.match(/class="uhp-page"/g)).toHaveLength(1);
    expect(page).toContain("<title>Oregon's proposed Universal Health Plan, explained (unofficial)</title>");
    expect(page).toMatch(/<h1>Oregon's proposed Universal Health Plan, explained \(unofficial\)<\/h1>/);
    expect(page).toContain('Source snapshot &middot; October 2026 drafts');
    expect(page).toContain('not published, reviewed or endorsed by');
  });

  it.each([
    ['the source site', /malcom\.io|malcom io\b/i],
    ['template syntax', /\{\{|\}\}|routerLink|\[href\]|@for\b|@if\b|ng-template|ngTemplateOutlet/],
    ['an email address', /mailto:|[\w.+-]+@[\w-]+\.[a-z]{2,}/i],
    ['a phone number', /tel:|\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/],
    ['the opinion page or the floor proposal', /opinion|floor-and-top-up|top-up/i],
    ['a PDF download of the page', /download=|oregon-universal-health-plan\.pdf/],
  ])('carries no trace of %s', (_what, pattern) => {
    expect(built.match(pattern)?.[0]).toBeUndefined();
  });

  it('loads nothing from another site', () => {
    expect(built).not.toMatch(/<(img|iframe|video|audio|object|embed|source)\b/i);
    expect([...built.matchAll(/<link[^>]*>/g)].map((m) => m[0])).toEqual(['<link rel="icon" href="data:,">']);
    expect(built).not.toMatch(/url\(|@import/);
    expect([...built.matchAll(/<script[^>]*>/g)].map((m) => m[0])).toEqual([
      '<script type="module" src="/src/site/main.ts">',
    ]);
    expect(css).not.toMatch(/url\(|@import|@font-face/);
  });

  it('links only to its own sections, its sibling pages, the Board and the project', () => {
    const hrefs = [...built.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toHaveLength(built.split('<a ').length - 1);
    const ids = new Set([...built.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]));
    expect(hrefs.length).toBeGreaterThan(10);
    for (const href of hrefs) {
      if (href.startsWith('#')) expect(ids, href).toContain(href.slice(1));
      else if (href.startsWith('https://')) {
        expect(href).toMatch(/^https:\/\/(www\.oregon\.gov\/uhpgb\/|github\.com\/Malcom-IO\/oregon-uhp-explainer(\/|$))/);
      } else expect(['calculator/', 'demo/', 'oregon-uhp-explainer.pdf']).toContain(href);
    }
  });

  it('keeps the section ids of the source page', () => {
    for (const id of [
      'short-version', 'status', 'coverage', 'funding', 'calculator', 'households', 'high-incomes',
      'examples', 'employers', 'providers', 'open-questions', 'status-quo', 'total-cost', 'sources',
    ]) {
      expect(page, id).toContain(` id="${id}"`);
    }
  });

  it('uses no id twice', () => {
    const ids = [...built.matchAll(/\sid="([^"]*)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tells a reader without JavaScript where each calculator would be', () => {
    expect(page.match(/<noscript>/g)).toHaveLength(2);
    expect(page).toMatch(/id="uhp-household-calculator">\s*<noscript>/);
    expect(page).toMatch(/id="uhp-employer-calculator">\s*<noscript>/);
  });
});

describe('the stylesheet', () => {
  /** Selectors of every style rule, with comments, at-rule preludes and declarations removed. */
  function selectors(source: string): string[] {
    const bare = source.replace(/\/\*[\s\S]*?\*\//g, '');
    return [...bare.matchAll(/([^{}]+)\{[^{}]*\}/g)]
      .map((m) => m[1].replace(/@[^{]+\{/g, '').trim())
      .filter((prelude) => prelude && !prelude.startsWith('@'))
      .flatMap((prelude) => prelude.split(/,(?![^()]*\))/).map((s) => s.trim()));
  }

  it('scopes every rule under the page class', () => {
    const all = selectors(css);
    expect(all.length).toBeGreaterThan(100);
    expect(all.filter((selector) => !/^\.uhp-page(?![\w-])/.test(selector))).toEqual([]);
  });

  it('uses the calculator’s color properties with the same defaults', () => {
    const tokens = (source: string) => [...source.matchAll(/--_[\w-]+: var\(--uhp-[\w-]+, #[0-9a-f]+\);/g)].map((m) => m[0]);
    expect(tokens(css)).toEqual(tokens(widgetCss));
    // Fifteen properties, four times: light, dark by system setting, dark by attribute, and light again for print.
    expect(tokens(css)).toHaveLength(60);
    expect(tokens(css).slice(45)).toEqual(tokens(css).slice(0, 15));
  });
});

describe('what scripts add', () => {
  /** Loads the page. With followDevice, as a host that removed the page's light default. */
  function load(search = '', followDevice = false): HTMLElement {
    let body = /<body>([\s\S]*)<\/body>/.exec(renderBlocks(page))![1].replace(/<script[^>]*><\/script>/, '');
    if (followDevice) body = body.replace(' data-uhp-theme="light"', '');
    document.head.innerHTML = '<meta name="color-scheme" content="light dark">';
    document.body.innerHTML = body;
    enhance(document, search);
    return document.querySelector<HTMLElement>('.uhp-page')!;
  }

  it('follows a theme the host set on the page element, in the page and both calculators', () => {
    const body = /<body>([\s\S]*)<\/body>/.exec(renderBlocks(page))![1].replace(/<script[^>]*><\/script>/, '');
    for (const [hostTheme, search, expected] of [
      ['light', '', 'light'], ['dark', '', 'dark'], ['dark', '?theme=light', 'light'], ['sepia', '', undefined],
    ] as const) {
      document.head.innerHTML = '<meta name="color-scheme" content="light dark">';
      document.body.innerHTML = body;
      const root = document.querySelector<HTMLElement>('.uhp-page')!;
      root.dataset['uhpTheme'] = hostTheme;
      enhance(document, search);
      const widgets = [...root.querySelectorAll<HTMLElement>('.oregon-uhp')];
      expect(widgets).toHaveLength(2);
      expect(widgets.map((widget) => widget.dataset['uhpTheme'])).toEqual([expected, expected]);
      if (expected) {
        expect(root.dataset['uhpTheme']).toBe(expected);
        expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')).toBe(expected);
      }
    }
  });

  it('reads the theme from the address and nothing else', () => {
    expect(themeFrom('?theme=dark')).toBe('dark');
    expect(themeFrom('?theme=light')).toBe('light');
    expect(themeFrom('?theme=blue')).toBe('auto');
    expect(themeFrom('')).toBe('auto');
  });

  it('mounts one household and one employer calculator, without their own header', () => {
    const root = load();
    const household = root.querySelector('#uhp-household-calculator')!;
    const employer = root.querySelector('#uhp-employer-calculator')!;
    expect(household.querySelectorAll('.oregon-uhp')).toHaveLength(1);
    expect(employer.querySelectorAll('.oregon-uhp')).toHaveLength(1);
    expect(household.querySelector('h3')?.textContent).toBe('Household calculator');
    expect(employer.querySelector('h3')?.textContent).toBe('Employer payroll tax calculator');
    expect(root.querySelectorAll('.oregon-uhp :is(h1, h2)')).toHaveLength(0);
    expect(root.querySelectorAll('h1')).toHaveLength(1);
    // The page opens light, and so do both calculators.
    expect(root.dataset['uhpTheme']).toBe('light');
    expect(household.querySelector<HTMLElement>('.oregon-uhp')!.dataset['uhpTheme']).toBe('light');
    expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')).toBe('light');
  });

  it('fixes the look of the page and both calculators when the address names a theme', () => {
    const root = load('?theme=dark');
    expect(root.dataset['uhpTheme']).toBe('dark');
    expect([...root.querySelectorAll<HTMLElement>('.oregon-uhp')].map((el) => el.dataset['uhpTheme'])).toEqual(['dark', 'dark']);
    expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')).toBe('dark');
  });

  it('flips the page and both calculators between light and dark with one button, and stores nothing', () => {
    localStorage.clear();
    sessionStorage.clear();
    const cookies = document.cookie;
    const root = load('', true);
    const meta = () => document.querySelector('meta[name="color-scheme"]')?.getAttribute('content');
    const looks = () => [root, ...root.querySelectorAll<HTMLElement>('.oregon-uhp')].map((el) => el.dataset['uhpTheme']);
    const buttons = root.querySelectorAll<HTMLButtonElement>('[data-uhp-theme-switch] button');
    expect(buttons).toHaveLength(1);
    const button = buttons[0];
    // It sits in the bar at the top, and names the look it switches to.
    expect(button.closest('[data-uhp-bar]')).not.toBeNull();
    const device = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const other = device === 'dark' ? 'light' : 'dark';
    const word = (theme: string) => theme[0].toUpperCase() + theme.slice(1);
    expect(looks()).toEqual([undefined, undefined, undefined]);
    expect(button.textContent).toBe(word(other));
    expect(button.getAttribute('aria-label')).toBe(`Switch to ${other} colors`);
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    button.click();
    expect(looks()).toEqual([other, other, other]);
    expect(meta()).toBe(other);
    expect(button.textContent).toBe(word(device));

    button.click();
    expect(looks()).toEqual([device, device, device]);
    expect(meta()).toBe(device);
    expect(button.textContent).toBe(word(other));

    // The choice is not remembered anywhere.
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe(cookies);
    expect(location.search).toBe('');
    expect(location.hash).toBe('');
    expect(history.state).toBeNull();
  });

  it('labels the button from a dark device setting, and follows a change of setting until it is pressed', () => {
    let dark = true;
    let changed: (() => void) | undefined;
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      get matches() { return query.includes('dark') && dark; },
      media: query,
      addEventListener: (_: string, listener: () => void) => { changed = listener; },
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      // The page as published opens light whatever the device prefers.
      const published = load();
      expect(published.dataset['uhpTheme']).toBe('light');
      expect(published.querySelector('[data-uhp-theme-switch] button')?.textContent).toBe('Dark');

      const root = load('', true);
      const button = root.querySelector<HTMLButtonElement>('[data-uhp-theme-switch] button')!;
      expect(button.textContent).toBe('Light');
      dark = false;
      changed!();
      expect(button.textContent).toBe('Dark');
      button.click();
      expect(root.dataset['uhpTheme']).toBe('dark');
      expect(button.textContent).toBe('Light');
      // Once pressed, the page keeps its look when the device setting changes.
      dark = true;
      changed!();
      expect(button.textContent).toBe('Light');
      dark = false;
      changed!();
      expect(button.textContent).toBe('Light');
      expect(root.dataset['uhpTheme']).toBe('dark');
    } finally {
      window.matchMedia = original;
    }
  });

  it('links from the top bar to how to check this page, with or without scripts', () => {
    const doc = new DOMParser().parseFromString(renderBlocks(page), 'text/html');
    const link = doc.querySelector<HTMLAnchorElement>('[data-uhp-bar] a.xp-bar-check')!;
    expect(link.getAttribute('href')).toBe('#about');
    // Its name, with the decorative check mark left out, is the same at every width.
    const name = [...link.childNodes].filter((node) => !(node instanceof Element && node.getAttribute('aria-hidden') === 'true'))
      .map((node) => node.textContent).join('').trim();
    expect(name).toBe('Check this page');
    const target = doc.getElementById('about')!;
    expect(target.querySelector('h2')?.textContent).toBe('How to check this page');
    expect(target.querySelectorAll('.xp-checks > li > strong:first-child')).toHaveLength(target.querySelectorAll('.xp-checks > li').length);
  });

  it('leaves the bar title shown where the browser cannot watch the page title', () => {
    const original = window.IntersectionObserver;
    (window as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;
    try {
      const root = load();
      expect(root.querySelector('[data-uhp-bar]')!.classList.contains('xp-bar-quiet')).toBe(false);
    } finally {
      window.IntersectionObserver = original;
    }
  });

  it('starts the button from the theme the address names, and leaves it out where the page has no slot', () => {
    const label = (root: HTMLElement) => root.querySelector('[data-uhp-theme-switch] button')?.textContent;
    expect(label(load('?theme=dark'))).toBe('Light');
    expect(label(load('?theme=light'))).toBe('Dark');
    const body = /<body>([\s\S]*)<\/body>/.exec(renderBlocks(page))![1]
      .replace(/<script[^>]*><\/script>/, '')
      .replace(/<div class="xp-theme-switch" data-uhp-theme-switch><\/div>/, '');
    document.body.innerHTML = body;
    enhance(document, '');
    expect(document.querySelectorAll('.xp-theme-button')).toHaveLength(0);
  });

  it('keeps a bar at the top whose title repeats the page title and shows once that title scrolls away', () => {
    let notify: ((entries: Partial<IntersectionObserverEntry>[]) => void) | undefined;
    let watched: Element | undefined;
    const original = window.IntersectionObserver;
    window.IntersectionObserver = class {
      constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) { notify = callback; }
      observe(target: Element) { watched = target; }
      disconnect() {}
      unobserve() {}
    } as unknown as typeof IntersectionObserver;
    try {
      const root = load();
      const bar = root.querySelector<HTMLElement>('[data-uhp-bar]')!;
      const title = bar.querySelector('.xp-bar-title')!;
      // The same words as the page title, hidden from assistive technology so they are not read twice.
      expect(title.getAttribute('aria-hidden')).toBe('true');
      expect(title.querySelector('.xp-bar-name')?.textContent).toBe(root.querySelector('h1')?.textContent);
      expect(title.querySelector('.xp-bar-eyebrow')?.textContent).toBe(root.querySelector('.xp-eyebrow')?.textContent);
      expect(title.querySelectorAll('a, button, input, select, [tabindex]')).toHaveLength(0);
      expect(watched).toBe(root.querySelector('h1'));
      expect(bar.classList.contains('xp-bar-quiet')).toBe(true);
      notify!([{ isIntersecting: false, boundingClientRect: { top: -40 } as DOMRectReadOnly }]);
      expect(bar.classList.contains('xp-bar-quiet')).toBe(false);
      notify!([{ isIntersecting: true, boundingClientRect: { top: 10 } as DOMRectReadOnly }]);
      expect(bar.classList.contains('xp-bar-quiet')).toBe(true);
      // Below the bottom of the screen is not past it.
      notify!([{ isIntersecting: false, boundingClientRect: { top: 2000 } as DOMRectReadOnly }]);
      expect(bar.classList.contains('xp-bar-quiet')).toBe(true);
    } finally {
      window.IntersectionObserver = original;
    }
  });

  it('shows one board example at a time, starting with the private employer', () => {
    const root = load();
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('.xp-picker button')];
    const shown = () => [...root.querySelectorAll<HTMLElement>('.xp-example:not(.xp-off)')].map((el) => el.dataset['example']);
    expect(buttons.map((b) => b.textContent)).toEqual(['Self-employed', 'Private employer', 'Public employer', 'On Medicare']);
    expect(shown()).toEqual(['private']);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false']);
    buttons[3].click();
    expect(shown()).toEqual(['medicare']);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false', 'true']);
  });

  it('leaves every board example in the page before scripts run', () => {
    const body = renderBlocks(page);
    expect(body.match(/class="xp-example"/g)).toHaveLength(4);
    expect(body).not.toMatch(/xp-off\b|xp-picker/);
  });

  it('opens collapsed sections for printing and closes them again', () => {
    const root = load();
    const details = [...root.querySelectorAll<HTMLDetailsElement>('details.xp-details')];
    expect(details.length).toBe(2);
    details[1].open = true;
    window.dispatchEvent(new Event('beforeprint'));
    expect(details.map((d) => d.open)).toEqual([true, true]);
    window.dispatchEvent(new Event('afterprint'));
    expect(details.map((d) => d.open)).toEqual([false, true]);
  });
});
