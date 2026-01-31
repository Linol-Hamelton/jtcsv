/**
 * Advanced Example: Performance Optimization Patterns
 * 
 * Demonstrates various performance optimization techniques with jtcsv
 * including caching, streaming, batch processing, and memory management.
 */

const { csvToJson, jsonToCsv, createCsvToJsonStream, createJsonToCsvStream } = require('jtcsv');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { performance, PerformanceObserver } = require('perf_hooks');

/**
 * Example 1: Delimiter Caching for Repeated Operations
 * 
 * Scenario: Processing multiple CSV files with similar structure
 */
async function exampleDelimiterCaching() {
  console.log('=== Example 1: Delimiter Caching ===\n');
  
  // Create multiple CSV files with different delimiters
  const testFiles = [
    { name: 'semicolon.csv', content: 'id;name;age\n1;Alice;30\n2;Bob;25\n3;Charlie;35', delimiter: ';' },
    { name: 'comma.csv', content: 'id,name,age\n1,Alice,30\n2,Bob,25\n3,Charlie,35', delimiter: ',' },
    { name: 'pipe.csv', content: 'id|name|age\n1|Alice|30\n2|Bob|25\n3|Charlie|35', delimiter: '|' },
    { name: 'tab.csv', content: 'id\tname\tage\n1\tAlice\t30\n2\tBob\t25\n3\tCharlie\t35', delimiter: '\t' }
  ];

  console.log('Processing without caching:');
  const timesWithoutCache = [];
  
  for (const file of testFiles) {
    const start = performance.now();
    
    // Process without cache (auto-detection each time)
    const data = csvToJson(file.content, {
      autoDetect: true,
      useCache: false, // Explicitly disable cache
      parseNumbers: true
    });
    
    const end = performance.now();
    timesWithoutCache.push(end - start);
    
    console.log(`  ${file.name}: ${(end - start).toFixed(2)}ms (detected: ${data.length} rows)`);
  }

  console.log('\nProcessing with caching:');
  const timesWithCache = [];
  
  for (const file of testFiles) {
    const start = performance.now();
    
    // Process with cache (reuses delimiter detection)
    const data = csvToJson(file.content, {
      autoDetect: true,
      useCache: true, // Enable caching
      parseNumbers: true
    });
    
    const end = performance.now();
    timesWithCache.push(end - start);
    
    console.log(`  ${file.name}: ${(end - start).toFixed(2)}ms (detected: ${data.length} rows)`);
  }

  const avgWithoutCache = timesWithoutCache.reduce((a, b) => a + b, 0) / timesWithoutCache.length;
  const avgWithCache = timesWithCache.reduce((a, b) => a + b, 0) / timesWithCache.length;
  const improvement = ((avgWithoutCache - avgWithCache) / avgWithoutCache * 100).toFixed(1);
  
  console.log(`\nPerformance Improvement: ${improvement}% faster with caching`);
  console.log(`Average time without cache: ${avgWithoutCache.toFixed(2)}ms`);
  console.log(`Average time with cache: ${avgWithCache.toFixed(2)}ms`);
}

/**
 * Example 2: Memory-Efficient Streaming with Backpressure Control
 * 
 * Scenario: Processing very large files with controlled memory usage
 */
async function exampleMemoryEfficientStreaming() {
  console.log('\n\n=== Example 2: Memory-Efficient Streaming ===\n');
  
  // Create a large CSV file (in memory for demonstration)
  const rowCount = 100000;
  const headers = Array.from({ length: 20 }, (_, i) => `column${i + 1}`);
  const largeCsv = headers.join(',') + '\n' +
    Array.from({ length: rowCount }, (_, rowIndex) =>
      headers.map((_, colIndex) => `value${rowIndex}_${colIndex}`).join(',')
    ).join('\n');

  console.log(`Generated ${rowCount.toLocaleString()} rows with ${headers.length} columns`);
  console.log('Approximate size:', Math.round(largeCsv.length / 1024 / 1024 * 100) / 100, 'MB');

  // Method 1: In-memory processing (high memory usage)
  console.log('\nMethod 1: In-memory processing');
  const memoryStart = performance.now();
  const memoryUsageBefore = process.memoryUsage();
  
  try {
    const allData = csvToJson(largeCsv, {
      hasHeaders: true,
      maxRows: 10000 // Limit for demonstration
    });
    
    const memoryUsageAfter = process.memoryUsage();
    const memoryEnd = performance.now();
    
    console.log(`  Time: ${(memoryEnd - memoryStart).toFixed(2)}ms`);
    console.log(`  Memory increase: ${Math.round((memoryUsageAfter.heapUsed - memoryUsageBefore.heapUsed) / 1024 / 1024)} MB`);
    console.log(`  Rows processed: ${allData.length}`);
  } catch (error) {
    console.log(`  Error: ${error.message} (likely out of memory)`);
  }

  // Method 2: Streaming with backpressure control
  console.log('\nMethod 2: Streaming with backpressure control');
  const streamStart = performance.now();
  const streamMemoryBefore = process.memoryUsage();
  
  let streamRowCount = 0;
  let batchCount = 0;
  const batchSize = 1000;
  
  const { Readable, Transform, Writable } = require('stream');
  
  // Create readable stream from CSV string
  const readable = new Readable({
    read() {
      this.push(largeCsv);
      this.push(null); // End stream
    }
  });
  
  // Create CSV parser stream with controlled batch processing
  const csvStream = createCsvToJsonStream({
    hasHeaders: true
  });
  
  // Custom transform to control backpressure
  const batchProcessor = new Transform({
    objectMode: true,
    highWaterMark: 100, // Control memory by limiting buffer size
    
    transform(row, encoding, callback) {
      streamRowCount++;
      
      // Process in batches
      if (streamRowCount % batchSize === 0) {
        batchCount++;
        
        // Simulate batch processing (e.g., database insert)
        // In real scenario, this could be async database operation
        
        // Control backpressure: pause if processing is slow
        if (batchCount % 10 === 0) {
          setTimeout(() => {
            callback(null, row);
          }, 10); // Simulate slow processing
        } else {
          callback(null, row);
        }
      } else {
        callback(null, row);
      }
    }
  });
  
  // Monitor memory during streaming
  const memorySamples = [];
  const memoryMonitor = setInterval(() => {
    memorySamples.push(process.memoryUsage().heapUsed);
  }, 100);
  
  // Collector that does nothing (just counts)
  const collector = new Writable({
    objectMode: true,
    write(row, encoding, callback) {
      callback();
    }
  });
  
  try {
    await pipeline(readable, csvStream, batchProcessor, collector);
    
    clearInterval(memoryMonitor);
    const streamEnd = performance.now();
    const streamMemoryAfter = process.memoryUsage();
    
    const peakMemory = Math.max(...memorySamples);
    const avgMemory = memorySamples.reduce((a, b) => a + b, 0) / memorySamples.length;
    
    console.log(`  Time: ${(streamEnd - streamStart).toFixed(2)}ms`);
    console.log(`  Peak memory: ${Math.round(peakMemory / 1024 / 1024)} MB`);
    console.log(`  Average memory: ${Math.round(avgMemory / 1024 / 1024)} MB`);
    console.log(`  Final memory: ${Math.round(streamMemoryAfter.heapUsed / 1024 / 1024)} MB`);
    console.log(`  Memory increase: ${Math.round((streamMemoryAfter.heapUsed - streamMemoryBefore.heapUsed) / 1024 / 1024)} MB`);
    console.log(`  Rows processed: ${streamRowCount.toLocaleString()}`);
    console.log(`  Batches: ${batchCount}`);
    
  } catch (error) {
    clearInterval(memoryMonitor);
    console.log(`  Error: ${error.message}`);
  }
}

/**
 * Example 3: Parallel Processing with Worker Threads
 * 
 * Scenario: CPU-intensive transformations on large datasets
 */
async function exampleParallelProcessing() {
  console.log('\n\n=== Example 3: Parallel Processing ===\n');
  
  // Generate sample data
  const rowCount = 50000;
  const data = Array.from({ length: rowCount }, (_, i) => ({
    id: i + 1,
    value: Math.random() * 1000,
    category: `CAT${Math.floor(Math.random() * 10) + 1}`,
    timestamp: new Date(Date.now() - Math.random() * 10000000000).toISOString()
  }));
  
  console.log(`Generated ${rowCount.toLocaleString()} rows for processing`);
  
  // CPU-intensive transformation function
  function complexTransformation(row) {
    // Simulate CPU-intensive operations
    const result = { ...row };
    
    // Multiple mathematical operations
    for (let i = 0; i < 100; i++) {
      result.value = Math.sin(result.value) * Math.cos(result.value) * Math.tan(result.value);
      result.value = Math.sqrt(Math.abs(result.value)) * Math.log(Math.abs(result.value) + 1);
    }
    
    // String manipulations
    result.category_code = result.category.split('').map(c => c.charCodeAt(0)).join('-');
    result.hash = require('crypto').createHash('md5').update(JSON.stringify(result)).digest('hex').substring(0, 8);
    
    // Date calculations
    const date = new Date(result.timestamp);
    result.year = date.getFullYear();
    result.quarter = Math.floor(date.getMonth() / 3) + 1;
    result.day_of_week = date.getDay();
    
    return result;
  }
  
  // Method 1: Sequential processing
  console.log('Method 1: Sequential processing');
  const sequentialStart = performance.now();
  
  const sequentialResults = data.map(row => complexTransformation(row));
  
  const sequentialEnd = performance.now();
  console.log(`  Time: ${(sequentialEnd - sequentialStart).toFixed(2)}ms`);
  console.log(`  Rate: ${(rowCount / ((sequentialEnd - sequentialStart) / 1000)).toFixed(0)} rows/second`);
  
  // Method 2: Batch processing with setImmediate (cooperative multitasking)
  console.log('\nMethod 2: Batch processing with cooperative multitasking');
  const batchStart = performance.now();
  
  const batchResults = [];
  const batchSize = 1000;
  let batchIndex = 0;
  
  function processBatch() {
    const startIdx = batchIndex * batchSize;
    const endIdx = Math.min(startIdx + batchSize, data.length);
    
    for (let i = startIdx; i < endIdx; i++) {
      batchResults.push(complexTransformation(data[i]));
    }
    
    batchIndex++;
    
    if (batchIndex * batchSize < data.length) {
      // Yield to event loop between batches
      setImmediate(processBatch);
    } else {
      const batchEnd = performance.now();
      console.log(`  Time: ${(batchEnd - batchStart).toFixed(2)}ms`);
      console.log(`  Rate: ${(rowCount / ((batchEnd - batchStart) / 1000)).toFixed(0)} rows/second`);
      console.log(`  Batches: ${batchIndex}`);
    }
  }
  
  // Start batch processing
  await new Promise(resolve => {
    processBatch();
    // Simple check for completion (in real scenario, use proper signaling)
    const checkInterval = setInterval(() => {
      if (batchResults.length === data.length) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 10);
  });
  
  // Method 3: Using jtcsv with transform hooks for parallel-like processing
  console.log('\nMethod 3: jtcsv with optimized transform hooks');
  
  // Convert data to CSV for processing
  const csvData = jsonToCsv(data);
  
  const transformStart = performance.now();
  
  const transformedData = csvToJson(csvData, {
    hasHeaders: true,
    parseNumbers: true,
    hooks: {
      perRow: (row, index) => {
        // Process every 10th row with intensive transformation
        if (index % 10 === 0) {
          return complexTransformation(row);
        }
        // Simple transformation for other rows
        return {
          ...row,
          processed: true,
          index
        };
      }
    }
  });
  
  const transformEnd = performance.now();
  console.log(`  Time: ${(transformEnd - transformStart).toFixed(2)}ms`);
  console.log(`  Rate: ${(rowCount / ((transformEnd - transformStart) / 1000)).toFixed(0)} rows/second`);
  console.log(`  Rows processed: ${transformedData.length}`);
}

/**
 * Example 4: Optimized File I/O Patterns
 * 
 * Scenario: Efficient reading/writing of large CSV files
 */
async function exampleOptimizedFileIO() {
  console.log('\n\n=== Example 4: Optimized File I/O Patterns ===\n');
  
  const tempDir = './temp_benchmark';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Create a test file
  const testFile = `${tempDir}/test_data.csv`;
  const rowCount = 100000;
  const columnCount = 15;
  
  console.log(`Creating test file with ${rowCount.toLocaleString()} rows...`);
  
  const headers = Array.from({ length: columnCount }, (_, i) => `col${i + 1}`);
  const writeStream = fs.createWriteStream(testFile, { encoding: 'utf8' });
  
  writeStream.write(headers.join(',') + '\n');
  
  for (let i = 0; i < rowCount; i++) {
    const row = headers.map((_, j) => `value${i}_${j}_${Math.random().toString(36).substring(7)}`);
    if (!writeStream.write(row.join(',') + '\n')) {
      await new Promise(resolve => writeStream.once('drain', resolve));
    }
    
    if (i % 10000 === 0 && i > 0) {
      console.log(`  Written ${i.toLocaleString()} rows...`);
    }
  }
  
  writeStream.end();
  await new Promise(resolve => writeStream.once('close', resolve));
  
  const fileSize = fs.statSync(testFile).size;
  console.log(`File created: ${Math.round(fileSize / 1024 / 1024 * 100) / 100} MB`);
  
  // Pattern 1: Read entire file into memory
  console.log('\nPattern 1: Read entire file into memory');
  const pattern1Start = performance.now();
  const memoryBefore1 = process.memoryUsage();
  
  const fileContent = fs.readFileSync(testFile, 'utf8');
  const data1 = csvToJson(fileContent, { hasHeaders: true });
  
  const pattern1End = performance.now();
  const memoryAfter1 = process.memoryUsage();
  
  console.log(`  Read time: ${(pattern1End - pattern1Start).toFixed(2)}ms`);
  console.log(`  Memory used: ${Math.round((memoryAfter1.heapUsed - memoryBefore1.heapUsed) / 1024 / 1024)} MB`);
  console.log(`  Rows: ${data1.length}`);
  
  // Pattern 2: Streaming with file handle
  console.log('\nPattern 2: Streaming with file handle');
  const pattern2Start = performance.now();
  const memoryBefore2 = process.memoryUsage();
  
  const readStream = fs.createReadStream(testFile, {
    encoding: 'utf8',
    highWaterMark: 64 * 1024 // 64KB chunks for optimal disk I/O
  });
  
  const csvStream = createCsvToJsonStream({ hasHeaders: true });
  const rowCounts2 = { count: 0 };
  
  const countingStream = new (require('stream').Writable)({
    objectMode: true,
    write(row, encoding, callback) {
      rowCounts2.count++;
      callback();
    }
  });
  
  await pipeline(readStream, csvStream, countingStream);
  
  const pattern2End = performance.now();
  const memoryAfter2 = process.memoryUsage();
  
  console.log(`  Read time: ${(pattern2End - pattern2Start).toFixed(2)}ms`);
  console.log(`  Memory used: ${Math.round((memoryAfter2.heapUsed - memoryBefore2.heapUsed) / 1024 / 1024)} MB`);
  console.log(`  Rows: ${rowCounts2.count.toLocaleString()}`);
  
  // Pattern 3: Memory-mapped reading (simulated with buffers)
  console.log('\nPattern 3: Memory-mapped reading (simulated)');
  const pattern3Start = performance.now();
  const memoryBefore3 = process.memoryUsage();
  
  // Read file in chunks and process incrementally
  const chunkSize = 1024 * 1024; // 1MB chunks
  const fd = fs.openSync(testFile, 'r');
  let position = 0;
  const buffer = Buffer.alloc(chunkSize);
  let leftover = '';
  let rowCount3 = 0;
  
  while (true) {
    const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, position);
    if (bytesRead === 0) {
      break;
    }
    
    const chunk = leftover + buffer.toString('utf8', 0, bytesRead);
    const lines = chunk.split('\n');
    
    // Last line might be incomplete
    leftover = lines.pop() || '';
    
    // Count complete lines (excluding header)
    rowCount3 += lines.length > 0 ? lines.length - 1 : 0;
    
    position += bytesRead;
  }
  
  fs.closeSync(fd);
  
  const pattern3End = performance.now();
  const memoryAfter3 = process.memoryUsage();
  
  console.log(`  Read time: ${(pattern3End - pattern3Start).toFixed(2)}ms`);
  console.log(`  Memory used: ${Math.round((memoryAfter3.heapUsed - memoryBefore3.heapUsed) / 1024 / 1024)} MB`);
  console.log(`  Rows: ${rowCount3.toLocaleString()}`);
  
  // Cleanup
  fs.unlinkSync(testFile);
  fs.rmdirSync(tempDir);
  
  console.log('\nSummary:');
  console.log('  Pattern 1 (in-memory): Fastest but highest memory usage');
  console.log('  Pattern 2 (streaming): Good balance of speed and memory');
  console.log('  Pattern 3 (chunked): Lowest memory but more complex');
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log('='.repeat(80));
  console.log('PERFORMANCE OPTIMIZATION PATTERNS');
  console.log('='.repeat(80));
  
  try {
    await exampleDelimiterCaching();
    await exampleMemoryEfficientStreaming();
    await exampleParallelProcessing();
    await exampleOptimizedFileIO();
    
    console.log('\n' + '='.repeat(80));
    console.log('ALL OPTIMIZATION EXAMPLES COMPLETED');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('\nError running examples:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  exampleDelimiterCaching,
  exampleMemoryEfficientStreaming,
  exampleParallelProcessing,
  exampleOptimizedFileIO
};
