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

export function table(
  doc: Document,
  headings: readonly string[],
  rows: readonly (readonly string[])[],
): HTMLTableElement {
  const node = element(doc, 'table');
  const header = node.createTHead().insertRow();
  for (const heading of headings) {
    const cell = element(doc, 'th', heading);
    cell.scope = 'col';
    header.append(cell);
  }

  const body = node.createTBody();
  for (const [label, ...values] of rows) {
    const row = body.insertRow();
    const heading = element(doc, 'th', label);
    heading.scope = 'row';
    row.append(heading, ...values.map(value => element(doc, 'td', value)));
  }
  return node;
}

export function scrollRegion(doc: Document, label: string): HTMLDivElement {
  const node = element(doc, 'div', undefined, 'table-scroll');
  node.tabIndex = 0;
  node.setAttribute('role', 'region');
  node.setAttribute('aria-label', label);
  return node;
}

export function status(doc: Document): HTMLParagraphElement {
  const node = element(doc, 'p', undefined, 'result-status');
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  return node;
}
