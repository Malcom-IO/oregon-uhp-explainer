/**
 * What the comparison page adds when scripts run. The build has already written the
 * figures for the Board's example household into the page (render.ts, through `uhp:`
 * markers); this shows the household form and redraws them for the reader's household
 * and chosen model. The page's shell (theme, top bar, printing) comes from src/site/main.ts.
 */
import './compare.css';
import { MODELS } from '../model/uhp-model';
import type { EmployerKind } from '../model/uhp-model';
import { announcer, parseAmount, status } from '../widget/dom';
import { usd } from '../site/format';
import { START_MODEL, groupOf2026, owed, whoPays } from './render';

export function start(doc: Document): void {
  const q = <T extends Element>(sel: string) => doc.querySelector<T>(sel);
  const form = q<HTMLFormElement>('[data-cmp-form]'), models = q<HTMLElement>('[data-cmp-models]');
  const picker = q<HTMLElement>('[data-cmp-picker]'), whoBox = q<HTMLElement>('[data-cmp-who]');
  const error = q<HTMLElement>('[data-cmp-error]'), heading = q<HTMLElement>('#who-pays-title');
  if (!form || !models || !picker || !whoBox || !error || !heading) return;
  const field = form.elements.namedItem('income') as HTMLInputElement;
  const sizeField = form.elements.namedItem('size') as HTMLSelectElement;
  const employerField = form.elements.namedItem('employer') as HTMLSelectElement;

  // The form and the model buttons only work with scripts, so they start hidden.
  form.hidden = false;
  picker.hidden = false;
  q('[data-cmp-static]')?.setAttribute('hidden', '');
  const live = status(doc);
  live.className = 'xp-vh'; // the site's visually hidden class; the widget's only applies inside the calculator
  form.after(live);
  const say = announcer(live);

  let shown = START_MODEL;
  const buttons = MODELS.map((m) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.textContent = `Model ${m.id}`;
    b.addEventListener('click', () => { shown = Number(m.id); update(); });
    picker.append(b);
    return b;
  });

  // "Who pays, by income" under a model: show that model, then move to the chart's heading.
  models.addEventListener('click', (e) => {
    const link = (e.target as Element).closest<HTMLElement>('[data-cmp-show]');
    if (!link) return;
    e.preventDefault();
    shown = Number(link.dataset['cmpShow']);
    update();
    const smooth = !doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    heading.focus({ preventScroll: true });
  });

  let first = true;
  function update(): void {
    const typed = parseAmount(field.value);
    const ok = typed !== undefined && Number.isFinite(typed);
    error!.hidden = ok;
    field.setAttribute('aria-invalid', String(!ok));
    // The message is described only while it shows; a hidden one would still be read.
    if (ok) field.removeAttribute('aria-describedby'); else field.setAttribute('aria-describedby', error!.id);

    const yours = ok ? owed(typed, Number(sizeField.value), employerField.value as EmployerKind) : null;
    MODELS.forEach((m, i) => {
      const out = doc.querySelector(`[data-cmp-you="${m.id}"]`);
      if (out) out.textContent = yours ? usd(yours[i]) : '—';
    });
    // Announced once typing pauses; the state at load is only remembered.
    if (yours) say.say(`A year for you: ${MODELS.map((m, i) => `Model ${m.id}, ${usd(yours[i])}`).join('; ')}.`, first);
    first = false;

    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i + 1 === shown)));
    whoBox!.innerHTML = whoPays(shown, ok ? groupOf2026(typed) : -1);
  }
  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();
}

if (typeof document !== 'undefined') start(document);
