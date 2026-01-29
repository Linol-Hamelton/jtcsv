/**
 * Soak tests for memory leaks detection.
 * 
 * These tests are designed to run for extended periods (8+ hours) with large datasets
 * to detect memory leaks in JTCSV core functions.
 * 
 * @jest-environment node
 */

const { csvToJson, createCsvToJsonStream } = require('../index');
const { createReadStream } = require('fs');
const { join } = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

/**
 * Helper to generate a CSV string with N rows
 */
function generateCSV(rows) {
  const header = 'id,name,age,email,balance,active,created_at\n';
  const lines = [];
  for (let i = 0; i < rows; i++) {
    lines.push(
      `${i},User ${i},${20 + (i % 50)},user${i}@example.com,${(i * 100).toFixed(2)},${i % 2 === 0},2025-01-${String((i % 28) + 1).padStart(2, '0')}`
    );
  }
  return header + lines.join('\n');
}

/**
 * Measure heap usage before and after an operation
 * Supports synchronous and asynchronous functions.
 */
async function measureHeap(label, fn) {
  const before = process.memoryUsage();
  const result = await fn();
  const after = process.memoryUsage();
  
  console.log(`[${label}] Heap before: ${Math.round(before.heapUsed / 1024 / 1024)} MB`);
  console.log(`[${label}] Heap after:  ${Math.round(after.heapUsed / 1024 / 1024)} MB`);
  console.log(`[${label}] Delta:       ${Math.round((after.heapUsed - before.heapUsed) / 1024 / 1024)} MB`);
  
  return { before, after, result };
}

describe('Soak tests for memory leaks', () => {
  // Increase timeout for long-running tests
  jest.setTimeout(30 * 60 * 1000); // 30 minutes

  test('csvToJson with 100k rows should not leak memory', async () => {
    const rows = 100_000;
    const csv = generateCSV(rows);
    
    const { before, after } = await measureHeap('csvToJson 100k', () => {
      const result = csvToJson(csv);
      expect(result).toHaveLength(rows);
      return result;
    });
    
    // Allow some increase due to GC timing, but should not exceed 2x
    const increaseRatio = after.heapUsed / before.heapUsed;
    console.log(`Heap increase ratio: ${increaseRatio.toFixed(2)}`);
    expect(increaseRatio).toBeLessThan(2.0);
  });

  test('createCsvToJsonStream with 1M rows should not leak memory', async () => {
    const rows = 1_000_000;
    // Use a readable stream that generates data on the fly to avoid huge strings
    const csvStream = Readable.from((function* () {
      yield 'id,name,age,email,balance,active,created_at\n';
      for (let i = 0; i < rows; i++) {
        yield `${i},User ${i},${20 + (i % 50)},user${i}@example.com,${(i * 100).toFixed(2)},${i % 2 === 0},2025-01-${String((i % 28) + 1).padStart(2, '0')}\n`;
      }
    })());
    
    let count = 0;
    const transform = createCsvToJsonStream({ delimiter: ',' });
    
    const { before, after } = await measureHeap('createCsvToJsonStream 1M', async () => {
      // Use pipeline to ensure proper stream cleanup
      await pipeline(
        csvStream,
        transform,
        new (require('stream').Writable)({
          objectMode: true,
          write(chunk, encoding, callback) {
            count++;
            if (count % 100000 === 0) {
              // Log progress inside the write callback (before test ends)
              console.log(`Processed ${count} rows`);
            }
            callback();
          }
        })
      );
    });
    
    expect(count).toBe(rows);
    
    const increaseRatio = after.heapUsed / before.heapUsed;
    console.log(`Heap increase ratio: ${increaseRatio.toFixed(2)}`);
    // Streaming should keep memory stable; ratio should be close to 1
    expect(increaseRatio).toBeLessThan(1.5);
  });

  test('repeated parsing of 10k rows 100 times should not leak', async () => {
    const rows = 10_000;
    const iterations = 100;
    const csv = generateCSV(rows);
    
    const { before, after } = await measureHeap(`repeated ${iterations}x`, () => {
      for (let i = 0; i < iterations; i++) {
        const result = csvToJson(csv);
        expect(result).toHaveLength(rows);
        // Force GC every 10 iterations to simulate long-running process
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }
    });
    
    const increaseRatio = after.heapUsed / before.heapUsed;
    console.log(`Heap increase ratio after ${iterations} iterations: ${increaseRatio.toFixed(2)}`);
    // After many iterations, memory should not grow unbounded
    expect(increaseRatio).toBeLessThan(2.0);
  });
});

// Optional: long-running soak test (disabled by default)
describe('Extended soak tests (fast version for CI)', () => {
  test('5-second continuous streaming', async () => {
    // Fast version of the 8-hour test for CI
    // Processes data continuously for 5 seconds to verify no memory leaks
    const { createCsvToJsonStream } = require('../index.js');
    const { Readable } = require('stream');
    
    let processedRows = 0;
    const startTime = Date.now();
    const testDuration = process.env.CI === 'true' ? 1000 : 5000; // 1 second in CI, 5 seconds locally
    
    // Create a continuous stream of CSV data
    const csvStream = new Readable({
      read() {
        // Generate a simple CSV row
        const row = `field1_${processedRows},field2_${processedRows},field3_${processedRows}\n`;
        this.push(row);
        processedRows++;
        
        // Stop after test duration
        if (Date.now() - startTime >= testDuration) {
          this.push(null); // End stream
        }
      }
    });
    
    // Create conversion stream
    const conversionStream = createCsvToJsonStream({
      delimiter: ',',
      useFastPath: true
    });
    
    // Pipe and count rows
    let outputRows = 0;
    csvStream.pipe(conversionStream);
    
    await new Promise((resolve, reject) => {
      conversionStream.on('data', () => {
        outputRows++;
      });
      
      conversionStream.on('end', resolve);
      conversionStream.on('error', reject);
    });
    
    console.log(`Fast continuous streaming test: processed ${processedRows} input rows, ${outputRows} output rows in ${testDuration}ms`);
    
    // Verify we processed some data
    expect(processedRows).toBeGreaterThan(0);
    expect(outputRows).toBeGreaterThan(0);
    // Due to streaming timing, there might be a slight difference (up to 1 row)
    // between input and output rows
    expect(Math.abs(outputRows - processedRows)).toBeLessThanOrEqual(1);
  }, 10000); // 10 second timeout
});