import { bill, MODELS, schedule } from '../model/uhp-model';
import type { Bill, EmployerKind } from '../model/uhp-model';
import { element, scrollRegion, status, table } from './dom';
import { compactDollars, copy, dollars } from './strings';

interface ChartInput {
  income: number;
  size: number;
  employer: EmployerKind;
  payroll?: number;
  currentCost?: number;
  bills: readonly Bill[];
}

const SVG_NS = 'http://www.w3.org/2000/svg';

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
  return `series-${index + 1}`;
}

export function createChart(doc: Document, lookupId: string) {
  const figure = element(doc, 'figure', undefined, 'chart');
  const caption = element(doc, 'figcaption', copy.chart);
  const legend = element(doc, 'ul', undefined, 'chart-legend');
  legend.setAttribute('role', 'list');
  const plot = element(doc, 'div', undefined, 'uhp-plot');
  const svg = svgNode(doc, 'svg', { role: 'img' });
  const inspection = element(doc, 'p', undefined, 'chart-inspection');
  const lookupField = element(doc, 'div', undefined, 'field chart-lookup');
  const label = element(doc, 'label', copy.inspectIncome);
  label.htmlFor = lookupId;
  const lookup = element(doc, 'input');
  lookup.id = lookupId;
  lookup.type = 'number';
  lookup.inputMode = 'decimal';
  lookup.autocomplete = 'off';
  lookup.min = '0';
  lookup.step = 'any';
  const lookupHint = element(doc, 'p', undefined, 'hint');
  lookupHint.id = `${lookupId}-hint`;
  lookup.setAttribute('aria-describedby', lookupHint.id);
  const lookupStatus = status(doc);
  lookupStatus.classList.add('visually-hidden');
  lookupField.append(label, lookup, lookupHint);
  const details = element(doc, 'details');
  const scroller = scrollRegion(doc, copy.chart);
  const comparison = element(doc, 'p', undefined, 'hint');
  details.append(element(doc, 'summary', copy.chartTable), comparison, scroller);
  plot.append(svg);
  figure.append(caption, legend, plot, lookupField, inspection, lookupStatus, details);
  figure.hidden = true;

  let input: ChartInput | undefined;
  let width = 720;
  let inspect: ((event: PointerEvent) => void) | undefined;
  let restoreInspection: ((announce?: boolean) => void) | undefined;

  function seriesValues(income: number, values: ChartInput) {
    return MODELS.map(model => bill(model, income, values.size, values.employer, values.payroll).household);
  }

  function showInspection(income: number, amounts: readonly number[]) {
    inspection.textContent = [
      copy.chartSample(dollars.format(income)),
      ...MODELS.map((model, index) => copy.modelAmount(copy.model(model.id), dollars.format(amounts[index]))),
    ].join(' ');
  }

  function draw(values: ChartInput, xMax: number) {
    const height = 310;
    const left = width < 380 ? 58 : 68;
    const right = width - 25;
    const top = 24;
    const bottom = height - 54;
    const plotHeight = bottom - top;
    const plotWidth = right - left;
    const peak = Math.max(1, values.currentCost ?? 0, ...seriesValues(xMax, values));
    const yStep = displayStep(peak, 5);
    const yMax = Math.ceil(peak / yStep) * yStep;
    const xStep = displayStep(xMax, width < 480 ? 4 : 6);
    const x = (income: number) => left + (income / xMax) * plotWidth;
    const y = (amount: number) => bottom - (amount / yMax) * plotHeight;
    const line = (x1: number, y1: number, x2: number, y2: number, className: string) =>
      svgNode(doc, 'line', { x1, y1, x2, y2, class: className });
    const text = (value: string, px: number, py: number, className: string, anchor = 'middle') =>
      svgNode(doc, 'text', { x: px, y: py, class: className, 'text-anchor': anchor }, value);

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('aria-label', copy.chartDescription(dollars.format(xMax)));
    const content = doc.createDocumentFragment();
    for (let step = 0; step <= Math.round(yMax / yStep); step++) {
      const amount = step * yStep;
      content.append(line(left, y(amount), right, y(amount), 'grid-line'));
      content.append(text(compactDollars.format(amount), left - 6, y(amount) + 4, 'tick', 'end'));
    }
    for (let step = 0; step <= Math.floor(xMax / xStep); step++) {
      const income = step * xStep;
      content.append(text(compactDollars.format(income), x(income), bottom + 20, 'tick'));
    }
    content.append(text(copy.chartIncome, (left + right) / 2, height - 8, 'axis-title'));
    const vertical = text(copy.chartContribution, 0, 0, 'axis-title');
    vertical.setAttribute('transform', `translate(13 ${(top + bottom) / 2}) rotate(-90)`);
    content.append(vertical);

    if (values.currentCost !== undefined) {
      const currentY = y(values.currentCost);
      content.append(line(left, currentY, right, currentY, 'cost-line'));
    }

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
      content.append(svgNode(doc, 'path', { d: points.join(' '), class: `series ${seriesClass(index)}` }));
    });

    function addMarker(group: Node, income: number, amounts: readonly number[]) {
      const at = x(income);
      group.appendChild(line(at, top, at, bottom, 'income-line'));
      amounts.forEach((amount, index) => group.appendChild(svgNode(doc, 'circle', {
        cx: at, cy: y(amount), r: 4, class: `dot ${seriesClass(index)}`,
      })));
    }

    addMarker(content, values.income, values.bills.map(result => result.household));
    const markerX = x(values.income);
    const anchor = markerX > right - 58 ? 'end' : 'start';
    content.append(text(copy.selectedIncome, markerX + (anchor === 'end' ? -4 : 4), top - 8, 'tick', anchor));
    const marker = svgNode(doc, 'g');
    content.append(marker);
    svg.replaceChildren(content);

    lookup.max = String(xMax);
    lookupHint.textContent = copy.inspectHint(dollars.format(xMax));
    restoreInspection = (announce = false) => {
      const valid = lookup.validity.valid;
      const income = valid && lookup.value !== '' ? lookup.valueAsNumber : values.income;
      if (valid) lookup.removeAttribute('aria-invalid');
      else lookup.setAttribute('aria-invalid', 'true');
      const amounts = seriesValues(income, values);
      marker.replaceChildren();
      if (income !== values.income) addMarker(marker, income, amounts);
      showInspection(income, amounts);
      if (announce) lookupStatus.textContent = valid ? inspection.textContent : lookupHint.textContent;
    };
    restoreInspection();

    inspect = event => {
      const bounds = svg.getBoundingClientRect();
      if (!bounds.width) return;
      const px = (event.clientX - bounds.left) / bounds.width * width;
      if (px < left || px > right) {
        restoreInspection?.();
        return;
      }
      const income = Math.min(xMax, Math.round(((px - left) / plotWidth) * xMax));
      const amounts = seriesValues(income, values);
      marker.replaceChildren();
      addMarker(marker, income, amounts);
      showInspection(income, amounts);
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
  svg.addEventListener('pointerleave', () => restoreInspection?.());
  svg.addEventListener('pointercancel', () => restoreInspection?.());
  lookup.addEventListener('input', () => restoreInspection?.(true));

  return {
    figure,
    update(values: ChartInput | undefined) {
      input = values;
      figure.hidden = !values;
      if (!values) return;
      const xMax = limit(values.income);
      draw(values, xMax);
      function legendItem(label: string, className: string) {
        const item = element(doc, 'li', label);
        const key = svgNode(doc, 'svg', { class: 'key', viewBox: '0 0 30 8', 'aria-hidden': 'true' });
        key.append(svgNode(doc, 'line', { x1: 0, x2: 30, y1: 4, y2: 4, class: className }));
        item.prepend(key);
        return item;
      }
      const legendItems = MODELS.map((model, index) =>
        legendItem(copy.model(model.id), `series ${seriesClass(index)}`));
      if (values.currentCost !== undefined) {
        legendItems.push(legendItem(copy.currentLine, 'cost-line'));
      }
      legend.replaceChildren(...legendItems);

      const samples = new Set([0, values.income, ...[1, 2, 3, 4, 5].map(step => Math.round(xMax * (step / 5)))]);
      const rows = [...samples].sort((a, b) => a - b).map(income =>
        [dollars.format(income), ...seriesValues(income, values).map(amount => dollars.format(amount))]);
      scroller.replaceChildren(table(doc, [copy.chartIncome, ...MODELS.map(model => copy.model(model.id))], rows));
      comparison.hidden = values.currentCost === undefined;
      comparison.textContent = values.currentCost === undefined ? '' :
        copy.chartComparison(dollars.format(values.currentCost));
    },
    destroy() {
      observer?.disconnect();
    },
  };
}
