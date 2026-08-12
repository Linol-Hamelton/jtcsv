#!/usr/bin/env node
// Bundle-size gate. Replaces size-limit which can't handle Node-side
// bundles (it tries to esbuild them as browser code and fails on `fs`).
// Reads dist/*.{esm,umd}.js, measures gzip size, fails if any limit exceeded.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Limits in bytes (gzipped). Tighten over time as the diet continues.
//
// This table is the single source of truth for the size gate.
// `package.json#size-limit` mirrors it for the optional `npm run size:why`
// report — keep the two in sync when a limit moves here.
const LIMITS = [
  { name: 'jtcsv/csv (entry)',           file: 'dist/csv.esm.js',     limit:      1024 },
  { name: 'jtcsv/json (entry)',          file: 'dist/json.esm.js',    limit:  3 * 1024 },
  { name: 'jtcsv/streams (entry)',       file: 'dist/streams.esm.js', limit:      1024 },
  { name: 'jtcsv/ndjson (entry)',        file: 'dist/ndjson.esm.js',  limit:  5 * 1024 },
  { name: 'jtcsv/tsv (entry)',           file: 'dist/tsv.esm.js',     limit:  4 * 1024 },
  // 3.2.3 added actionable hints + docs links to every error class, taking
  // this entry from ~2.4 KB to 3.7 KB. That is the feature, not a
  // regression — budget raised to 4.5 KB to leave ~20 % headroom.
  { name: 'jtcsv/errors (entry)',        file: 'dist/errors.esm.js',  limit:  4.5 * 1024 },
  // Barrel re-exports every entry, so it absorbs the errors growth above
  // and sat 0.2 KB over the old 50 KB budget. 55 KB restores headroom.
  { name: 'jtcsv (full barrel ESM)',     file: 'dist/index.esm.js',   limit: 55 * 1024 },
  { name: 'jtcsv/browser ESM',           file: 'dist/jtcsv.esm.js',   limit: 20 * 1024 },
  { name: 'jtcsv/browser UMD (CDN)',     file: 'dist/jtcsv.umd.js',   limit: 25 * 1024 }
];

// Real-world `import { csvToJson } from 'jtcsv/csv'` cost = entry + transitive shared chunks.
// Computed by reading dist/csv.esm.js and following its `import './_shared/...'` lines.
function importCost(entryFile) {
  const dir = path.dirname(entryFile);
  const src = fs.readFileSync(entryFile, 'utf8');
  const re = /from\s+['"](\.\/_shared\/[^'"]+)['"]/g;
  const seen = new Set([entryFile]);
  const queue = [];
  let m;
  while ((m = re.exec(src))) {
    queue.push(path.join(dir, m[1]));
  }
  let total = zlib.gzipSync(src).length;
  while (queue.length) {
    const next = queue.shift();
    if (seen.has(next)) {
      continue;
    }
    seen.add(next);
    if (!fs.existsSync(next)) {
      continue;
    }
    const code = fs.readFileSync(next, 'utf8');
    total += zlib.gzipSync(code).length;
    let mm;
    while ((mm = re.exec(code))) {
      queue.push(path.join(path.dirname(next), mm[1]));
    }
    re.lastIndex = 0;
  }
  return { total, files: seen.size };
}

const SUBPATH_IMPORT_LIMITS = [
  { name: "import { csvToJson } from 'jtcsv/csv'",       file: 'dist/csv.esm.js',     limit: 30 * 1024 },
  { name: "import { jsonToCsv } from 'jtcsv/json'",      file: 'dist/json.esm.js',    limit: 15 * 1024 },
  { name: "import * as s from 'jtcsv/streams'",          file: 'dist/streams.esm.js', limit: 35 * 1024 },
  { name: "import * as n from 'jtcsv/ndjson'",           file: 'dist/ndjson.esm.js',  limit: 25 * 1024 },
  { name: "import * as t from 'jtcsv/tsv'",              file: 'dist/tsv.esm.js',     limit: 40 * 1024 }
];

const fmt = (n) => `${(n / 1024).toFixed(1)} KB`;
let failed = 0;

console.log('\n  Entry file gzipped sizes\n');
for (const { name, file, limit } of LIMITS) {
  if (!fs.existsSync(file)) {
    console.log(`  - ${name.padEnd(34)} \x1b[31mMISSING\x1b[0m  ${file}`);
    failed++;
    continue;
  }
  const gz = zlib.gzipSync(fs.readFileSync(file)).length;
  const ok = gz <= limit;
  const colour = ok ? '\x1b[32m' : '\x1b[31m';
  const mark = ok ? 'OK ' : 'FAIL';
  console.log(`  - ${name.padEnd(34)} ${colour}${mark}\x1b[0m  ${fmt(gz).padStart(8)} / ${fmt(limit).padStart(8)}  ${file}`);
  if (!ok) {
    failed++;
  }
}

console.log('\n  Real import cost (entry + transitive _shared chunks)\n');
for (const { name, file, limit } of SUBPATH_IMPORT_LIMITS) {
  if (!fs.existsSync(file)) {
    console.log(`  - ${name.padEnd(48)} \x1b[31mMISSING\x1b[0m`);
    failed++;
    continue;
  }
  const { total, files } = importCost(file);
  const ok = total <= limit;
  const colour = ok ? '\x1b[32m' : '\x1b[31m';
  const mark = ok ? 'OK ' : 'FAIL';
  console.log(`  - ${name.padEnd(48)} ${colour}${mark}\x1b[0m  ${fmt(total).padStart(8)} / ${fmt(limit).padStart(8)}  (${files} chunk${files === 1 ? '' : 's'})`);
  if (!ok) {
    failed++;
  }
}

console.log('');
if (failed) {
  console.error(`  \x1b[31m${failed} size check${failed === 1 ? '' : 's'} failed\x1b[0m\n`);
  process.exit(1);
}
console.log('  \x1b[32mAll size checks passed\x1b[0m\n');
