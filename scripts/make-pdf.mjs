// Prints the built explainer page to dist/oregon-uhp-explainer.pdf.
//
// The page's own print styles do the work (light colors, no buttons, every
// collapsed section open), so the PDF cannot drift from the page. Run it after
// `npm run build`, with the same BASE_PATH:
//
//   npm run build && npm run pdf
//
// PUBLIC_URL is the address the site is published at, for example
// https://example.github.io/oregon-uhp-explainer. A PDF is read away from the
// site, from a download folder or an email, so its links to the site must be
// full addresses; the script writes PUBLIC_URL into them and into the notes
// that say where the calculators are. The Pages workflow passes the address
// GitHub reports for the repository, so a fork's PDF points at the fork. Left
// unset, the PDF keeps relative links and says "the project's site".
//
// Needs Chrome or Chromium: set CHROME_PATH, or have it in a usual place. No
// npm dependencies: a static file server, and the DevTools protocol over
// Node's built-in WebSocket.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SITE = join(ROOT, 'dist');
const FILE = 'oregon-uhp-explainer.pdf';
const OUT = join(SITE, FILE);
/** The path the build was made for, as in vite.config.ts. */
const BASE = `/${(process.env.BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');
/** Where the site is published, without a trailing slash; empty when not given. */
const PUBLIC_URL = (process.env.PUBLIC_URL ?? '').trim().replace(/\/+$/, '');
if (!PUBLIC_URL && process.env.REQUIRE_PUBLIC_URL === 'true') {
  console.error('PUBLIC_URL is required here: a published PDF must link to the published site. ' +
    'In the Pages workflow it comes from actions/configure-pages; check that GitHub Pages is enabled.');
  process.exit(1);
}
if (PUBLIC_URL && !/^https?:\/\/[^/\s]+/.test(PUBLIC_URL)) {
  console.error(`PUBLIC_URL must be a full http(s) address, got "${PUBLIC_URL}".`);
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) throw new Error('Chrome not found. Set CHROME_PATH to a Chrome or Chromium binary.');
  return found;
}

/** Serves dist/ under BASE the way Pages does: a directory answers with its index.html. */
function serve() {
  const server = createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (!pathname.startsWith(BASE)) {
      res.writeHead(404).end();
      return;
    }
    let file = join(SITE, normalize(pathname.slice(BASE.length - 1)));
    if (file !== SITE && !file.startsWith(SITE + sep)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function launch(chromePath, profile) {
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--hide-scrollbars',
      // CI runners have no user namespace sandbox for Chrome.
      ...(process.env.CI ? ['--no-sandbox'] : []),
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  const ready = new Promise((resolve, reject) => {
    let log = '';
    const timer = setTimeout(() => reject(new Error(`Chrome did not start:\n${log}`)), 30_000);
    chrome.stderr.on('data', (chunk) => {
      log += chunk;
      const match = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    chrome.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited (${code}) before it was ready:\n${log}`));
    });
  });
  return { chrome, ready };
}

/** A minimal DevTools protocol client. */
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('Could not connect to Chrome')), { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  // If Chrome goes away, fail what is waiting instead of hanging until the time limit.
  ws.addEventListener('close', () => {
    for (const waiting of pending.values()) waiting.reject(new Error(`${waiting.method}: Chrome closed the connection`));
    pending.clear();
  });
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const waiting = pending.get(message.id);
    if (!waiting) return;
    pending.delete(message.id);
    if (message.error) waiting.reject(new Error(`${waiting.method}: ${message.error.message}`));
    else waiting.resolve(message.result);
  });
  return {
    send(method, params = {}, sessionId) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        ws.send(JSON.stringify({ id, method, params, sessionId }));
      });
    },
    close: () => ws.close(),
  };
}

const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function render(cdp, origin) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) throw new Error(`In page: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    return result.value;
  };

  await send('Page.enable');
  // Print styles from the first paint on, and the light look whatever this machine prefers.
  await send('Emulation.setEmulatedMedia', {
    media: 'print',
    features: [{ name: 'prefers-color-scheme', value: 'light' }],
  });
  await send('Page.navigate', { url: `${origin}${BASE}?theme=light` });

  // Wait for the scripts: the calculator only draws its chart lines in the browser.
  const drawn = await evaluate(`new Promise((resolve) => {
    const started = Date.now();
    (function check() {
      if (document.querySelector('.uhp-plot path.uhp-series')) return resolve(true);
      if (Date.now() - started > 20000) return resolve(false);
      setTimeout(check, 100);
    })();
  })`);
  if (!drawn) throw new Error('The page did not finish rendering (no chart lines after 20s).');

  const facts = await evaluate(`(async () => {
    const publicUrl = ${JSON.stringify(PUBLIC_URL)};
    const base = ${JSON.stringify(BASE)};
    const page = document.querySelector('.uhp-page');
    // Open every collapsed section.
    const details = [...document.querySelectorAll('details')];
    for (const d of details) d.open = true;
    // Links to this temporary server become links to the published site. A link to a
    // section of this same page stays inside the PDF.
    let links = 0;
    for (const a of document.querySelectorAll('a[href]')) {
      if (a.origin !== location.origin) continue;
      if (a.pathname === location.pathname && a.hash && a.getAttribute('href').startsWith('#')) continue;
      if (!publicUrl) continue;
      a.href = publicUrl + '/' + a.pathname.slice(base.length) + a.search + a.hash;
      links++;
    }
    // The notes that say where the calculators are name the published address.
    const addresses = [...document.querySelectorAll('[data-uhp-web-address]')];
    if (publicUrl) for (const span of addresses) span.textContent = publicUrl.replace(/^https?:\\/\\//, '');
    await document.fonts.ready;
    // Two frames, so the charts have resized to the paper's width.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 300));
    return {
      details: details.length,
      links,
      addresses: addresses.length,
      theme: page?.dataset.uhpTheme,
      title: document.querySelector('h1')?.textContent.trim() ?? '',
      snapshot: document.querySelector('.xp-snapshot')?.firstChild?.textContent.trim().replace(/\\s+/g, ' ') ?? '',
      leftovers: [...document.querySelectorAll('a[href]')].filter((a) => a.origin === location.origin
        && !(a.pathname === location.pathname && a.getAttribute('href').startsWith('#'))).length,
    };
  })()`);
  if (facts.theme !== 'light') throw new Error(`Expected the light theme, got "${facts.theme}".`);
  if (!facts.title) throw new Error('No page title found.');
  if (facts.addresses < 3) throw new Error(`Expected the print notes with the web address, found ${facts.addresses}.`);
  if (PUBLIC_URL && facts.leftovers) throw new Error(`${facts.leftovers} links still point at the temporary server.`);

  // Stamped on every page: what this is, where it lives, and the page number.
  const where = PUBLIC_URL ? ` &nbsp;·&nbsp; ${escapeHtml(PUBLIC_URL.replace(/^https?:\/\//, ''))}` : '';
  const footer = `<div style="width:100%;padding:0 0.5in;font:8px system-ui,sans-serif;color:#555;display:flex;justify-content:space-between;gap:12px">
    <span>Unofficial &nbsp;·&nbsp; ${escapeHtml(facts.snapshot)}${where}</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;
  const { data } = await send('Page.printToPDF', {
    printBackground: true,
    paperWidth: 8.5,
    paperHeight: 11,
    marginTop: 0.5,
    marginBottom: 0.6,
    marginLeft: 0.5,
    marginRight: 0.5,
    // Lays the page out about 1000px wide, so it prints the desktop layout.
    scale: 0.72,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: footer,
    generateDocumentOutline: true,
  });
  const pdf = Buffer.from(data, 'base64');
  if (pdf.subarray(0, 5).toString() !== '%PDF-' || pdf.length < 50_000) {
    throw new Error(`Chrome returned something that is not a full PDF (${pdf.length} bytes).`);
  }
  writeFileSync(OUT, pdf);
  console.log(
    `Wrote dist/${FILE} (${Math.round(pdf.length / 1024)} KB, ${facts.details} sections opened, ` +
      (PUBLIC_URL ? `${facts.links} links pointed at ${PUBLIC_URL})` : 'links left relative: PUBLIC_URL is not set)'),
  );
  await cdp.send('Target.closeTarget', { targetId });
}

async function main() {
  if (!existsSync(join(SITE, 'index.html'))) throw new Error('dist/index.html is missing. Run "npm run build" first.');
  const chromePath = findChrome();
  const server = await serve();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = mkdtempSync(join(tmpdir(), 'uhp-pdf-'));
  const { chrome, ready } = launch(chromePath, profile);
  // Nothing here should take long; never let a stalled Chrome hold up a deploy.
  setTimeout(() => {
    console.error('Gave up after 2 minutes.');
    chrome.kill();
    rmSync(profile, { recursive: true, force: true });
    process.exit(1);
  }, 120_000).unref();
  try {
    const cdp = await connect(await ready);
    await render(cdp, origin);
    cdp.close();
  } finally {
    chrome.kill();
    server.close();
    await new Promise((r) => setTimeout(r, 200));
    rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
