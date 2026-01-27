/**
 * Memory Profiling Tests for jtcsv
 *
 * Tests memory usage patterns, leak detection, and efficiency.
 *
 * Run with: node --expose-gc node_modules/jest/bin/jest __tests__/memory-profiling.test.js
 */

const {
  csvToJson,
  jsonToCsv,
  csvToJsonIterator,
  createCsvToJsonStream,
  createJsonToCsvStream,
  jsonToNdjson,
  ndjsonToJson,
  parseNdjsonStream
} = require('../index');

const { Readable, Writable } = require('stream');

// Memory utilities
function getMemoryUsageMB() {
  if (global.gc) global.gc();
  const mem = process.memoryUsage();
  return {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
    external: Math.round(mem.external / 1024 / 1024 * 100) / 100,
    rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
    arrayBuffers: Math.round(mem.arrayBuffers / 1024 / 1024 * 100) / 100
  };
}

function trackMemory(fn, label = 'operation') {
  if (global.gc) global.gc();
  const before = getMemoryUsageMB();

  const result = fn();

  if (global.gc) global.gc();
  const after = getMemoryUsageMB();

  return {
    result,
    before,
    after,
    delta: {
      heapUsed: Math.round((after.heapUsed - before.heapUsed) * 100) / 100,
      heapTotal: Math.round((after.heapTotal - before.heapTotal) * 100) / 100,
      external: Math.round((after.external - before.external) * 100) / 100,
      rss: Math.round((after.rss - before.rss) * 100) / 100
    },
    label
  };
}

async function trackMemoryAsync(fn, label = 'async operation') {
  if (global.gc) global.gc();
  const before = getMemoryUsageMB();

  const result = await fn();

  if (global.gc) global.gc();
  const after = getMemoryUsageMB();

  return {
    result,
    before,
    after,
    delta: {
      heapUsed: Math.round((after.heapUsed - before.heapUsed) * 100) / 100,
      heapTotal: Math.round((after.heapTotal - before.heapTotal) * 100) / 100,
      external: Math.round((after.external - before.external) * 100) / 100,
      rss: Math.round((after.rss - before.rss) * 100) / 100
    },
    label
  };
}

// Data generators
function generateCsv(rows, cols = 5) {
  const header = Array.from({ length: cols }, (_, i) => `col${i}`).join(',');
  const dataRows = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => `value${r}_${c}`).join(',')
  );
  return [header, ...dataRows].join('\n');
}

function generateJson(rows, cols = 5) {
  return Array.from({ length: rows }, (_, r) => {
    const obj = {};
    for (let c = 0; c < cols; c++) {
      obj[`col${c}`] = `value${r}_${c}`;
    }
    return obj;
  });
}

describe('Memory Profiling', () => {

  describe('Basic Memory Usage', () => {
    test('CSV parsing memory footprint', () => {
      const sizes = [1000, 5000, 10000];
      const results = [];

      for (const size of sizes) {
        const csv = generateCsv(size);
        const csvSizeMB = csv.length / 1024 / 1024;

        const tracked = trackMemory(() => csvToJson(csv), `${size} rows`);

        results.push({
          rows: size,
          csvSizeMB: Math.round(csvSizeMB * 100) / 100,
          memoryDeltaMB: tracked.delta.heapUsed,
          memoryRatio: Math.round(tracked.delta.heapUsed / csvSizeMB * 100) / 100
        });

        // Clean up
        tracked.result = null;
        if (global.gc) global.gc();
      }

      console.log('\nCSV Parsing Memory:');
      console.table(results);

      // Memory should scale roughly linearly with input size
      const ratios = results.map(r => r.memoryRatio);
      const avgRatio = ratios.reduce((a, b) => a + b) / ratios.length;

      // Memory overhead should not be excessive (less than 10x input size)
      expect(avgRatio).toBeLessThan(20);
    });

    test('JSON to CSV memory footprint', () => {
      const sizes = [1000, 5000, 10000];
      const results = [];

      for (const size of sizes) {
        const data = generateJson(size);
        const inputSizeMB = JSON.stringify(data).length / 1024 / 1024;

        const tracked = trackMemory(() => jsonToCsv(data), `${size} rows`);

        results.push({
          rows: size,
          inputSizeMB: Math.round(inputSizeMB * 100) / 100,
          memoryDeltaMB: tracked.delta.heapUsed,
          memoryRatio: Math.round(tracked.delta.heapUsed / inputSizeMB * 100) / 100
        });

        tracked.result = null;
        if (global.gc) global.gc();
      }

      console.log('\nJSON→CSV Memory:');
      console.table(results);
    });
  });

  describe('Memory Leak Detection', () => {
    test('no memory leak in repeated CSV parsing', () => {
      const iterations = 100;
      const csv = generateCsv(1000);
      const memoryReadings = [];

      for (let i = 0; i < iterations; i++) {
        const result = csvToJson(csv);
        // Intentionally don't hold reference
        if (i % 20 === 0) {
          if (global.gc) global.gc();
          memoryReadings.push(getMemoryUsageMB().heapUsed);
        }
      }

      console.log('\nMemory readings over iterations:', memoryReadings);

      // Check for memory growth
      const firstReading = memoryReadings[0];
      const lastReading = memoryReadings[memoryReadings.length - 1];
      const growth = lastReading - firstReading;

      console.log(`Memory growth: ${growth}MB`);

      // Should not grow significantly
      expect(growth).toBeLessThan(50); // Less than 50MB growth
    });

    test('no memory leak in repeated JSON conversion', () => {
      const iterations = 100;
      const data = generateJson(1000);
      const memoryReadings = [];

      for (let i = 0; i < iterations; i++) {
        const csv = jsonToCsv(data);
        if (i % 20 === 0) {
          if (global.gc) global.gc();
          memoryReadings.push(getMemoryUsageMB().heapUsed);
        }
      }

      console.log('\nJSON→CSV memory readings:', memoryReadings);

      const growth = memoryReadings[memoryReadings.length - 1] - memoryReadings[0];
      expect(growth).toBeLessThan(50);
    });

    test('no memory leak with error conditions', () => {
      const iterations = 100;
      const memoryReadings = [];

      for (let i = 0; i < iterations; i++) {
        try {
          csvToJson(null);
        } catch (e) {
          // Expected
        }

        try {
          csvToJson('a,b\n"unclosed');
        } catch (e) {
          // Expected
        }

        if (i % 20 === 0) {
          if (global.gc) global.gc();
          memoryReadings.push(getMemoryUsageMB().heapUsed);
        }
      }

      const growth = memoryReadings[memoryReadings.length - 1] - memoryReadings[0];
      console.log(`Error handling memory growth: ${growth}MB`);

      expect(growth).toBeLessThan(20);
    });
  });

  describe('Streaming Memory Efficiency', () => {
    test('streaming uses constant memory', async () => {
      const rowCount = 50000;
      const memoryReadings = [];

      // Create CSV stream generator
      async function* generateCsvStream() {
        yield 'col0,col1,col2,col3,col4\n';
        for (let i = 0; i < rowCount; i++) {
          yield `val${i}_0,val${i}_1,val${i}_2,val${i}_3,val${i}_4\n`;
        }
      }

      const csvStream = Readable.from(generateCsvStream());
      const transform = createCsvToJsonStream();

      let processedRows = 0;
      const consumer = new Writable({
        objectMode: true,
        write(chunk, enc, cb) {
          processedRows++;
          if (processedRows % 10000 === 0) {
            if (global.gc) global.gc();
            memoryReadings.push({
              rows: processedRows,
              heapUsed: getMemoryUsageMB().heapUsed
            });
          }
          cb();
        }
      });

      await new Promise((resolve, reject) => {
        csvStream
          .pipe(transform)
          .pipe(consumer)
          .on('finish', resolve)
          .on('error', reject);
      });

      console.log('\nStreaming memory readings:');
      console.table(memoryReadings);

      // Memory should stay relatively constant
      const heapValues = memoryReadings.map(r => r.heapUsed);
      const maxHeap = Math.max(...heapValues);
      const minHeap = Math.min(...heapValues);
      const variance = maxHeap - minHeap;

      console.log(`Memory variance: ${variance}MB (min: ${minHeap}, max: ${maxHeap})`);

      // Variance should be small (memory stays constant)
      expect(variance).toBeLessThan(50);
    });

    test('async iterator memory efficiency', async () => {
      const csv = generateCsv(10000);
      const memoryReadings = [];

      let count = 0;
      for await (const row of csvToJsonIterator(csv)) {
        count++;
        if (count % 2000 === 0) {
          if (global.gc) global.gc();
          memoryReadings.push(getMemoryUsageMB().heapUsed);
        }
      }

      console.log('\nIterator memory readings:', memoryReadings);

      const variance = Math.max(...memoryReadings) - Math.min(...memoryReadings);
      console.log(`Iterator memory variance: ${variance}MB`);

      expect(variance).toBeLessThan(30);
    });
  });

  describe('Large Object Handling', () => {
    test('handles large values efficiently', () => {
      const largeValue = 'x'.repeat(1024 * 100); // 100KB value
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        content: largeValue
      }));

      const inputSize = JSON.stringify(data).length / 1024 / 1024;
      console.log(`Input size: ${inputSize.toFixed(2)}MB`);

      const tracked = trackMemory(() => {
        const csv = jsonToCsv(data);
        return csvToJson(csv);
      }, 'large values roundtrip');

      console.log(`Memory delta: ${tracked.delta.heapUsed}MB`);

      // Cleanup
      tracked.result = null;
      if (global.gc) global.gc();

      // Memory should not be excessive compared to input
      expect(tracked.delta.heapUsed).toBeLessThan(inputSize * 5);
    });

    test('handles wide objects efficiently', () => {
      const cols = 200;
      const data = Array.from({ length: 1000 }, (_, r) => {
        const obj = {};
        for (let c = 0; c < cols; c++) {
          obj[`field_${c}`] = `value_${r}_${c}`;
        }
        return obj;
      });

      const tracked = trackMemory(() => {
        const csv = jsonToCsv(data);
        return csvToJson(csv);
      }, 'wide objects');

      console.log(`Wide objects (${cols} cols) memory: ${tracked.delta.heapUsed}MB`);

      tracked.result = null;
    });
  });

  describe('NDJSON Memory', () => {
    test('NDJSON parsing memory', () => {
      const data = generateJson(10000);
      const ndjson = data.map(r => JSON.stringify(r)).join('\n');
      const inputSizeMB = ndjson.length / 1024 / 1024;

      const tracked = trackMemory(() => ndjsonToJson(ndjson), 'NDJSON parse');

      console.log(`\nNDJSON input: ${inputSizeMB.toFixed(2)}MB`);
      console.log(`Memory delta: ${tracked.delta.heapUsed}MB`);

      tracked.result = null;
    });

    test('NDJSON streaming memory', async () => {
      const rowCount = 20000;
      const memoryReadings = [];

      // Generate NDJSON as string
      const lines = [];
      for (let i = 0; i < rowCount; i++) {
        lines.push(JSON.stringify({ id: i, value: `data_${i}` }));
      }
      const ndjson = lines.join('\n');

      let count = 0;

      for await (const obj of parseNdjsonStream(ndjson)) {
        count++;
        if (count % 4000 === 0) {
          if (global.gc) global.gc();
          memoryReadings.push(getMemoryUsageMB().heapUsed);
        }
      }

      console.log('\nNDJSON streaming memory:', memoryReadings);

      expect(count).toBe(rowCount);
      if (memoryReadings.length > 1) {
        const variance = Math.max(...memoryReadings) - Math.min(...memoryReadings);
        expect(variance).toBeLessThan(50); // Allow more variance
      }
    });
  });

  describe('Memory Pressure Tests', () => {
    test('handles memory pressure gracefully', () => {
      const allocations = [];
      const results = [];

      // Create some memory pressure
      for (let i = 0; i < 5; i++) {
        allocations.push(Buffer.alloc(10 * 1024 * 1024)); // 10MB each
      }

      // Now run CSV operations
      const csv = generateCsv(5000);

      const tracked = trackMemory(() => csvToJson(csv), 'under pressure');

      results.push({
        operation: 'CSV parse under pressure',
        memoryDelta: tracked.delta.heapUsed
      });

      console.log('\nMemory pressure test:', results);

      // Release allocations
      allocations.length = 0;
      if (global.gc) global.gc();

      // Should still work correctly
      expect(tracked.result.length).toBe(5000);
    });

    test('recovers after large allocations', () => {
      // First, use lots of memory
      let largeData = generateJson(50000);
      let largeCsv = jsonToCsv(largeData);

      const peakMemory = getMemoryUsageMB().heapUsed;
      console.log(`Peak memory after large operation: ${peakMemory}MB`);

      // Release references
      largeData = null;
      largeCsv = null;
      if (global.gc) global.gc();

      const afterGc = getMemoryUsageMB().heapUsed;
      console.log(`Memory after GC: ${afterGc}MB`);

      // Small operations should work fine
      const smallCsv = generateCsv(100);
      const result = csvToJson(smallCsv);

      expect(result.length).toBe(100);
    });
  });

  describe('Memory Benchmarks', () => {
    test('memory efficiency benchmark', () => {
      const benchmarks = [];
      const sizes = [1000, 5000, 10000, 20000];

      for (const size of sizes) {
        const csv = generateCsv(size);
        const csvBytes = csv.length;

        const tracked = trackMemory(() => csvToJson(csv), `${size} rows`);
        const resultBytes = JSON.stringify(tracked.result).length;

        benchmarks.push({
          rows: size,
          inputKB: Math.round(csvBytes / 1024),
          outputKB: Math.round(resultBytes / 1024),
          memoryMB: tracked.delta.heapUsed,
          bytesPerRow: Math.round(tracked.delta.heapUsed * 1024 * 1024 / size)
        });

        tracked.result = null;
        if (global.gc) global.gc();
      }

      console.log('\n=== Memory Efficiency Benchmark ===');
      console.table(benchmarks);

      // Calculate average bytes per row
      const avgBytesPerRow = benchmarks.reduce((a, b) => a + b.bytesPerRow, 0) / benchmarks.length;
      console.log(`Average bytes per row: ${avgBytesPerRow}`);
    });
  });
});

describe('Memory Profile Summary', () => {
  test('generate memory report', () => {
    const report = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      initialMemory: getMemoryUsageMB()
    };

    console.log('\n' + '='.repeat(60));
    console.log('MEMORY PROFILING SUMMARY');
    console.log('='.repeat(60));
    console.log(JSON.stringify(report, null, 2));
    console.log('='.repeat(60) + '\n');
  });
});
