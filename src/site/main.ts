/**
 * What the explainer page adds when scripts run. The page reads complete
 * without any of it: the prose, tables and charts are already in the HTML.
 *
 *  - the two calculators, mounted from the widget;
 *  - a picker over the Board's example households, which otherwise all show;
 *  - collapsed sections opened for printing;
 *  - a fixed light or dark look when the address says ?theme=light or ?theme=dark.
 */
import { mount } from '../widget/index';
import type { WidgetTheme } from '../widget/index';
import './site.css';

/** The example shown first: the household insured through a private employer. */
const FIRST_EXAMPLE = 'private';

/** Reads ?theme=light or ?theme=dark. Anything else follows the reader's system setting. */
export function themeFrom(search: string): WidgetTheme {
  const theme = new URLSearchParams(search).get('theme');
  return theme === 'light' || theme === 'dark' ? theme : 'auto';
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

  const theme = themeFrom(search);
  if (theme !== 'auto') {
    page.dataset['uhpTheme'] = theme;
    doc.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
  }

  const household = page.querySelector<HTMLElement>('#uhp-household-calculator');
  if (household) mount(household, { show: 'household', header: false, headingLevel: 3, theme });
  const employer = page.querySelector<HTMLElement>('#uhp-employer-calculator');
  if (employer) mount(employer, { show: 'employer', header: false, headingLevel: 3, theme });

  examplePicker(page, doc);
  if (doc.defaultView) openDetailsForPrint(page, doc.defaultView);
}

if (typeof document !== 'undefined') enhance(document, location.search);
