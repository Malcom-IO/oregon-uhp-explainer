import { bill, MODELS, schedule } from '../model/uhp-model';
import type { Bill, EmployerKind } from '../model/uhp-model';
import { element, scrollRegion, table } from './dom';
import { compactDollars, copy, dollars, modelsLabel } from './strings';

interface ChartInput {
  income: number;
  size: number;
  employer: EmployerKind;
  payroll?: number;
  currentCost?: number;
  bills: readonly Bill[];
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const HEIGHT = 360;
/** Below this plot width the end labels are left out and the axes get fewer ticks. */
const NARROW = 520;
/** Width of the hover readout, in pixels. */
const TIP_WIDTH = 184;

function svgNode<K extends keyof SVGElementTagNameMap>(
  doc: Document,
  tag: K,
  attributes: Record<string, string | number> = {},
  text?: string,
): SVGElementTagNameMap[K] {
  const node = doc.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

function displayStep(span: number, divisions: number): number {
  const target = Math.max(1, span / divisions);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const factor = [1, 2, 5, 10].find(value => value >= target / magnitude) ?? 10;
  return magnitude * factor;
}

export function seriesClass(index: number): string {
  return `uhp-series-${index + 1}`;
}

/** A small colored dot naming a series, or the dashed key for what you pay now. */
export function key(doc: Document, className: string): HTMLSpanElement {
  const node = element(doc, 'span', undefined, `uhp-key ${className}`);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

export function createChart(doc: Document) {
  const figure = element(doc, 'figure', undefined, 'uhp-chart');
  const caption = element(doc, 'figcaption');
  const captionTitle = element(doc, 'strong', copy.chart);
  const captionContext = element(doc, 'span', undefined, 'uhp-chart-context');
  caption.append(captionTitle, captionContext);
  const legend = element(doc, 'ul', undefined, 'uhp-chart-legend');
  legend.setAttribute('aria-hidden', 'true');
  const plot = element(doc, 'div', undefined, 'uhp-plot');
  const svg = svgNode(doc, 'svg', { role: 'img' });
  const tip = element(doc, 'div', undefined, 'uhp-tip');
  tip.setAttribute('aria-hidden', 'true');
  tip.hidden = true;
  const details = element(doc, 'details');
  const scroller = scrollRegion(doc, copy.chart);
  details.append(element(doc, 'summary', copy.chartTable), scroller);
  plot.append(svg, tip);
  figure.append(caption, legend, plot, details);
  figure.hidden = true;

  let input: ChartInput | undefined;
  let width = 720;
  let inspect: ((event: PointerEvent) => void) | undefined;

  function seriesValues(income: number, values: ChartInput) {
    return MODELS.map(model => bill(model, income, values.size, values.employer, values.payroll).household);
  }

  function hideTip() {
    tip.hidden = true;
    tip.replaceChildren();
    svg.querySelector('.uhp-hover')?.replaceChildren();
  }

  function draw(values: ChartInput, xMax: number) {
    const narrow = width < NARROW;
    const left = 66;
    const right = width - (narrow ? 14 : 128);
    const top = 22;
    const bottom = HEIGHT - 54;
    const plotHeight = bottom - top;
    const plotWidth = right - left;
    const peak = Math.max(1, values.currentCost ?? 0, ...seriesValues(xMax, values));
    const yStep = displayStep(peak * 1.05, 4);
    const yMax = Math.ceil((peak * 1.05) / yStep) * yStep;
    const xStep = displayStep(xMax, narrow ? 4 : 5);
    const x = (income: number) => left + (income / xMax) * plotWidth;
    const y = (amount: number) => bottom - (amount / yMax) * plotHeight;
    const line = (x1: number, y1: number, x2: number, y2: number, className: string) =>
      svgNode(doc, 'line', { x1, y1, x2, y2, class: className });
    const text = (value: string, px: number, py: number, className: string, anchor = 'middle') =>
      svgNode(doc, 'text', { x: px, y: py, class: className, 'text-anchor': anchor }, value);

    svg.setAttribute('viewBox', `0 0 ${width} ${HEIGHT}`);
    svg.setAttribute('aria-label', copy.chartDescription(dollars.format(xMax), MODELS.length));
    const content = doc.createDocumentFragment();
    for (let step = 0; step <= Math.round(yMax / yStep); step++) {
      const amount = step * yStep;
      const gridLine = line(left, y(amount), right, y(amount), 'uhp-grid-line');
      gridLine.setAttribute('data-amount', String(amount));
      content.append(gridLine);
      const label = text(compactDollars.format(amount), left - 8, y(amount) + 4, 'uhp-tick', 'end');
      label.setAttribute('data-amount', String(amount));
      content.append(label);
    }
    for (let step = 0; step <= Math.floor(xMax / xStep); step++) {
      const income = step * xStep;
      const tick = text(compactDollars.format(income), x(income), bottom + 20, 'uhp-tick');
      tick.setAttribute('data-income', String(income));
      content.append(tick);
    }
    content.append(text(copy.chartIncome, (left + right) / 2, HEIGHT - 8, 'uhp-axis-title'));
    const vertical = text(copy.chartContribution, 0, 0, 'uhp-axis-title');
    vertical.setAttribute('transform', `translate(14 ${(top + bottom) / 2}) rotate(-90)`);
    content.append(vertical);

    if (values.currentCost !== undefined) {
      const currentY = y(values.currentCost);
      content.append(line(left, currentY, right, currentY, 'uhp-cost-line'));
    }

    const ends: { id: string; y: number }[] = [];
    MODELS.forEach((model, index) => {
      // Include schedule boundaries so short brackets remain visible on a wide income axis.
      const incomes = new Set(Array.from({ length: 241 }, (_, step) => xMax * (step / 240)));
      for (const bracket of schedule(model, values.size)) {
        if (bracket.from < xMax) incomes.add(bracket.from);
      }
      const points = [...incomes].sort((a, b) => a - b).map((income, i) => {
        const amount = bill(model, income, values.size, values.employer, values.payroll).household;
        return `${i ? 'L' : 'M'}${x(income).toFixed(2)},${y(amount).toFixed(2)}`;
      });
      content.append(svgNode(doc, 'path', { d: points.join(' '), class: `uhp-series ${seriesClass(index)}` }));
      ends.push({ id: String(model.id), y: y(bill(model, xMax, values.size, values.employer, values.payroll).household) });
    });

    // Lines that finish within a text height of each other share one label.
    if (!narrow) {
      const groups: { ids: string[]; y: number }[] = [];
      for (const end of ends.sort((a, b) => a.y - b.y)) {
        const last = groups[groups.length - 1];
        if (last && end.y - last.y < 15) last.ids.push(end.id);
        else groups.push({ ids: [end.id], y: end.y });
      }
      for (const group of groups) {
        const ids = [...group.ids].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
        const label = ids.length === 2 ? copy.models(`${ids[0]} & ${ids[1]}`) : modelsLabel(ids);
        content.append(text(label, right + 8, group.y + 4, 'uhp-end-label', 'start'));
      }
    }

    const youX = x(values.income);
    content.append(line(youX, top, youX, bottom, 'uhp-income-line'));
    content.append(text(copy.selectedIncome, Math.min(Math.max(youX, left + 12), right - 12), top - 7, 'uhp-you'));
    values.bills.forEach((result, index) => content.append(svgNode(doc, 'circle', {
      cx: youX, cy: y(result.household), r: 5, class: `uhp-dot ${seriesClass(index)}`,
    })));
    const hover = svgNode(doc, 'g', { class: 'uhp-hover' });
    content.append(hover);
    svg.replaceChildren(content);
    tip.hidden = true;

    inspect = event => {
      const bounds = svg.getBoundingClientRect();
      if (!bounds.width) return;
      const px = (event.clientX - bounds.left) / bounds.width * width;
      if (px < left || px > right) {
        hideTip();
        return;
      }
      const income = Math.min(xMax, Math.round(((px - left) / plotWidth) * xMax / 1000) * 1000);
      const amounts = seriesValues(income, values);
      const at = x(income);
      hover.replaceChildren(line(at, top, at, bottom, 'uhp-cross'));
      amounts.forEach((amount, index) => hover.append(svgNode(doc, 'circle', {
        cx: at, cy: y(amount), r: 4, class: `uhp-dot ${seriesClass(index)}`,
      })));
      tip.replaceChildren(element(doc, 'strong', copy.tipIncome(dollars.format(income))));
      MODELS.forEach((model, index) => {
        const row = element(doc, 'span');
        row.append(key(doc, seriesClass(index)), copy.model(model.id), element(doc, 'b', dollars.format(amounts[index])));
        tip.append(row);
      });
      // The readout sits right of the crosshair when it fits, else left, never off the plot.
      const scale = bounds.width / width;
      const room = at + 12 + TIP_WIDTH <= width;
      tip.style.left = `${(room ? at + 12 : Math.max(0, at - 12 - TIP_WIDTH)) * scale}px`;
      tip.hidden = false;
    };
  }

  function limit(income: number): number {
    return Math.max(250_000, Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(income * 1.2 / 50_000) * 50_000));
  }

  const resize = doc.defaultView?.ResizeObserver;
  const observer = resize ? new resize(entries => {
    const measured = Math.round(entries[0].contentRect.width);
    if (!measured) return;
    const next = Math.max(200, measured);
    if (next === width) return;
    width = next;
    if (input) draw(input, limit(input.income));
  }) : undefined;
  observer?.observe(plot);

  svg.addEventListener('pointermove', event => inspect?.(event));
  svg.addEventListener('pointerdown', event => inspect?.(event));
  // A finger lifting should not dismiss the readout it just opened.
  svg.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch') hideTip(); });
  svg.addEventListener('pointercancel', () => hideTip());

  return {
    figure,
    update(values: ChartInput | undefined) {
      input = values;
      figure.hidden = !values;
      if (!values) {
        // Leave no figures behind in the hidden chart.
        inspect = undefined;
        svg.replaceChildren();
        legend.replaceChildren();
        scroller.replaceChildren();
        captionContext.textContent = '';
        hideTip();
        return;
      }
      const xMax = limit(values.income);
      draw(values, xMax);
      captionContext.textContent = copy.chartContext(
        values.size, values.currentCost === undefined ? undefined : dollars.format(values.currentCost));

      const legendItems = MODELS.map((model, index) => {
        const item = element(doc, 'li', copy.model(model.id));
        item.prepend(key(doc, seriesClass(index)));
        return item;
      });
      if (values.currentCost !== undefined) {
        const item = element(doc, 'li', copy.currentLine);
        item.prepend(key(doc, 'uhp-key-now'));
        legendItems.push(item);
      }
      legend.replaceChildren(...legendItems);

      // One row per label: the reader's own income wins over a sample that prints the same.
      const samples = new Map<string, number>();
      for (const income of [values.income, 0, ...[1, 2, 3, 4, 5].map(step => Math.round(xMax * (step / 5)))]) {
        if (!samples.has(dollars.format(income))) samples.set(dollars.format(income), income);
      }
      const rows = [...samples].sort(([, a], [, b]) => a - b).map(([label, income]) =>
        [label, ...seriesValues(income, values).map(amount => dollars.format(amount))]);
      scroller.replaceChildren(table(doc, copy.chart, [copy.tableIncome, ...MODELS.map(model => copy.model(model.id))], rows));
    },
    destroy() {
      observer?.disconnect();
    },
  };
}
