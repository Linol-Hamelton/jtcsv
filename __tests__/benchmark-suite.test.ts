import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
/**
 * Comprehensive Benchmark Suite for jtcsv
 *
 * Tracks performance regressions across all major operations.
 * Run with: npm test -- __tests__/benchmark-suite.test.js
 *
 * Note: Threshold checks are skipped during coverage runs (too slow)
 */

import {
  csvToJson,
  jsonToCsv,
  jsonToNdjson,
  ndjsonToJson,
  jsonToTsv,
  tsvToJson,
  autoDetectDelimiter
} from '../index';

// Skip threshold checks during coverage (instrumentation slows everything down)
const IS_COVERAGE = process.env.npm_lifecycle_event === 'test:coverage' ||
                    process.argv.includes('--coverage');

// Performance thresholds - only enforced when NOT running coverage
const THRESHOLDS = {
  csvToJson: {
    simple: 100,
    complex: 100,
    wide: 30
  },
  jsonToCsv: {
    simple: 100,
    nested: 80,
    wide: 20
  },
  ndjson: {
    parse: 150,
    generate: 150
  },
  tsv: {
    parse: 120,
    generate: 35
  },
  delimiter: {
    detect: 5000
  }
};

// Helper to conditionally check threshold
function checkThreshold(actual, threshold, name) {
  if (IS_COVERAGE) {
    // During coverage, just verify it runs (any positive number)
    expect(actual).toBeGreaterThan(0);
  } else {
    expect(actual).toBeGreaterThan(threshold);
  }
}

// Utility functions
function generateSimpleCsv(rows, cols = 5) {
  const headers = Array.from({ length: cols }, (_, i) => `col${i}`).join(',');
  const dataRows = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => `value${r}_${c}`).join(',')
  );
  return [headers, ...dataRows].join('\n');
}

function generateComplexCsv(rows, cols = 5) {
  const headers = Array.from({ length: cols }, (_, i) => `"Column ${i}"`).join(',');
  const dataRows = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      if (c % 3 === 0) {
        return '"Value with, comma"';
      }
      if (c % 3 === 1) {
        return '"Value with ""quotes"""';
      }
      return '"Multi\nline"';
    }).join(',')
  );
  return [headers, ...dataRows].join('\n');
}

function generateSimpleJson(rows, cols = 5) {
  return Array.from({ length: rows }, (_, r) => {
    const obj = {};
    for (let c = 0; c < cols; c++) {
      obj[`col${c}`] = `value${r}_${c}`;
    }
    return obj;
  });
}

function generateNestedJson(rows) {
  return Array.from({ length: rows }, (_, r) => ({
    id: r,
    name: `User ${r}`,
    address: {
      street: `${r} Main St`,
      city: 'NYC',
      zip: `1000${r % 10}`
    },
    tags: ['tag1', 'tag2', 'tag3'],
    metadata: {
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }
  }));
}

function benchmark(fn, iterations = 100) {
  // Warmup
  for (let i = 0; i < 10; i++) {
    fn();
  }

  // Actual benchmark
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();

  const totalMs = Number(end - start) / 1_000_000;
  const opsPerSec = Math.round((iterations / totalMs) * 1000);

  return { totalMs, opsPerSec, iterations };
}

describe('Benchmark Suite', () => {
  describe('CSV to JSON Performance', () => {
    test('simple CSV parsing meets threshold', () => {
      const csv = generateSimpleCsv(1000);
      const result = benchmark(() => csvToJson(csv), 50);

      console.log(`CSV→JSON (simple): ${result.opsPerSec} ops/sec`);
      checkThreshold(result.opsPerSec, THRESHOLDS.csvToJson.simple, 'csvToJson.simple');
    });

    test('complex CSV parsing meets threshold', () => {
      const csv = generateComplexCsv(500);
      const result = benchmark(() => csvToJson(csv), 30);

      console.log(`CSV→JSON (complex): ${result.opsPerSec} ops/sec`);
      checkThreshold(result.opsPerSec, THRESHOLDS.csvToJson.complex, 'csvToJson.complex');
    });

    test('wide CSV (50 columns) meets threshold', () => {
      const csv = generateSimpleCsv(500, 50);
      const result = benchmark(() => csvToJson(csv), 30);

      console.log(`CSV→JSON (wide): ${result.opsPerSec} ops/sec`);
      checkThreshold(result.opsPerSec, THRESHOLDS.csvToJson.wide, 'csvToJson.wide');
    });

    test('parsing with options does not significantly degrade', () => {
      const csv = generateSimpleCsv(1000);

      const baseResult = benchmark(() => csvToJson(csv), 50);
      const optionsResult = benchmark(() => csvToJson(csv, {
        parseNumbers: true,
        parseBooleans: true,
        trim: true
      }), 50);

      const degradation = (baseResult.opsPerSec - optionsResult.opsPerSec) / baseResult.opsPerSec;
      console.log(`Options degradation: ${(degradation * 100).toFixed(1)}%`);
      expect(degradation).toBeLessThan(0.5); // Less than 50% degradation
    });
  });

  describe('JSON to CSV Performance', () => {
    test('simple JSON conversion meets threshold', () => {
      const data = generateSimpleJson(1000);
      const result = benchmark(() => jsonToCsv(data), 50);

      console.log(`JSON→CSV (simple): ${result.opsPerSec} ops/sec`);
      checkThreshold(result.opsPerSec, THRESHOLDS.jsonToCsv.simple, 'jsonToCsv.simple');
    });

    test('nested JSON conversion meets threshold', () => {
      const data = generateNestedJson(500);
      const result = benchmark(() => jsonToCsv(data), 30);

      console.log(`JSON→CSV (nested): ${result.opsPerSec} ops/sec`);
      checkThreshold(result.opsPerSec, THRESHOLDS.jsonToCsv.nested, 'jsonToCsv.nested');
    });

    test('wide JSON (50 fields) meets threshold', () => {
      const data = generateSimpleJson(500, 50);
      const result = benchmark(() => jsonToCsv(data), 30);

      console.log(`JSON→CSV (wide): ${result.opsPerSec} ops/sec`);
      checkThreshold(result.opsPerSec, THRESHOLDS.jsonToCsv.wide, 'jsonToCsv.wide');
    });

    test('CSV injection prevention overhead is acceptable', () => {
      const data = generateSimpleJson(1000);

      const withoutProtection = benchmark(() =>
        jsonToCsv(data, { preventCsvInjection: false }), 50);
      const withProtection = benchmark(() =>
        jsonToCsv(data, { preventCsvInjection: true }), 50);

      const overhead = (withoutProtection.opsPerSec - withProtection.opsPerSec) / withoutProtection.opsPerSec;
      console.log(`CSV injection protection overhead: ${(overhead * 100).toFixed(1)}%`);
      expect(overhead).toBeLessThan(0.3); // Less than 30% overhead
    });
  });

  describe('NDJSON Performance', () => {
    test('NDJSON parsing meets threshold', () => {
      const data = generateSimpleJson(1000);
      const ndjson = data.map(row => JSON.stringify(row)).join('\n');

      const result = benchmark(() => ndjsonToJson(ndjson), 50);

      console.log(`NDJSON parse: ${result.opsPerSec} ops/sec`);
      checkThreshold(result.opsPerSec, THRESHOLDS.ndjson.parse, 'ndjson.parse');
    });

    test('NDJSON generation meets threshold', () => {
      const data = generateSimpleJson(1000);
      const result = benchmark(() => jsonToNdjson(data), 50);

      console.log(`NDJSON generate: ${result.opsPerSec} ops/sec`);
      checkThreshold(result.opsPerSec, THRESHOLDS.ndjson.generate, 'ndjson.generate');
    });
  });

  describe('TSV Performance', () => {
    test('TSV parsing meets threshold', () => {
      const data = generateSimpleJson(1000);
      const tsv = jsonToTsv(data);

      const result = benchmark(() => tsvToJson(tsv), 50);

      console.log(`TSV parse: ${result.opsPerSec} ops/sec`);
      checkThreshold(result.opsPerSec, THRESHOLDS.tsv.parse, 'tsv.parse');
    });

    test('TSV generation meets threshold', () => {
      const data = generateSimpleJson(1000);
      const result = benchmark(() => jsonToTsv(data), 50);

      console.log(`TSV generate: ${result.opsPerSec} ops/sec`);
      checkThreshold(result.opsPerSec, THRESHOLDS.tsv.generate, 'tsv.generate');
    });
  });

  describe('Delimiter Detection Performance', () => {
    test('delimiter detection meets threshold', () => {
      const samples = [
        'a,b,c\n1,2,3',
        'a;b;c\n1;2;3',
        'a\tb\tc\n1\t2\t3',
        'a|b|c\n1|2|3'
      ];

      const result = benchmark(() => {
        for (const sample of samples) {
          autoDetectDelimiter(sample);
        }
      }, 100);

      console.log(`Delimiter detection: ${result.opsPerSec} ops/sec`);
      checkThreshold(result.opsPerSec, THRESHOLDS.delimiter.detect, 'delimiter.detect');
    });
  });

  describe('Scalability Tests', () => {
    test('performance scales linearly with row count', () => {
      const sizes = [100, 500, 1000, 2000];
      const results = [];

      for (const size of sizes) {
        const csv = generateSimpleCsv(size);
        const start = process.hrtime.bigint();
        csvToJson(csv);
        const end = process.hrtime.bigint();
        const timeMs = Number(end - start) / 1_000_000;
        results.push({ size, timeMs, ratio: timeMs / size });
      }

      console.log('Scalability results:');
      results.forEach(r => console.log(`  ${r.size} rows: ${r.timeMs.toFixed(2)}ms (${(r.ratio * 1000).toFixed(3)}µs/row)`));

      // Check that time per row is relatively constant
      const ratios = results.map(r => r.ratio);
      const avgRatio = ratios.reduce((a, b) => a + b) / ratios.length;
      const maxDeviation = Math.max(...ratios.map(r => Math.abs(r - avgRatio) / avgRatio));

      const strictPerf = process.env.JTCSV_PERF_TESTS === '1';
      const maxAllowedDeviation = strictPerf ? 0.6 : 1.0;

      expect(maxDeviation).toBeLessThan(maxAllowedDeviation);
    });

    test('performance scales with column count', () => {
      const colCounts = [5, 10, 20, 50];
      const results = [];

      for (const cols of colCounts) {
        const csv = generateSimpleCsv(500, cols);
        const start = process.hrtime.bigint();
        csvToJson(csv);
        const end = process.hrtime.bigint();
        const timeMs = Number(end - start) / 1_000_000;
        results.push({ cols, timeMs, ratio: timeMs / cols });
      }

      console.log('Column scalability:');
      results.forEach(r => console.log(`  ${r.cols} cols: ${r.timeMs.toFixed(2)}ms`));
    });
  });

  describe('Regression Detection', () => {
    test('roundtrip conversion maintains data integrity', () => {
      const original = generateSimpleJson(100);
      const csv = jsonToCsv(original);
      const restored = csvToJson(csv);

      expect(restored.length).toBe(original.length);
      expect(Object.keys(restored[0])).toEqual(Object.keys(original[0]));
    });

    test('fast-path produces same results as standard path', () => {
      const csv = generateSimpleCsv(100);

      const fastResult = csvToJson(csv, { useFastPath: true });
      const standardResult = csvToJson(csv, { useFastPath: false });

      expect(fastResult).toEqual(standardResult);
    });
  });
});

describe('Performance Summary', () => {
  test('generate performance report', () => {
    const report: any = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      results: {}
    };

    // Run key benchmarks
    const simpleCsv = generateSimpleCsv(1000);
    const simpleJson = generateSimpleJson(1000);

    report.results.csvToJson = benchmark(() => csvToJson(simpleCsv), 50).opsPerSec;
    report.results.jsonToCsv = benchmark(() => jsonToCsv(simpleJson), 50).opsPerSec;
    report.results.ndjsonParse = benchmark(() => ndjsonToJson(simpleJson.map(r => JSON.stringify(r)).join('\n')), 50).opsPerSec;
    report.results.ndjsonGenerate = benchmark(() => jsonToNdjson(simpleJson), 50).opsPerSec;

    console.log('\n=== Performance Report ===');
    console.log(JSON.stringify(report, null, 2));

    // All results should be positive
    Object.values(report.results).forEach(v => expect(v).toBeGreaterThan(0));
  });
});
