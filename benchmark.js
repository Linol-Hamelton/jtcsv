#!/usr/bin/env node

/**
 * JTCSV Performance Benchmark
 * 
 * Compares JTCSV performance against popular CSV/JSON libraries
 * Run with: node benchmark.js
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Import JTCSV
const jtcsv = require('./index.js');

// Try to import competitors
let csvParser, Papa, json2csv;
try {
  csvParser = require('csv-parser');
} catch (e) {
  console.warn('csv-parser not installed, skipping...');
}

try {
  Papa = require('papaparse');
} catch (e) {
  console.warn('papaparse not installed, skipping...');
}

try {
  json2csv = require('json2csv');
} catch (e) {
  console.warn('json2csv not installed, skipping...');
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function color(text, colorName) {
  return colors[colorName] + text + colors.reset;
}

function formatNumber(num) {
  return num.toLocaleString('en-US');
}

function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(ms) {
  if (ms < 1000) {
    return ms.toFixed(2) + ' ms';
  }
  return (ms / 1000).toFixed(2) + ' s';
}

class Benchmark {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.results = [];
  }
  
  addTest(name, fn) {
    this.tests.push({ name, fn });
  }
  
  async run(iterations = 3) {
    console.log(color(`\n🏃 Running ${this.name}`, 'cyan'));
    console.log(color('='.repeat(60), 'dim'));
    
    for (const test of this.tests) {
      console.log(`\n${color('Test:', 'bright')} ${test.name}`);
      
      const times = [];
      let memoryUsage = null;
      
      for (let i = 0; i < iterations; i++) {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const startMem = process.memoryUsage();
        const startTime = performance.now();
        
        // Run the test
        await test.fn();
        
        const endTime = performance.now();
        const endMem = process.memoryUsage();
        
        times.push(endTime - startTime);
        
        // Calculate memory usage
        const memUsed = endMem.heapUsed - startMem.heapUsed;
        if (!memoryUsage || memUsed > memoryUsage) {
          memoryUsage = memUsed;
        }
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Calculate statistics
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      this.results.push({
        name: test.name,
        avgTime,
        minTime,
        maxTime,
        memoryUsage,
        times
      });
      
      console.log(`  ${color('Time:', 'dim')} ${formatTime(avgTime)} (min: ${formatTime(minTime)}, max: ${formatTime(maxTime)})`);
      console.log(`  ${color('Memory:', 'dim')} ${formatBytes(memoryUsage)}`);
      console.log(`  ${color('Iterations:', 'dim')} ${iterations}`);
    }
  }
  
  printResults() {
    console.log(color(`\n📊 ${this.name} Results`, 'green'));
    console.log(color('='.repeat(60), 'dim'));
    
    // Sort by average time (fastest first)
    const sorted = [...this.results].sort((a, b) => a.avgTime - b.avgTime);
    
    sorted.forEach((result, index) => {
      const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`\n${rank} ${color(result.name, 'bright')}`);
      console.log(`  ${color('Avg time:', 'dim')} ${formatTime(result.avgTime)}`);
      console.log(`  ${color('Memory:', 'dim')} ${formatBytes(result.memoryUsage)}`);
      
      // Show relative performance compared to fastest
      if (index > 0) {
        const fastest = sorted[0].avgTime;
        const slowerBy = ((result.avgTime / fastest) - 1) * 100;
        console.log(`  ${color('Slower by:', 'dim')} ${slowerBy.toFixed(1)}%`);
      }
    });
  }
}

async function runSimpleBenchmark(fn, iterations = 3) {
  const times = [];
  let memoryUsage = null;

  for (let i = 0; i < iterations; i++) {
    if (global.gc) {
      global.gc();
    }

    const startMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    await fn();

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    times.push(endTime - startTime);

    let memUsed = endMem - startMem;
    if (Number.isFinite(memUsed)) {
      memUsed = Math.abs(memUsed);
      if (memoryUsage === null || memUsed > memoryUsage) {
        memoryUsage = memUsed;
      }
    } else if (memoryUsage === null) {
      memoryUsage = 0;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

  return {
    avgTime,
    memoryUsage
  };
}

async function generateTestData(rows) {
  console.log(color(`\n📁 Generating test data (${formatNumber(rows)} rows)`, 'yellow'));
  
  // Generate CSV data
  let csv = 'id;name;age;salary;active;department;email;phone;address;city\n';
  
  for (let i = 1; i <= rows; i++) {
    csv += `${i};`;
    csv += `User ${i};`;
    csv += `${20 + (i % 40)};`;
    csv += `${30000 + (i * 100)}.50;`;
    csv += `${i % 3 === 0 ? 'true' : 'false'};`;
    csv += `Department ${(i % 5) + 1};`;
    csv += `user${i}@example.com;`;
    csv += `+1-555-${String(i).padStart(4, '0')};`;
    csv += `${i} Main St;`;
    csv += `City ${(i % 10) + 1}`;
    csv += '\n';
  }
  
  // Generate JSON data
  const json = [];
  for (let i = 1; i <= rows; i++) {
    json.push({
      id: i,
      name: `User ${i}`,
      age: 20 + (i % 40),
      salary: 30000 + (i * 100) + 0.50,
      active: i % 3 === 0,
      department: `Department ${(i % 5) + 1}`,
      email: `user${i}@example.com`,
      phone: `+1-555-${String(i).padStart(4, '0')}`,
      address: `${i} Main St`,
      city: `City ${(i % 10) + 1}`
    });
  }
  
  return { csv, json };
}

async function runBenchmarks() {
  console.log(color('\n🎯 JTCSV Performance Benchmark', 'magenta'));
  console.log(color('='.repeat(60), 'dim'));
  console.log(color('Node.js:', 'dim'), process.version);
  console.log(color('Platform:', 'dim'), process.platform, process.arch);
  console.log(color('Memory:', 'dim'), formatBytes(process.memoryUsage().heapTotal));
  
  // Generate test data
  const smallData = await generateTestData(1000);
  const mediumData = await generateTestData(10000);
  const largeData = await generateTestData(100000);
  
  // Benchmark 1: CSV to JSON
  const csvToJsonBenchmark = new Benchmark('CSV to JSON Conversion (10K rows)');
  
  // JTCSV
  csvToJsonBenchmark.addTest('JTCSV', async () => {
    jtcsv.csvToJson(mediumData.csv, {
      delimiter: ';',
      parseNumbers: true,
      parseBooleans: true
    });
  });
  
  // JTCSV Fast Path (stream-only)
  csvToJsonBenchmark.addTest('JTCSV (FastPath Stream)', async () => {
    let rowCount = 0;
    for await (const _row of jtcsv.csvToJsonIterator(mediumData.csv, {
      delimiter: ';',
      parseNumbers: true,
      parseBooleans: true,
      useFastPath: true
    })) {
      rowCount++;
    }
    if (rowCount === 0) {
      throw new Error('No rows processed in fast-path stream benchmark');
    }
  });

  // JTCSV Fast Path (compact mode, real result)
  csvToJsonBenchmark.addTest('JTCSV (FastPath Compact)', async () => {
    const result = jtcsv.csvToJson(mediumData.csv, {
      delimiter: ';',
      parseNumbers: true,
      parseBooleans: true,
      useFastPath: true,
      fastPathMode: 'compact'
    });
    if (result.length === 0) {
      throw new Error('No rows processed in compact fast-path benchmark');
    }
  });
  
  // PapaParse if available
  if (Papa) {
    csvToJsonBenchmark.addTest('PapaParse', async () => {
      return new Promise((resolve) => {
        Papa.parse(mediumData.csv, {
          delimiter: ';',
          header: true,
          dynamicTyping: true,
          complete: () => resolve()
        });
      });
    });
  }
  
  // csv-parser if available (needs stream simulation)
  if (csvParser) {
    csvToJsonBenchmark.addTest('csv-parser', async () => {
      return new Promise((resolve, reject) => {
        const results = [];
        const parser = csvParser({ separator: ';' });
        
        // Simulate stream
        const lines = mediumData.csv.split('\n');
        lines.forEach(line => {
          parser.write(line + '\n');
        });
        
        parser.end();
        
        parser.on('data', (data) => {
          results.push(data);
        });
        
        parser.on('end', () => {
          resolve();
        });
        
        parser.on('error', reject);
      });
    });
  }
  
  // Benchmark 2: JSON to CSV
  const jsonToCsvBenchmark = new Benchmark('JSON to CSV Conversion (10K records)');
  
  // JTCSV
  jsonToCsvBenchmark.addTest('JTCSV', async () => {
    jtcsv.jsonToCsv(mediumData.json, {
      delimiter: ';',
      includeHeaders: true
    });
  });
  
  // json2csv if available
  if (json2csv && json2csv.parse) {
    jsonToCsvBenchmark.addTest('json2csv', async () => {
      json2csv.parse(mediumData.json, {
        delimiter: ';'
      });
    });
  }
  
  // Run benchmarks
  await csvToJsonBenchmark.run(5);
  await jsonToCsvBenchmark.run(5);
  
  // Print results
  csvToJsonBenchmark.printResults();
  jsonToCsvBenchmark.printResults();

  // Scaling benchmarks (JTCSV only)
  const scaleSizes = [
    { label: '1K', rows: 1000, data: smallData },
    { label: '10K', rows: 10000, data: mediumData },
    { label: '100K', rows: 100000, data: largeData }
  ];
  const scaleResults = [];

  console.log(color('\n?? Scaling Benchmarks (JTCSV)', 'cyan'));
  console.log(color('='.repeat(60), 'dim'));

  for (const size of scaleSizes) {
    const csvMetrics = await runSimpleBenchmark(() => {
      const result = jtcsv.csvToJson(size.data.csv, {
        delimiter: ';',
        parseNumbers: true,
        parseBooleans: true,
        useFastPath: true,
        fastPathMode: 'compact'
      });
      if (!result || result.length === 0) {
        throw new Error('No rows processed in scale CSV benchmark');
      }
    }, 3);

    const jsonMetrics = await runSimpleBenchmark(() => {
      const csv = jtcsv.jsonToCsv(size.data.json, {
        delimiter: ';',
        includeHeaders: true
      });
      if (!csv) {
        throw new Error('No output produced in scale JSON benchmark');
      }
    }, 3);

    scaleResults.push({
      rows: size.rows,
      csvToJson: csvMetrics,
      jsonToCsv: jsonMetrics
    });

    console.log(`\n${color('Size:', 'bright')} ${size.label} (${formatNumber(size.rows)} rows)`);
    console.log(`  ${color('CSV → JSON (FastPath Compact):', 'dim')} ${formatTime(csvMetrics.avgTime)} | ${formatBytes(csvMetrics.memoryUsage)}`);
    console.log(`  ${color('JSON → CSV:', 'dim')} ${formatTime(jsonMetrics.avgTime)} | ${formatBytes(jsonMetrics.memoryUsage)}`);
  }
  
  // Generate summary table
  console.log(color('\n📈 Performance Comparison Summary', 'cyan'));
  console.log(color('='.repeat(60), 'dim'));
  
  console.log('\n' + color('CSV → JSON (10K rows):', 'bright'));
  console.log('┌' + '─'.repeat(58) + '┐');
  console.log(`│ ${color('Library', 'bright').padEnd(15)} │ ${color('Time', 'bright').padEnd(15)} │ ${color('Memory', 'bright').padEnd(15)} │ ${color('Rank', 'bright').padEnd(8)} │`);
  console.log('├' + '─'.repeat(58) + '┤');
  
  const csvSorted = [...csvToJsonBenchmark.results].sort((a, b) => a.avgTime - b.avgTime);
  csvSorted.forEach((result, index) => {
    const rank = index === 0 ? '🥇 1st' : index === 1 ? '🥈 2nd' : index === 2 ? '🥉 3rd' : `${index + 1}th`;
    console.log(`│ ${result.name.padEnd(15)} │ ${formatTime(result.avgTime).padEnd(15)} │ ${formatBytes(result.memoryUsage).padEnd(15)} │ ${rank.padEnd(8)} │`);
  });
  
  console.log('└' + '─'.repeat(58) + '┘');
  
  console.log('\n' + color('JSON → CSV (10K records):', 'bright'));
  console.log('┌' + '─'.repeat(58) + '┐');
  console.log(`│ ${color('Library', 'bright').padEnd(15)} │ ${color('Time', 'bright').padEnd(15)} │ ${color('Memory', 'bright').padEnd(15)} │ ${color('Rank', 'bright').padEnd(8)} │`);
  console.log('├' + '─'.repeat(58) + '┤');
  
  const jsonSorted = [...jsonToCsvBenchmark.results].sort((a, b) => a.avgTime - b.avgTime);
  jsonSorted.forEach((result, index) => {
    const rank = index === 0 ? '🥇 1st' : index === 1 ? '🥈 2nd' : index === 2 ? '🥉 3rd' : `${index + 1}th`;
    console.log(`│ ${result.name.padEnd(15)} │ ${formatTime(result.avgTime).padEnd(15)} │ ${formatBytes(result.memoryUsage).padEnd(15)} │ ${rank.padEnd(8)} │`);
  });
  
  console.log('└' + '─'.repeat(58) + '┘');
  
  // JTCVS advantages
  console.log(color('\n🎯 JTCSV Unique Advantages:', 'green'));
  console.log(color('='.repeat(60), 'dim'));
  console.log('\n✅ ' + color('Bidirectional:', 'bright') + ' CSV ↔ JSON in one library');
  console.log('✅ ' + color('Zero Dependencies:', 'bright') + ' No external packages needed');
  console.log('✅ ' + color('Security Built-in:', 'bright') + ' CSV injection protection');
  console.log('✅ ' + color('Auto-detect:', 'bright') + ' Automatic delimiter detection');
  console.log('✅ ' + color('Streaming API:', 'bright') + ' Built-in streaming support');
  console.log('✅ ' + color('TypeScript:', 'bright') + ' Full TypeScript definitions');
  
  console.log(color('\n✅ Benchmark completed!', 'green'));
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error(color(`\n❌ Benchmark error: ${error.message}`, 'red'));
  process.exit(1);
});

// Run benchmarks
runBenchmarks().catch(error => {
  console.error(color(`\n❌ Failed to run benchmarks: ${error.message}`, 'red'));
  process.exit(1);
});



