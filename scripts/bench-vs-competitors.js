#!/usr/bin/env node
/* eslint-disable no-console, @typescript-eslint/no-require-imports */
/**
 * Head-to-head benchmark: jtcsv vs papaparse vs csv-parse vs fast-csv.
 *
 * Measures CSV→JSON parsing time on three workloads:
 *   - 10 K rows  (small  — typical API response)
 *   - 100 K rows (medium — typical export)
 *   - 1 M rows   (large  — bulk import)
 *
 * Each workload is run N times (default 5) per parser, after a warmup
 * pass; we report the median to dampen GC noise.
 *
 * Output is human-readable on stdout AND machine-readable JSON at
 * benchmarks/results.json — github-action-benchmark consumes the JSON
 * to publish a chart on gh-pages.
 *
 * Usage:
 *   node scripts/bench-vs-competitors.js          # default workloads
 *   BENCH_QUICK=1 node scripts/...                # only the 10 K workload
 */

const fs = require('fs');
const path = require('path');

const QUICK = process.env.BENCH_QUICK === '1';
const ITERATIONS = Number(process.env.BENCH_ITERS || 5);
const WORKLOADS = QUICK
  ? [{ rows: 10_000, name: 'small (10K)' }]
  : [
      { rows: 10_000,    name: 'small (10K)' },
      { rows: 100_000,   name: 'medium (100K)' },
      { rows: 1_000_000, name: 'large (1M)' },
    ];

// Lazy-require to avoid loading every parser at startup.
function loadParsers() {
  const jtcsv = require('../dist/index.cjs.js');
  const papa = require('papaparse');
  const { parse: csvParseSync } = require('csv-parse/sync');
  const fastCsv = require('@fast-csv/parse');
  return { jtcsv, papa, csvParseSync, fastCsv };
}

function buildCsv(rows) {
  // Realistic mix: numbers, strings, an email pattern, a tag column.
  const header = 'id,name,email,tag,score,active\n';
  const parts = [header];
  for (let i = 0; i < rows; i++) {
    parts.push(
      `${i},name-${i},user${i}@example.com,tag${i % 50},${(i * 1.5).toFixed(2)},${i % 2 === 0}\n`
    );
  }
  return parts.join('');
}

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function runOne(label, fn) {
  const samples = [];
  for (let i = 0; i < ITERATIONS; i++) {
    if (global.gc) global.gc();
    const t0 = process.hrtime.bigint();
    fn();
    const t1 = process.hrtime.bigint();
    samples.push(Number(t1 - t0) / 1e6); // ms
  }
  const med = median(samples);
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  return { label, median: med, min, max, samples };
}

function fastCsvSync(parseLib, csv) {
  // fast-csv is stream-based; for a fair sync-style comparison we feed
  // the whole string and collect rows.
  return new Promise((resolve, reject) => {
    const rows = [];
    parseLib
      .parseString(csv, { headers: true })
      .on('data', (r) => rows.push(r))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function benchmarkWorkload(workload, parsers) {
  const { jtcsv, papa, csvParseSync, fastCsv } = parsers;
  console.log(`\n=== ${workload.name} ===`);
  const csv = buildCsv(workload.rows);
  console.log(`  CSV size: ${(csv.length / 1024 / 1024).toFixed(2)} MB`);

  // Warmup pass — pulls JIT into hot mode.
  jtcsv.csvToJson(csv, { delimiter: ',', parseNumbers: true });
  papa.parse(csv, { header: true, dynamicTyping: true });
  csvParseSync(csv, { columns: true, cast: true });
  await fastCsvSync(fastCsv, csv);

  const results = [];
  results.push(
    runOne('jtcsv', () => jtcsv.csvToJson(csv, { delimiter: ',', parseNumbers: true })),
  );
  results.push(
    runOne('jtcsv (fastPath)', () =>
      jtcsv.csvToJson(csv, { delimiter: ',', parseNumbers: true, useFastPath: true, fastPathMode: 'compact' }),
    ),
  );
  results.push(runOne('papaparse', () => papa.parse(csv, { header: true, dynamicTyping: true })));
  results.push(runOne('csv-parse', () => csvParseSync(csv, { columns: true, cast: true })));
  // fast-csv is async-only; capture median of awaits.
  {
    const samples = [];
    for (let i = 0; i < ITERATIONS; i++) {
      if (global.gc) global.gc();
      const t0 = process.hrtime.bigint();
      await fastCsvSync(fastCsv, csv);
      const t1 = process.hrtime.bigint();
      samples.push(Number(t1 - t0) / 1e6);
    }
    samples.sort((a, b) => a - b);
    results.push({
      label: 'fast-csv',
      median: samples[Math.floor(samples.length / 2)],
      min: samples[0],
      max: samples[samples.length - 1],
      samples,
    });
  }

  // Sort by median ascending and print.
  results.sort((a, b) => a.median - b.median);
  const fastest = results[0].median;
  console.log('  ┌─────────────────────┬─────────┬─────────┬──────────┐');
  console.log('  │ Parser              │  median │     min │    ratio │');
  console.log('  ├─────────────────────┼─────────┼─────────┼──────────┤');
  for (const r of results) {
    const ratio = (r.median / fastest).toFixed(2);
    const fmt = (n) => `${n.toFixed(1).padStart(7)} ms`;
    console.log(`  │ ${r.label.padEnd(19)} │ ${fmt(r.median)} │ ${fmt(r.min)} │  ${ratio}x   │`);
  }
  console.log('  └─────────────────────┴─────────┴─────────┴──────────┘');

  return { workload: workload.name, rows: workload.rows, csvBytes: csv.length, results };
}

(async () => {
  console.log('jtcsv competitive benchmark');
  console.log(`  Node: ${process.version}`);
  console.log(`  Iterations per parser: ${ITERATIONS} (median reported)`);
  console.log(`  GC available: ${typeof global.gc === 'function' ? 'yes (--expose-gc)' : 'no'}`);

  const parsers = loadParsers();
  const allResults = [];
  for (const workload of WORKLOADS) {
    allResults.push(await benchmarkWorkload(workload, parsers));
  }

  // Emit JSON for github-action-benchmark (one entry per workload×parser).
  const benchEntries = [];
  for (const w of allResults) {
    for (const r of w.results) {
      benchEntries.push({
        name: `${r.label} — ${w.workload}`,
        unit: 'ms',
        value: Math.round(r.median * 100) / 100,
        range: `± ${(r.max - r.min).toFixed(1)} ms`,
        extra: `rows=${w.rows}, csv=${(w.csvBytes/1024/1024).toFixed(1)}MB, samples=${ITERATIONS}`,
      });
    }
  }
  const outDir = path.join(__dirname, '..', 'benchmarks');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(benchEntries, null, 2) + '\n');
  console.log(`\n  Wrote ${benchEntries.length} entries to benchmarks/results.json`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
