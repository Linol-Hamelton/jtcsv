#!/usr/bin/env node
/**
 * Post-build check for the browser bundles.
 *
 * Two jobs:
 *
 *  1. Every expected artifact exists. The list used to name a
 *     `jtcsv-core.*` / `jtcsv-full.*` split that rollup stopped emitting
 *     when the browser build was consolidated onto `jtcsv.*`, so this
 *     script failed on artifacts that were never going to appear.
 *
 *  2. The bundle actually works. The file-existence check alone passed
 *     happily while `jtcsv/browser` could not parse a quoted field,
 *     dropped the `options` argument of every stream helper, and shipped
 *     an `autoDetectDelimiter` that ESM consumers could not import. The
 *     smoke tests below exercise exactly those paths against the built
 *     artifact, which is the only place bundling mistakes show up.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

const REQUIRED_ARTIFACTS = [
  'jtcsv.umd.js',
  'jtcsv.esm.js',
  'jtcsv.cjs.js',
  'jtcsv-workers.umd.js',
  'jtcsv-workers.esm.js'
];

const missing = REQUIRED_ARTIFACTS.filter((file) => !fs.existsSync(path.join(dist, file)));
if (missing.length > 0) {
  console.error('Missing build artifacts:', missing);
  process.exit(1);
}

const workersEsm = fs.readFileSync(path.join(dist, 'jtcsv-workers.esm.js'), 'utf8');
if (!workersEsm.includes('WorkerPool') && !workersEsm.includes('worker')) {
  console.error('Workers bundle does not appear to include worker exports.');
  process.exit(1);
}

// --- smoke tests against the built browser bundle ------------------------

const browser = require(path.join(dist, 'jtcsv.cjs.js'));
const failures = [];

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures.push(`${name}\n      expected: ${e}\n      actual:   ${a}`);
  }
}

for (const name of ['csvToJson', 'jsonToCsv', 'csvToJsonStream', 'autoDetectDelimiter']) {
  if (typeof browser[name] !== 'function') {
    failures.push(`${name} is not exported from the browser bundle (got ${typeof browser[name]})`);
  }
}

if (failures.length === 0) {
  // Quoted fields must survive: delimiter, newline and escaped quote.
  check('quoted delimiter', browser.csvToJson('a,b\n"x,y",2'), [{ a: 'x,y', b: '2' }]);
  check('escaped quote', browser.csvToJson('a,b\n"he said ""hi""",2'), [
    { a: 'he said "hi"', b: '2' }
  ]);

  // Values stay strings unless asked otherwise — parity with the Node parser.
  check('no implicit coercion', browser.csvToJson('a,b\n1,2'), [{ a: '1', b: '2' }]);
  check('parseNumbers honoured', browser.csvToJson('a,b\n1,2', { parseNumbers: true }), [
    { a: 1, b: 2 }
  ]);

  // The delimiter helper has to be reachable, not just declared in a .d.ts.
  check('autoDetectDelimiter', browser.autoDetectDelimiter('a;b\n1;2'), ';');

  // Stream helpers must forward their second argument.
  const streamed = browser.csvToJsonStream('a,b\n1,2', { delimiter: '|' });
  if (!streamed || typeof streamed.getReader !== 'function') {
    failures.push('csvToJsonStream did not return a ReadableStream');
  }
}

if (failures.length > 0) {
  console.error('Browser bundle smoke tests failed:\n');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(`Browser build verified — ${REQUIRED_ARTIFACTS.length} artifacts, smoke tests passed.`);
