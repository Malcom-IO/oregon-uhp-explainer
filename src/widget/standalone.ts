import { mount } from './index';
import type { WidgetTheme } from './index';
import { copy } from './strings';

const host = document.querySelector<HTMLElement>('#calculator');
if (host) {
  document.title = copy.title;
  // A page that frames the calculator can pin its look: index.html?theme=light or ?theme=dark.
  const theme = new URLSearchParams(location.search).get('theme');
  if (theme === 'light' || theme === 'dark') {
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
  }
  mount(host, { headingLevel: 1, theme: (theme ?? 'auto') as WidgetTheme });
}
