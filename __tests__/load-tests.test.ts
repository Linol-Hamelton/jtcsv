import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
/**
 * Load Tests for jtcsv
 *
 * Tests performance and stability with large datasets (5M+ rows).
 * These tests may take significant time and memory.
 *
 * Run with: npm test -- __tests__/load-tests.test.js --testTimeout=300000
 */

import {
  csvToJson,
  jsonToCsv,
  csvToJsonIterator,
  createCsvToJsonStream,
  createJsonToCsvStream,
  jsonToNdjson,
  ndjsonToJson,
  parseNdjsonStream
} from '../index';

import { Readable, Writable } from 'stream';

// Test configurations
const LOAD_TEST_CONFIG = {
  small: { rows: 10000, timeout: 10000 },
  medium: { rows: 100000, timeout: 30000 },
  large: { rows: 1000000, timeout: 120000 },
  xlarge: { rows: 5000000, timeout: 300000 }
};

// Use environment variable to select test size
const TEST_SIZE = process.env.LOAD_TEST_SIZE || 'small';
const CONFIG = LOAD_TEST_CONFIG[TEST_SIZE] || LOAD_TEST_CONFIG.small;

// Generators
function* generateCsvLines(rowCount, colCount = 5) {
  // Header
  yield Array.from({ length: colCount }, (_, i) => `col${i}`).join(',');

  // Data rows
  for (let r = 0; r < rowCount; r++) {
    yield Array.from({ length: colCount }, (_, c) => `val${r}_${c}`).join(',');
  }
}

function* generateJsonObjects(rowCount, colCount = 5) {
  for (let r = 0; r < rowCount; r++) {
    const obj = {};
    for (let c = 0; c < colCount; c++) {
      obj[`col${c}`] = `val${r}_${c}`;
    }
    yield obj;
  }
}

function createCsvReadable(rowCount, colCount = 5) {
  const generator = generateCsvLines(rowCount, colCount);
  return Readable.from((async function* () {
    for (const line of generator) {
      yield line + '\n';
    }
  })());
}

function createJsonReadable(rowCount, colCount = 5) {
  const generator = generateJsonObjects(rowCount, colCount);
  return Readable.from((async function* () {
    for (const obj of generator) {
      yield obj;
    }
  })(), { objectMode: true });
}

// Memory tracking
function getMemoryUsage() {
  const used = process.memoryUsage();
  return {
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
    external: Math.round(used.external / 1024 / 1024),
    rss: Math.round(used.rss / 1024 / 1024)
  };
}

describe(`Load Tests (${TEST_SIZE}: ${CONFIG.rows.toLocaleString()} rows)`, () => {
  beforeAll(() => {
    console.log(`\nRunning load tests with ${CONFIG.rows.toLocaleString()} rows`);
    console.log(`Initial memory: ${JSON.stringify(getMemoryUsage())}`);
  });

  afterAll(() => {
    if (global.gc) {
      global.gc();
    }
    console.log(`Final memory: ${JSON.stringify(getMemoryUsage())}`);
  });

  describe('In-Memory Processing', () => {
    // Skip very large tests for in-memory processing
    const inMemoryRows = Math.min(CONFIG.rows, 100000);

    test(`parse ${inMemoryRows.toLocaleString()} rows CSV`, () => {
      const csv = Array.from(generateCsvLines(inMemoryRows)).join('\n');

      const startMem = getMemoryUsage();
      const startTime = Date.now();

      const result = csvToJson(csv);

      const endTime = Date.now();
      const endMem = getMemoryUsage();

      const duration = endTime - startTime;
      const rowsPerSec = Math.round(inMemoryRows / (duration / 1000));

      console.log(`CSV→JSON: ${duration}ms, ${rowsPerSec.toLocaleString()} rows/sec`);
      console.log(`Memory delta: ${endMem.heapUsed - startMem.heapUsed}MB`);

      expect(result.length).toBe(inMemoryRows);
      expect(rowsPerSec).toBeGreaterThan(10000);
    }, CONFIG.timeout);

    test(`convert ${inMemoryRows.toLocaleString()} rows to CSV`, () => {
      const data = Array.from(generateJsonObjects(inMemoryRows));

      const startMem = getMemoryUsage();
      const startTime = Date.now();

      const csv = jsonToCsv(data);

      const endTime = Date.now();
      const endMem = getMemoryUsage();

      const duration = endTime - startTime;
      const rowsPerSec = Math.round(inMemoryRows / (duration / 1000));

      console.log(`JSON→CSV: ${duration}ms, ${rowsPerSec.toLocaleString()} rows/sec`);
      console.log(`Memory delta: ${endMem.heapUsed - startMem.heapUsed}MB`);

      expect(csv.split('\n').length).toBe(inMemoryRows + 1); // +1 for header
      expect(rowsPerSec).toBeGreaterThan(10000);
    }, CONFIG.timeout);
  });

  describe('Streaming Processing', () => {
    test(`stream ${CONFIG.rows.toLocaleString()} rows CSV to JSON`, async () => {
      const csvStream = createCsvReadable(CONFIG.rows);

      let rowCount = 0;
      const startMem = getMemoryUsage();
      const startTime = Date.now();

      const transform = createCsvToJsonStream();
      const output = new Writable({
        objectMode: true,
        write(chunk, encoding, callback) {
          rowCount++;
          callback();
        }
      });

      await new Promise((resolve, reject) => {
        csvStream
          .pipe(transform)
          .pipe(output)
          .on('finish', resolve)
          .on('error', reject);
      });

      const endTime = Date.now();
      const endMem = getMemoryUsage();

      const duration = endTime - startTime;
      const rowsPerSec = Math.round(CONFIG.rows / (duration / 1000));

      console.log(`Stream CSV→JSON: ${duration}ms, ${rowsPerSec.toLocaleString()} rows/sec`);
      console.log(`Memory delta: ${endMem.heapUsed - startMem.heapUsed}MB`);
      console.log(`Peak memory: ${endMem.heapUsed}MB`);

      expect(rowCount).toBe(CONFIG.rows);
      // Memory should stay relatively low for streaming
      expect(endMem.heapUsed - startMem.heapUsed).toBeLessThan(500); // Less than 500MB increase
    }, CONFIG.timeout);

    test(`stream ${CONFIG.rows.toLocaleString()} rows JSON to CSV`, async () => {
      const jsonStream = createJsonReadable(CONFIG.rows);

      let byteCount = 0;
      const startMem = getMemoryUsage();
      const startTime = Date.now();

      const transform = createJsonToCsvStream();
      const output = new Writable({
        write(chunk, encoding, callback) {
          byteCount += chunk.length;
          callback();
        }
      });

      await new Promise((resolve, reject) => {
        jsonStream
          .pipe(transform)
          .pipe(output)
          .on('finish', resolve)
          .on('error', reject);
      });

      const endTime = Date.now();
      const endMem = getMemoryUsage();

      const duration = endTime - startTime;
      const rowsPerSec = Math.round(CONFIG.rows / (duration / 1000));

      console.log(`Stream JSON→CSV: ${duration}ms, ${rowsPerSec.toLocaleString()} rows/sec`);
      console.log(`Output size: ${(byteCount / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory delta: ${endMem.heapUsed - startMem.heapUsed}MB`);

      expect(byteCount).toBeGreaterThan(0);
    }, CONFIG.timeout);
  });

  describe('Async Iterator Processing', () => {
    test(`iterate ${Math.min(CONFIG.rows, 100000).toLocaleString()} rows`, async () => {
      const rows = Math.min(CONFIG.rows, 100000);
      const csv = Array.from(generateCsvLines(rows)).join('\n');

      let rowCount = 0;
      const startTime = Date.now();

      for await (const row of csvToJsonIterator(csv)) {
        rowCount++;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const rowsPerSec = Math.round(rows / (duration / 1000));

      console.log(`Iterator: ${duration}ms, ${rowsPerSec.toLocaleString()} rows/sec`);

      expect(rowCount).toBe(rows);
    }, CONFIG.timeout);
  });

  describe('NDJSON Load Tests', () => {
    const ndjsonRows = Math.min(CONFIG.rows, 500000);

    test(`process ${ndjsonRows.toLocaleString()} NDJSON lines`, async () => {
      // Generate NDJSON
      const lines = [];
      for (const obj of generateJsonObjects(ndjsonRows)) {
        lines.push(JSON.stringify(obj));
      }
      const ndjson = lines.join('\n');

      const startMem = getMemoryUsage();
      const startTime = Date.now();

      const result = ndjsonToJson(ndjson);

      const endTime = Date.now();
      const endMem = getMemoryUsage();

      const duration = endTime - startTime;
      const rowsPerSec = Math.round(ndjsonRows / (duration / 1000));

      console.log(`NDJSON parse: ${duration}ms, ${rowsPerSec.toLocaleString()} rows/sec`);
      console.log(`Memory delta: ${endMem.heapUsed - startMem.heapUsed}MB`);

      expect(result.length).toBe(ndjsonRows);
    }, CONFIG.timeout);

    test(`generate ${ndjsonRows.toLocaleString()} NDJSON lines`, () => {
      const data = Array.from(generateJsonObjects(ndjsonRows));

      const startTime = Date.now();
      const ndjson = jsonToNdjson(data);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const rowsPerSec = Math.round(ndjsonRows / (duration / 1000));

      console.log(`NDJSON generate: ${duration}ms, ${rowsPerSec.toLocaleString()} rows/sec`);

      expect(ndjson.split('\n').filter(l => l).length).toBe(ndjsonRows);
    }, CONFIG.timeout);

    test(`stream ${ndjsonRows.toLocaleString()} NDJSON lines`, async () => {
      const lines = [];
      for (const obj of generateJsonObjects(ndjsonRows)) {
        lines.push(JSON.stringify(obj));
      }
      const ndjson = lines.join('\n');

      // parseNdjsonStream works with strings or Web Streams API
      // For Node.js, we use string input
      let count = 0;
      const startTime = Date.now();

      for await (const obj of parseNdjsonStream(ndjson)) {
        count++;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const rowsPerSec = Math.round(ndjsonRows / (duration / 1000));

      console.log(`NDJSON stream: ${duration}ms, ${rowsPerSec.toLocaleString()} rows/sec`);

      expect(count).toBe(ndjsonRows);
    }, CONFIG.timeout);
  });

  describe('Stress Tests', () => {
    test('handle wide rows (100 columns)', () => {
      const rows = Math.min(CONFIG.rows / 10, 10000);
      const cols = 100;
      const csv = Array.from(generateCsvLines(rows, cols)).join('\n');

      const startTime = Date.now();
      const result = csvToJson(csv);
      const endTime = Date.now();

      console.log(`Wide CSV (${cols} cols): ${endTime - startTime}ms`);

      expect(result.length).toBe(rows);
      expect(Object.keys(result[0]).length).toBe(cols);
    }, CONFIG.timeout);

    test('handle long values', () => {
      const rows = 1000;
      const longValue = 'x'.repeat(10000); // 10KB per value

      const data = Array.from({ length: rows }, (_, i) => ({
        id: i,
        content: longValue,
        description: longValue
      }));

      const startTime = Date.now();
      const csv = jsonToCsv(data);
      const result = csvToJson(csv);
      const endTime = Date.now();

      console.log(`Long values: ${endTime - startTime}ms`);

      expect(result.length).toBe(rows);
      expect(result[0].content.length).toBe(longValue.length);
    }, CONFIG.timeout);

    test('handle special characters', () => {
      const rows = 10000;
      // Use safer special characters that don't break CSV structure
      const specialChars = 'Hello, World! with comma and spaces';

      const data = Array.from({ length: rows }, (_, i) => ({
        id: i,
        special: specialChars,
        emoji: '👍🎉🚀',
        quoted: 'Value with "quotes" inside'
      }));

      const startTime = Date.now();
      const csv = jsonToCsv(data);
      const result = csvToJson(csv);
      const endTime = Date.now();

      console.log(`Special chars: ${endTime - startTime}ms`);

      expect(result.length).toBe(rows);
      expect(result[0].special).toBe(specialChars);
    }, CONFIG.timeout);

    test('concurrent operations', async () => {
      const operations = 10;
      const rowsPerOp = Math.min(CONFIG.rows / 10, 10000);

      const startTime = Date.now();

      const promises = Array.from({ length: operations }, async (_, i) => {
        const csv = Array.from(generateCsvLines(rowsPerOp)).join('\n');
        return csvToJson(csv);
      });

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const totalRows = operations * rowsPerOp;
      const duration = endTime - startTime;

      console.log(`Concurrent (${operations}x${rowsPerOp.toLocaleString()}): ${duration}ms`);
      console.log(`Total throughput: ${Math.round(totalRows / (duration / 1000)).toLocaleString()} rows/sec`);

      results.forEach(r => expect(r.length).toBe(rowsPerOp));
    }, CONFIG.timeout);
  });

  describe('Memory Stability', () => {
    test('memory does not grow unbounded during repeated operations', async () => {
      const iterations = 50;
      const rowsPerIteration = 10000;
      const memoryReadings = [];

      for (let i = 0; i < iterations; i++) {
        const csv = Array.from(generateCsvLines(rowsPerIteration)).join('\n');
        csvToJson(csv);

        if (i % 10 === 0) {
          if (global.gc) {
            global.gc();
          }
          memoryReadings.push(getMemoryUsage().heapUsed);
        }
      }

      console.log('Memory readings (MB):', memoryReadings);

      // Check that memory doesn't grow significantly
      const firstReading = memoryReadings[0];
      const lastReading = memoryReadings[memoryReadings.length - 1];
      const growth = lastReading - firstReading;

      console.log(`Memory growth: ${growth}MB`);

      // Allow some growth but not excessive
      expect(growth).toBeLessThan(200); // Less than 200MB growth
    }, CONFIG.timeout);
  });
});

// Performance Summary
describe('Load Test Summary', () => {
  test('generate summary report', () => {
    console.log('\n' + '='.repeat(60));
    console.log('LOAD TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Test Size: ${TEST_SIZE}`);
    console.log(`Rows: ${CONFIG.rows.toLocaleString()}`);
    console.log(`Node.js: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log('='.repeat(60) + '\n');
  });
});
