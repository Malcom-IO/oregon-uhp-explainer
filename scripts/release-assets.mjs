// Assembles the files a release publishes into release/, from a finished build:
//
//   BASE_PATH=./ npm run build && npm run pdf && npm run release:assets
//
// (BASE_PATH=./ builds with relative paths, so the site in the ZIP works at any address.)
//
// release/ then holds the calculator library (oregon-uhp.js, .css, .d.ts), the
// PDF of the explainer, a ZIP of the whole built site to host, SHA256SUMS for
// all of them, and notes.md, the CHANGELOG entry for this version. The release
// workflow (.github/workflows/release.yml) runs this and publishes the folder;
// run it locally to see exactly what a release would contain.
//
// With RELEASE_TAG set (as the workflow does), it refuses to run unless the tag
// is "v" plus the version in package.json, CITATION.cff and the top CHANGELOG
// entry, so a release cannot go out under a number the files do not carry.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, 'dist');
const OUT = join(ROOT, 'release');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

function fail(message) {
  console.error(message);
  process.exit(1);
}

const version = JSON.parse(read('package.json')).version;
const cited = read('CITATION.cff').match(/^version:\s*"?([^"\n]+)"?\s*$/m)?.[1];
const changelog = read('CHANGELOG.md');
const entry = changelog.match(/^## (\S+) · ([^\n]+)\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
if (!entry) fail('CHANGELOG.md has no "## <version> · <snapshot>" entry.');
const [, logged, snapshot, body] = entry;
if (cited !== version || logged !== version) {
  fail(`Versions disagree: package.json ${version}, CITATION.cff ${cited}, CHANGELOG.md ${logged}.`);
}
const tag = process.env.RELEASE_TAG;
if (tag && tag !== `v${version}`) fail(`The tag ${tag} does not match version ${version}; expected v${version}.`);

const needed = ['index.html', 'lib/oregon-uhp.js', 'lib/oregon-uhp.css', 'lib/oregon-uhp.d.ts', 'oregon-uhp-explainer.pdf'];
for (const file of needed) {
  if (!existsSync(join(DIST, file))) fail(`dist/${file} is missing. Run "npm run build" and "npm run pdf" first.`);
}
if (!read('dist/lib/oregon-uhp.js').includes(`calculator ${version} `)) {
  fail(`dist/lib/oregon-uhp.js does not carry version ${version} in its banner; rebuild.`);
}
if (!read('dist/index.html').includes(`Version ${version} `)) {
  fail(`dist/index.html does not show version ${version}; rebuild.`);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
const site = `oregon-uhp-explainer-${version}-site`;
const files = {
  'oregon-uhp.js': 'lib/oregon-uhp.js',
  'oregon-uhp.css': 'lib/oregon-uhp.css',
  'oregon-uhp.d.ts': 'lib/oregon-uhp.d.ts',
  [`oregon-uhp-explainer-${version}.pdf`]: 'oregon-uhp-explainer.pdf',
};
for (const [name, from] of Object.entries(files)) cpSync(join(DIST, from), join(OUT, name));

// The built site in a folder named for the version, so it unpacks into one place.
const staging = join(OUT, site);
cpSync(DIST, staging, { recursive: true });
execFileSync('zip', ['-qrX', `${site}.zip`, site], { cwd: OUT });
rmSync(staging, { recursive: true });

const assets = [...Object.keys(files), `${site}.zip`].sort();
const sums = assets.map((name) => `${createHash('sha256').update(readFileSync(join(OUT, name))).digest('hex')}  ${name}`);
writeFileSync(join(OUT, 'SHA256SUMS'), `${sums.join('\n')}\n`);

// Links in the changelog are relative to the repository; in release notes they must be full addresses.
const repoFile = `https://github.com/Malcom-IO/oregon-uhp-explainer/blob/v${version}/`;
const notesBody = body.trim().replace(/\]\((?!https?:|mailto:|#|\/)([^)]+)\)/g, (_, path) => `](${repoFile}${path})`);
writeFileSync(join(OUT, 'notes.md'), `**Source snapshot: ${snapshot}.**

${notesBody}

### Files

- \`oregon-uhp.js\`, \`oregon-uhp.css\` and \`oregon-uhp.d.ts\`: the calculator as a module. See [docs/reuse.md](https://github.com/Malcom-IO/oregon-uhp-explainer/blob/v${version}/docs/reuse.md).
- \`oregon-uhp-explainer-${version}.pdf\`: the explainer page as a PDF.
- \`${site}.zip\`: the whole site, built with relative paths so it works at any address. Unzip it and serve the folder; nothing on it calls out to another server.
- \`SHA256SUMS\`: a checksum for each file. Check a copy with \`shasum -a 256 -c SHA256SUMS\`.
`);

console.log(`release/ for ${version} (${snapshot}):\n${sums.map((line) => `  ${line.slice(66)}`).join('\n')}`);
