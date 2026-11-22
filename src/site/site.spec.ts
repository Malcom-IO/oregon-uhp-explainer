// @vitest-environment happy-dom
import page from '../../index.html?raw';
import { HIGH_PLAN, RATE_RESET } from '../model/uhp-statewide';
import { renderBlocks } from './blocks';
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

  it('computes each figure from the model, as the source page did', () => {
    expect(figures['statewide.highPlan']).toBe(String(HIGH_PLAN));
    expect(figures['statewide.rateResetBest']).toBe(`${Number((RATE_RESET.best * 100).toFixed(0))}%`);
    // Anchors, so a change to a formatter cannot move the page and the map together.
    expect(figures).toEqual({ 'statewide.highPlan': '86.5', 'statewide.rateResetBest': '10%' });
  });

  it('fails on a wrong number in the page', () => {
    const planted = page.replace('<span data-fig="statewide.highPlan">86.5</span>', '<span data-fig="statewide.highPlan">88.5</span>');
    expect(planted).not.toBe(page);
    const wrong = figuresIn(planted).filter(({ key, text }) => figures[key] !== text);
    expect(wrong).toEqual([{ key: 'statewide.highPlan', text: '88.5' }]);
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
      } else expect(['calculator/', 'demo/']).toContain(href);
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
  function load(search = ''): HTMLElement {
    const body = /<body>([\s\S]*)<\/body>/.exec(renderBlocks(page))![1].replace(/<script[^>]*><\/script>/, '');
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
    expect(root.dataset['uhpTheme']).toBeUndefined();
    expect(household.querySelector<HTMLElement>('.oregon-uhp')!.dataset['uhpTheme']).toBeUndefined();
  });

  it('fixes the look of the page and both calculators when the address names a theme', () => {
    const root = load('?theme=dark');
    expect(root.dataset['uhpTheme']).toBe('dark');
    expect([...root.querySelectorAll<HTMLElement>('.oregon-uhp')].map((el) => el.dataset['uhpTheme'])).toEqual(['dark', 'dark']);
    expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')).toBe('dark');
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
