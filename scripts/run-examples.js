#!/usr/bin/env node
/* eslint-disable no-console */
// scripts/run-examples.js
// Runs the DOCS M4 smoke set of 15 examples via `npx tsx <path>`.
// Each example must exit 0 AND have 'ok' as its last non-empty stdout line.

'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

const EXAMPLES = [
  'examples/error-handling.ts',
  'examples/ndjson-processing.ts',
  'examples/typescript-example.ts',
  'examples/large-dataset-example.ts',
  'examples/ci-smoke/01-parse-csv.ts',
  'examples/ci-smoke/02-serialize-json.ts',
  'examples/ci-smoke/03-roundtrip-integrity.ts',
  'examples/ci-smoke/04-streaming-csv-to-json.ts',
  'examples/ci-smoke/05-streaming-json-to-csv.ts',
  'examples/ci-smoke/06-ndjson-roundtrip.ts',
  'examples/ci-smoke/07-tsv-roundtrip.ts',
  'examples/ci-smoke/08-errors-catch.ts',
  'examples/ci-smoke/09-csv-injection-guard.ts',
  'examples/ci-smoke/10-schema-validation.ts',
  'examples/ci-smoke/11-fast-path-engine.ts',
];

const TIMEOUT_MS = 60_000;
const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function lastNonEmpty(s) {
  const lines = String(s || '').split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (t) return t;
  }
  return '';
}

const results = [];

for (const rel of EXAMPLES) {
  const abs = path.join(REPO_ROOT, rel);
  const start = Date.now();
  const r = spawnSync(npxBin, ['tsx', abs], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    // Windows: npx is a .cmd shim, must be invoked via shell.
    shell: process.platform === 'win32',
    env: process.env,
  });
  const dur = Date.now() - start;

  let pass = true;
  let reason = '';
  if (r.error) {
    pass = false;
    reason = `spawn-error: ${r.error.message}`;
  } else if (r.status !== 0) {
    pass = false;
    reason = `exit ${r.status}`;
  } else if (lastNonEmpty(r.stdout) !== 'ok') {
    pass = false;
    reason = `missing 'ok' tail (last: ${JSON.stringify(lastNonEmpty(r.stdout))})`;
  }

  results.push({
    path: rel,
    durationMs: dur,
    pass,
    reason,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  });

  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${rel}  (${dur}ms)${pass ? '' : ' — ' + reason}`);
  if (!pass) {
    const so = (r.stdout || '').trim();
    const se = (r.stderr || '').trim();
    if (so) console.log('  --- stdout ---\n' + so.split('\n').map((l) => '  ' + l).join('\n'));
    if (se) console.log('  --- stderr ---\n' + se.split('\n').map((l) => '  ' + l).join('\n'));
  }
}

console.log('');
console.log('=== Summary ===');
const colPath = Math.max(...results.map((r) => r.path.length), 4);
console.log(
  'path'.padEnd(colPath) + '  ' + 'durMs'.padStart(7) + '  result'
);
console.log('-'.repeat(colPath + 17));
for (const r of results) {
  console.log(
    r.path.padEnd(colPath) +
      '  ' +
      String(r.durationMs).padStart(7) +
      '  ' +
      (r.pass ? 'PASS' : 'FAIL')
  );
}

const failed = results.filter((r) => !r.pass).length;
const passed = results.length - failed;
console.log('');
console.log(`Total: ${results.length}  Passed: ${passed}  Failed: ${failed}`);

process.exit(failed === 0 ? 0 : 1);
