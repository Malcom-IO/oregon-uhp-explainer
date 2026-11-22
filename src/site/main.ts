/**
 * What the explainer page adds when scripts run. The page reads complete
 * without any of it: the prose, tables and charts are already in the HTML.
 *
 *  - the two calculators, mounted from the widget;
 *  - a picker over the Board's example households, which otherwise all show;
 *  - collapsed sections opened for printing;
 *  - a fixed light or dark look when the address says ?theme=light or
 *    ?theme=dark, or when a host has set data-uhp-theme on the page element;
 *  - a light and dark button, where the page has a [data-uhp-theme-switch]
 *    element. It is not remembered: nothing is stored, and a reload starts
 *    from the device's setting again;
 *  - the title in the bar at the top, shown once the page title scrolls away.
 */
import { mount } from '../widget/index';
import type { WidgetTheme } from '../widget/index';
import './site.css';

/** Shown in place of a calculator that could not start. */
export const CALCULATOR_FAILED = 'The calculator could not load in this browser. The tables on this page show worked examples.';

/** The example shown first: the household insured through a private employer. */
const FIRST_EXAMPLE = 'private';

/** Reads ?theme=light or ?theme=dark. Anything else follows the reader's system setting. */
export function themeFrom(search: string): WidgetTheme {
  const theme = new URLSearchParams(search).get('theme');
  return theme === 'light' || theme === 'dark' ? theme : 'auto';
}

/** Puts the page, both calculators and the browser's own controls in one look. */
export function applyTheme(page: HTMLElement, doc: Document, theme: WidgetTheme): void {
  for (const root of [page, ...page.querySelectorAll<HTMLElement>('.oregon-uhp')]) {
    if (theme === 'auto') delete root.dataset['uhpTheme'];
    else root.dataset['uhpTheme'] = theme;
  }
  doc.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme === 'auto' ? 'light dark' : theme);
}

const SUN = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/>' +
  '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';

/**
 * Fills a [data-uhp-theme-switch] element with one button that flips the page
 * between light and dark. It names the look it switches to, as the reference
 * page does. Before it is pressed the page follows the device, and the button
 * follows the device too.
 */
export function themeToggle(page: HTMLElement, doc: Document, initial: WidgetTheme): void {
  const slot = page.querySelector<HTMLElement>('[data-uhp-theme-switch]');
  if (!slot) return;
  const view = doc.defaultView;
  const darkQuery = view?.matchMedia?.('(prefers-color-scheme: dark)');
  let theme = initial;
  const shown = (): 'light' | 'dark' => (theme === 'auto' ? (darkQuery?.matches ? 'dark' : 'light') : theme);

  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'xp-theme-button';
  function render(): void {
    const next = shown() === 'dark' ? 'light' : 'dark';
    button.innerHTML = next === 'light' ? SUN : MOON;
    button.append(next === 'light' ? 'Light' : 'Dark');
    button.dataset['next'] = next;
    button.setAttribute('aria-label', `Switch to ${next} colors`);
  }
  button.addEventListener('click', () => {
    theme = shown() === 'dark' ? 'light' : 'dark';
    applyTheme(page, doc, theme);
    render();
  });
  darkQuery?.addEventListener?.('change', () => { if (theme === 'auto') render(); });
  render();
  slot.replaceChildren(button);
}

/**
 * Shows the bar's title once the page title has scrolled out of view, and
 * hides it again when the page title comes back. Without IntersectionObserver
 * the title simply stays shown.
 */
export function stickyBar(page: HTMLElement, doc: Document): void {
  const bar = page.querySelector<HTMLElement>('[data-uhp-bar]');
  const title = page.querySelector<HTMLElement>('h1');
  const Observer = doc.defaultView?.IntersectionObserver;
  if (!bar || !title || !Observer) return;
  bar.classList.add('xp-bar-quiet');
  new Observer(([entry]) => {
    // Past the title means it is out of view above the top, not below the bottom.
    const past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    bar.classList.toggle('xp-bar-quiet', !past);
  }, { rootMargin: '-64px 0px 0px 0px' }).observe(title);
}

/** Turns the list of example households into one shown at a time, with a button for each. */
export function examplePicker(root: ParentNode, doc: Document): void {
  const list = root.querySelector<HTMLElement>('.xp-examples');
  if (!list) return;
  const examples = [...list.querySelectorAll<HTMLElement>('.xp-example')];
  if (examples.length < 2) return;

  const picker = doc.createElement('div');
  picker.className = 'xp-picker';
  picker.setAttribute('role', 'group');
  picker.setAttribute('aria-label', 'Example household');

  const buttons = examples.map((example) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = example.dataset['tab'] ?? '';
    button.addEventListener('click', () => show(example));
    picker.append(button);
    return button;
  });

  function show(chosen: HTMLElement): void {
    examples.forEach((example, i) => {
      const on = example === chosen;
      example.classList.toggle('xp-off', !on);
      buttons[i].setAttribute('aria-pressed', String(on));
    });
  }

  list.classList.add('xp-picked');
  list.before(picker);
  show(examples.find((example) => example.dataset['example'] === FIRST_EXAMPLE) ?? examples[0]);
}

/**
 * Paper has no "show more": open every collapsed section for printing, then
 * put back the ones the reader had left closed.
 */
export function openDetailsForPrint(root: ParentNode, view: Window): void {
  let opened: HTMLDetailsElement[] = [];
  view.addEventListener('beforeprint', () => {
    opened = [...root.querySelectorAll<HTMLDetailsElement>('details:not([open])')];
    for (const details of opened) details.open = true;
  });
  view.addEventListener('afterprint', () => {
    for (const details of opened) details.open = false;
    opened = [];
  });
}

/** Enhances the page. `search` is the address's query string, which is only read. */
export function enhance(doc: Document, search: string): void {
  const page = doc.querySelector<HTMLElement>('.uhp-page');
  if (!page) return;

  // The address wins; otherwise a theme a host set on the page element; otherwise the reader's system.
  const hostTheme = page.dataset['uhpTheme'];
  const fromAddress = themeFrom(search);
  const theme: WidgetTheme = fromAddress !== 'auto'
    ? fromAddress
    : hostTheme === 'light' || hostTheme === 'dark' ? hostTheme : 'auto';
  if (theme !== 'auto') {
    page.dataset['uhpTheme'] = theme;
    doc.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
  }

  for (const [selector, show] of [
    ['#uhp-household-calculator', 'household'],
    ['#uhp-employer-calculator', 'employer'],
  ] as const) {
    const host = page.querySelector<HTMLElement>(selector);
    if (!host) continue;
    try {
      mount(host, { show, header: false, headingLevel: 3, theme });
    } catch {
      // The rest of the page does not depend on the calculator; say plainly that it did not load.
      const note = doc.createElement('p');
      note.className = 'xp-noscript';
      note.textContent = CALCULATOR_FAILED;
      host.replaceChildren(note);
    }
  }

  themeToggle(page, doc, theme);
  stickyBar(page, doc);
  examplePicker(page, doc);
  if (doc.defaultView) openDetailsForPrint(page, doc.defaultView);
}

if (typeof document !== 'undefined') enhance(document, location.search);
