#!/usr/bin/env node
/* eslint-disable no-console */
// scripts/verify-esm-bundles.js
//
// Guards the ESM half of the dual build, which no other suite reaches.
//
// Jest runs under CommonJS and the examples run through tsx, so both resolve
// away from dist/*.mjs entirely. 4.0.0 shipped ESM bundles carrying CommonJS
// globals that Rollup leaves as written — require() for the lazily probed Node
// built-ins (worker_threads, os, glob), and __dirname in the worker-script
// resolver. Neither exists in an ES module, so for ESM consumers every file
// API threw "require is not defined", and useWorkers threw "__dirname is not
// defined" on any input past the 1 MB / 20k-row threshold — while both worked
// perfectly under CommonJS. Nothing in CI noticed.
//
// Three checks, because none of them alone would have caught both:
//
//   1. Static: a Node-targeted ESM bundle using a CJS global must carry the
//      matching shim; a browser bundle must never import a node: builtin.
//   2. Runtime, small: import dist/index.mjs as real ESM and round-trip a
//      file — the require() path.
//   3. Runtime, past the threshold: parse enough CSV with useWorkers to
//      actually spawn workers — the __dirname path. A small input silently
//      stays synchronous and proves nothing.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const DIST = path.join(REPO_ROOT, 'dist');

// Bundles built for the browser: they must not reach for a Node global or
// import a node: builtin — bundlers and CDNs choke on the bare specifier.
const BROWSER_BUNDLES = new Set(['jtcsv.mjs', 'jtcsv-workers.mjs']);

// CommonJS globals that do not exist in an ES module, and the identifier the
// rollup banner introduces to restore each. Matching on the shim name rather
// than on the declaration keeps this honest if the banner is reworded.
const CJS_GLOBALS = [
  { name: 'require', re: /(^|[^.\w$])require\s*\(/, shim: '__jtcsvCreateRequire' },
  { name: '__dirname', re: /(^|[^.\w$])__dirname\b/, shim: '__jtcsvDirname' },
  { name: '__filename', re: /(^|[^.\w$])__filename\b/, shim: '__jtcsvFileURLToPath' },
];

const failures = [];
const checked = [];

const toPosix = (p) => p.split(path.sep).join('/');

function listMjs(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listMjs(p));
    else if (e.name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

if (!fs.existsSync(DIST)) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

// ---- 1. static ----------------------------------------------------------
for (const abs of listMjs(DIST)) {
  const rel = toPosix(path.relative(REPO_ROOT, abs));
  const src = fs.readFileSync(abs, 'utf8');
  const isBrowser = BROWSER_BUNDLES.has(path.basename(abs));

  for (const g of CJS_GLOBALS) {
    // The banner's own declaration line mentions the global; ignore it and
    // look at whether the shim that defines it is present.
    if (!g.re.test(src)) continue;
    if (isBrowser) {
      failures.push(rel + ': browser bundle uses ' + g.name);
    } else if (!src.includes(g.shim)) {
      failures.push(rel + ': uses ' + g.name + ' without the ESM shim '
        + '(add banner: NODE_ESM_BANNER to this output in rollup.config.mjs)');
    }
  }
  if (isBrowser && /from ['"]node:/.test(src)) {
    failures.push(rel + ': browser bundle imports a node: builtin');
  }
  checked.push(rel);
}

// ---- runtime ------------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jtcsv-esm-'));
const indexUrl = 'file:///' + toPosix(path.join(DIST, 'index.mjs'));

function runProbe(label, lines) {
  const probe = path.join(tmp, 'probe-' + label.replace(/\W+/g, '-') + '.mjs');
  fs.writeFileSync(probe, lines.join('\n'));
  const run = spawnSync(process.execPath, ['--max-old-space-size=2048', probe], {
    encoding: 'utf8',
    timeout: 180_000,
  });
  if (run.status !== 0 || !String(run.stdout).includes('ok')) {
    const why = String(run.stderr || run.stdout || 'no output')
      .split('\n')
      .filter((l) => l.trim() && !/^\s+at /.test(l))
      .slice(0, 3)
      .join(' | ');
    failures.push('dist/index.mjs: ' + label + ' failed under real ESM -> ' + why);
  }
}

// 2. The require() path: a file round-trip.
runProbe('file round-trip', [
  "import assert from 'node:assert/strict';",
  `const { saveAsCsv, readCsvAsJson } = await import(${JSON.stringify(indexUrl)});`,
  `const file = ${JSON.stringify(path.join(tmp, 'rt.csv'))};`,
  "const rows = [{ id: '1', city: 'Paris, France' }];",
  'await saveAsCsv(rows, file);',
  'assert.deepEqual(await readCsvAsJson(file), rows);',
  "console.log('ok');",
]);

// 3. The __dirname path: workers only spawn past DEFAULT_CSV_THRESHOLD (1 MB),
// so the input has to be genuinely large or this check passes vacuously.
runProbe('worker parse past the threshold', [
  "import assert from 'node:assert/strict';",
  `const { csvToJsonAsync, jsonToCsv } = await import(${JSON.stringify(indexUrl)});`,
  "const N = 40000;",
  "const src = Array.from({ length: N }, (_, i) => ({ id: String(i), v: 'padding-to-clear-the-byte-threshold' }));",
  'const csv = jsonToCsv(src);',
  "assert.ok(csv.length > 1024 * 1024, 'input too small to spawn workers');",
  'const rows = await csvToJsonAsync(csv, { useWorkers: true, workerCount: 2 });',
  'assert.equal(rows.length, N);',
  "assert.equal(rows[N - 1].id, String(N - 1));",
  "console.log('ok');",
]);

fs.rmSync(tmp, { recursive: true, force: true });

// ---- report -------------------------------------------------------------
if (failures.length) {
  console.error('ESM bundle verification FAILED\n');
  for (const f of failures) console.error('  x ' + f);
  console.error('\n' + failures.length + ' problem(s) in ' + checked.length + ' bundle(s).');
  process.exit(1);
}
console.log('ESM bundles OK — ' + checked.length
  + ' checked, file round-trip and worker parse verified.');
