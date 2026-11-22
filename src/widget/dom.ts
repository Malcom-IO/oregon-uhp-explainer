export function element<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = doc.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

/** A heading at a level the host chose; levels past 6 stay at 6. */
export function heading(doc: Document, level: number, text: string, className: string): HTMLHeadingElement {
  const tag = `h${Math.min(6, Math.max(1, level))}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return element(doc, tag, text, className);
}

/**
 * Read a typed dollar amount: digits, with an optional leading dollar sign,
 * commas between groups of three, and up to two decimal places. Returns
 * undefined for an empty field and NaN for anything else. Being strict
 * matters here: "85.000", "1.234,56", "0,085" or "85000 50" must be refused,
 * not quietly read as some other number of dollars.
 */
export function parseAmount(raw: string): number | undefined {
  const text = raw.trim().replace(/^\$\s*/, '');
  if (text === '') return undefined;
  if (!/^(\d+|[1-9]\d{0,2}(,\d{3})+)?(\.\d{0,2})?$/.test(text) || !/\d/.test(text)) return NaN;
  const value = Number(text.replace(/,/g, ''));
  return value <= Number.MAX_SAFE_INTEGER ? value : NaN;
}

export function table(
  doc: Document,
  caption: string,
  headings: readonly string[],
  rows: readonly (readonly string[])[],
): HTMLTableElement {
  const node = element(doc, 'table');
  node.createCaption().textContent = caption;
  node.caption!.className = 'uhp-visually-hidden';
  const header = node.createTHead().insertRow();
  for (const text of headings) {
    const cell = element(doc, 'th', text);
    cell.scope = 'col';
    header.append(cell);
  }

  const body = node.createTBody();
  for (const [label, ...values] of rows) {
    const row = body.insertRow();
    const rowHeading = element(doc, 'th', label);
    rowHeading.scope = 'row';
    row.append(rowHeading, ...values.map(value => element(doc, 'td', value)));
  }
  return node;
}

export function scrollRegion(doc: Document, label: string): HTMLDivElement {
  const node = element(doc, 'div', undefined, 'uhp-table-scroll');
  node.tabIndex = 0;
  node.setAttribute('role', 'region');
  node.setAttribute('aria-label', label);
  return node;
}

/** A visually hidden polite live region. Write to it through `announcer`. */
export function status(doc: Document): HTMLParagraphElement {
  const node = element(doc, 'p', undefined, 'uhp-visually-hidden');
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  return node;
}

/** How long input must pause before a result is announced, in milliseconds. */
export const ANNOUNCE_DELAY = 700;
/** How long an announcement stays in the live region before it is cleared. */
export const ANNOUNCE_LINGER = 7000;

/**
 * Announce results through a live region once input pauses, so typing a
 * number or dragging the slider does not queue one message per keystroke.
 * The region is emptied afterward: the same text is visible on the page, and
 * leaving it in place would make a screen reader read it twice.
 */
export function announcer(node: HTMLElement) {
  let pending: ReturnType<typeof setTimeout> | undefined;
  let clearing: ReturnType<typeof setTimeout> | undefined;
  let last: string | undefined;

  return {
    /** Queue `text`. With `quiet`, only remember it, for the state at mount. */
    say(text: string, quiet = false) {
      clearTimeout(pending);
      pending = undefined;
      if (quiet || text === last) {
        last = text;
        return;
      }
      pending = setTimeout(() => {
        pending = undefined;
        last = text;
        node.textContent = text;
        clearTimeout(clearing);
        clearing = setTimeout(() => { node.textContent = ''; }, ANNOUNCE_LINGER);
      }, ANNOUNCE_DELAY);
    },
    stop() {
      clearTimeout(pending);
      clearTimeout(clearing);
    },
  };
}
