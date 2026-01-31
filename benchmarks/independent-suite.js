#!/usr/bin/env node

/**
 * Independent Benchmark Suite for jtcsv
 * 
 * A comprehensive, transparent benchmarking suite that provides:
 * 1. Reproducible results with detailed environment information
 * 2. Multiple test scenarios (small, medium, large datasets)
 * 3. Memory usage tracking
 * 4. Statistical analysis (mean, median, standard deviation)
 * 5. Exportable results in JSON format
 * 
 * Usage: node benchmarks/independent-suite.js [--scenario=all] [--iterations=5] [--output=results.json]
 */

const fs = require('fs');
const path = require('path');
const { performance, PerformanceObserver } = require('perf_hooks');
const { spawn } = require('child_process');

// Configuration
const DEFAULT_ITERATIONS = 5;
const DEFAULT_SCENARIO = 'all';
const DEFAULT_OUTPUT = 'benchmark-results.json';

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  iterations: DEFAULT_ITERATIONS,
  scenario: DEFAULT_SCENARIO,
  output: DEFAULT_OUTPUT
};

args.forEach(arg => {
  if (arg.startsWith('--iterations=')) {
    config.iterations = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--scenario=')) {
    config.scenario = arg.split('=')[1];
  } else if (arg.startsWith('--output=')) {
    config.output = arg.split('=')[1];
  } else if (arg === '--help') {
    console.log(`
Independent Benchmark Suite for jtcsv

Usage:
  node benchmarks/independent-suite.js [options]

Options:
  --scenario=<name>    Benchmark scenario (small, medium, large, streaming, all)
  --iterations=<n>     Number of iterations per test (default: 5)
  --output=<file>      Output file for results (default: benchmark-results.json)
  --help               Show this help message

Examples:
  node benchmarks/independent-suite.js --scenario=large --iterations=10
  node benchmarks/independent-suite.js --scenario=all --output=my-results.json
    `);
    process.exit(0);
  }
});

// Environment information
const environment = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  cpus: require('os').cpus().length,
  totalMemory: Math.round(require('os').totalmem() / (1024 * 1024 * 1024) * 100) / 100 + ' GB',
  freeMemory: Math.round(require('os').freemem() / (1024 * 1024 * 1024) * 100) / 100 + ' GB'
};

// Test data generators
const testDataGenerators = {
  /**
   * Generate CSV test data
   */
  generateCsv(rows, columns = 5) {
    const headers = Array.from({ length: columns }, (_, i) => `column${i + 1}`);
    const data = [];
    
    for (let i = 0; i < rows; i++) {
      const row = headers.map((header, j) => {
        switch (j % 4) {
          case 0: return `value${i}_${j}`; // String
          case 1: return (i * j).toString(); // Number
          case 2: return i % 2 === 0 ? 'true' : 'false'; // Boolean
          case 3: return `"quoted,value${i}"`; // Quoted string with comma
          default: return `data${i}_${j}`;
        }
      });
      data.push(row.join(','));
    }
    
    return headers.join(',') + '\n' + data.join('\n');
  },

  /**
   * Generate JSON test data
   */
  generateJson(rows, columns = 5) {
    const data = [];
    
    for (let i = 0; i < rows; i++) {
      const obj = {};
      for (let j = 0; j < columns; j++) {
        const key = `column${j + 1}`;
        switch (j % 4) {
          case 0: obj[key] = `value${i}_${j}`; break;
          case 1: obj[key] = i * j; break;
          case 2: obj[key] = i % 2 === 0; break;
          case 3: obj[key] = `quoted value${i}`; break;
          default: obj[key] = `data${i}_${j}`;
        }
      }
      data.push(obj);
    }
    
    return data;
  },

  /**
   * Generate large file on disk for streaming tests
   */
  async generateLargeFile(filePath, rows) {
    const stream = fs.createWriteStream(filePath);
    const headers = Array.from({ length: 10 }, (_, i) => `field${i + 1}`).join(',');
    
    stream.write(headers + '\n');
    
    for (let i = 0; i < rows; i++) {
      const row = Array.from({ length: 10 }, (_, j) => {
        switch (j % 5) {
          case 0: return `id_${i}_${j}`;
          case 1: return `name_${i}`;
          case 2: return (i * 1000 + j).toString();
          case 3: return i % 3 === 0 ? 'true' : 'false';
          case 4: return `"description with, commas ${i}"`;
          default: return `data${i}`;
        }
      }).join(',');
      
      if (!stream.write(row + '\n')) {
        await new Promise(resolve => stream.once('drain', resolve));
      }
    }
    
    stream.end();
    await new Promise(resolve => stream.once('close', resolve));
  }
};

// Benchmark scenarios
const scenarios = {
  small: {
    name: 'Small Dataset',
    description: '1,000 rows, typical for API responses',
    csvRows: 1000,
    jsonRows: 1000,
    columns: 5
  },
  
  medium: {
    name: 'Medium Dataset',
    description: '10,000 rows, typical for database exports',
    csvRows: 10000,
    jsonRows: 10000,
    columns: 8
  },
  
  large: {
    name: 'Large Dataset',
    description: '100,000 rows, typical for data processing',
    csvRows: 100000,
    jsonRows: 100000,
    columns: 10
  },
  
  streaming: {
    name: 'Streaming Large File',
    description: '1,000,000 rows, tests memory efficiency',
    csvRows: 1000000,
    jsonRows: 1000000,
    columns: 10,
    fileBased: true
  }
};

// Memory measurement utilities
class MemoryTracker {
  constructor() {
    this.samples = [];
    this.initialMemory = process.memoryUsage();
  }
  
  sample() {
    const usage = process.memoryUsage();
    this.samples.push({
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      timestamp: performance.now()
    });
  }
  
  getStats() {
    if (this.samples.length === 0) return null;
    
    const heapUsed = this.samples.map(s => s.heapUsed);
    const heapTotal = this.samples.map(s => s.heapTotal);
    
    return {
      initial: {
        heapUsed: this.initialMemory.heapUsed,
        heapTotal: this.initialMemory.heapTotal
      },
      peak: {
        heapUsed: Math.max(...heapUsed),
        heapTotal: Math.max(...heapTotal)
      },
      average: {
        heapUsed: heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length,
        heapTotal: heapTotal.reduce((a, b) => a + b, 0) / heapTotal.length
      },
      increase: {
        heapUsed: Math.max(...heapUsed) - this.initialMemory.heapUsed,
        heapTotal: Math.max(...heapTotal) - this.initialMemory.heapTotal
      }
    };
  }
}

// Statistical utilities
class Statistics {
  static mean(values) {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  static median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
  
  static standardDeviation(values) {
    const mean = this.mean(values);
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }
  
  static min(values) {
    return Math.min(...values);
  }
  
  static max(values) {
    return Math.max(...values);
  }
  
  static confidenceInterval(values, confidence = 0.95) {
    const mean = this.mean(values);
    const stdDev = this.standardDeviation(values);
    const zScore = 1.96; // For 95% confidence
    const margin = zScore * (stdDev / Math.sqrt(values.length));
    
    return {
      mean,
      margin,
      lower: mean - margin,
      upper: mean + margin
    };
  }
}

// Benchmark runner
class BenchmarkRunner {
  constructor() {
    this.results = [];
    this.libraries = {};
    this.loadLibraries();
  }
  
  loadLibraries() {
    // Load jtcsv
    try {
      this.libraries.jtcsv = require('../dist/index.js');
    } catch (error) {
      console.error('Failed to load jtcsv:', error.message);
    }
    
    // Load competitors
    const competitors = [
      { name: 'papaparse', module: 'papaparse' },
      { name: 'csvParser', module: 'csv-parser' },
      { name: 'csvtojson', module: 'csvtojson' },
      { name: 'json2csv', module: 'json2csv' },
      { name: 'fastCsv', module: 'fast-csv' }
    ];
    
    competitors.forEach(({ name, module }) => {
      try {
        this.libraries[name] = require(module);
      } catch (error) {
        console.warn(`${module} not installed, skipping ${name} benchmarks`);
      }
    });
  }
  
  async runBenchmark(name, fn, iterations = 5) {
    const times = [];
    const memoryStats = [];
    
    console.log(`  Running ${name} (${iterations} iterations)...`);
    
    for (let i = 0; i < iterations; i++) {
      // Garbage collection before each run
      if (global.gc) {
        global.gc();
      }
      
      const memoryTracker = new MemoryTracker();
      memoryTracker.sample();
      
      const start = performance.now();
      await fn();
      const end = performance.now();
      
      memoryTracker.sample();
      
      times.push(end - start);
      memoryStats.push(memoryTracker.getStats());
      
      // Small delay between iterations
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const stats = {
      times: {
        raw: times,
        mean: Statistics.mean(times),
        median: Statistics.median(times),
        stdDev: Statistics.standardDeviation(times),
        min: Statistics.min(times),
        max: Statistics.max(times),
        confidence: Statistics.confidenceInterval(times)
      },
      memory: memoryStats[memoryStats.length - 1] // Use last sample stats
    };
    
    return stats;
  }
  
  async runCsvToJsonBenchmark(csvData, libraries, iterations) {
    const results = {};
    
    // jtcsv
    if (libraries.jtcsv) {
      results.jtcsv = await this.runBenchmark('jtcsv CSV→JSON', async () => {
        const result = libraries.jtcsv.csvToJson(csvData, {
          hasHeaders: true,
          parseNumbers: true,
          parseBooleans: true
        });
        if (!Array.isArray(result) || result.length === 0) {
          throw new Error('jtcsv returned invalid result');
        }
      }, iterations);
    }
    
    // PapaParse
    if (libraries.papaparse) {
      results.papaparse = await this.runBenchmark('PapaParse CSV→JSON', async () => {
        return new Promise((resolve, reject) => {
          libraries.papaparse.parse(csvData, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
              if (!results.data || !Array.isArray(results.data)) {
                reject(new Error('PapaParse returned invalid result'));
              }
              resolve();
            },
            error: reject
          });
        });
      }, iterations);
    }
    
    // csv-parser
    if (libraries.csvParser) {
      results.csvParser = await this.runBenchmark('csv-parser CSV→JSON', async () => {
        return new Promise((resolve, reject) => {
          const results = [];
          const parser = libraries.csvParser();
          parser.on('data', (data) => results.push(data));
          parser.on('end', () => {
            if (results.length === 0) {
              reject(new Error('csv-parser returned no data'));
            }
            resolve();
          });
          parser.on('error', reject);
          parser.write(csvData);
          parser.end();
        });
      }, iterations);
    }
    
    // csvtojson
    if (libraries.csvtojson) {
      results.csvtojson = await this.runBenchmark('csvtojson CSV→JSON', async () => {
        const converter = libraries.csvtojson();
        const result = await converter.fromString(csvData);
        if (!Array.isArray(result) || result.length === 0) {
          throw new Error('csvtojson returned invalid result');
        }
      }, iterations);
    }
    
    return results;
  }
  
  async runJsonToCsvBenchmark(jsonData, libraries, iterations) {
    const results = {};
    
    // jtcsv
    if (libraries.jtcsv) {
      results.jtcsv = await this.runBenchmark('jtcsv JSON→CSV', async () => {
        const result = libraries.jtcsv.jsonToCsv(jsonData, {
          delimiter: ',',
          rfc4180Compliant: true
        });
        if (typeof result !== 'string' || result.length === 0) {
          throw new Error('jtcsv returned invalid result');
        }
      }, iterations);
    }
    
    // PapaParse
    if (libraries.papaparse) {
      results.papaparse = await this.runBenchmark('PapaParse JSON→CSV', async () => {
        const result = libraries.papaparse.unparse(jsonData);
        if (typeof result !== 'string' || result.length === 0) {
          throw new Error('PapaParse returned invalid result');
        }
      }, iterations);
    }
    
    // json2csv
    if (libraries.json2csv) {
      results.json2csv = await this.runBenchmark('json2csv JSON→CSV', async () => {
        const parser = new libraries.json2csv.Parser();
        const result = parser.parse(jsonData);
        if (typeof result !== 'string' || result.length === 0) {
          throw new Error('json2csv returned invalid result');
        }
      }, iterations);
    }
    
    return results;
  }
  
  async runStreamingBenchmark(filePath, libraries, iterations) {
    const results = {};
    const fs = require('fs');
    
    // jtcsv streaming
    if (libraries.jtcsv) {
      results.jtcsv = await this.runBenchmark('jtcsv Streaming', async () => {
        return new Promise((resolve, reject) => {
          const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
          const parser = libraries.jtcsv.createCsvToJsonStream({
            hasHeaders: true,
            parseNumbers: true
          });
          
          let rowCount = 0;
          parser.on('data', () => rowCount++);
          parser.on('end', () => {
            if (rowCount === 0) {
              reject(new Error('jtcsv streaming processed no rows'));
            }
            resolve();
          });
          parser.on('error', reject);
          
          stream.pipe(parser);
        });
      }, iterations);
    }
    
    // csv-parser streaming
    if (libraries.csvParser) {
      results.csvParser = await this.runBenchmark('csv-parser Streaming', async () => {
        return new Promise((resolve, reject) => {
          const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
          const parser = libraries.csvParser();
          
          let rowCount = 0;
          parser.on('data', () => rowCount++);
          parser.on('end', () => {
            if (rowCount === 0) {
              reject(new Error('csv-parser streaming processed no rows'));
            }
            resolve();
          });
          parser.on('error', reject);
          
          stream.pipe(parser);
        });
      }, iterations);
    }
    
    return results;
  }
  
  async runScenario(scenarioName, iterations) {
    const scenario = scenarios[scenarioName];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioName}`);
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Scenario: ${scenario.name}`);
    console.log(`Description: ${scenario.description}`);
    console.log(`${'='.repeat(60)}`);
    
    const result = {
      scenario: scenarioName,
      name: scenario.name,
      description: scenario.description,
      parameters: {
        csvRows: scenario.csvRows,
        jsonRows: scenario.jsonRows,
        columns: scenario.columns
      },
      results: {}
    };

    // Generate test data
    console.log('  Generating test data...');
    const csvData = testDataGenerators.generateCsv(scenario.csvRows, scenario.columns);
    const jsonData = testDataGenerators.generateJson(scenario.jsonRows, scenario.columns);

    // Run CSV to JSON benchmarks
    console.log('\n  CSV → JSON Benchmarks:');
    result.results.csvToJson = await this.runCsvToJsonBenchmark(
      csvData,
      this.libraries,
      iterations
    );

    // Run JSON to CSV benchmarks
    console.log('\n  JSON → CSV Benchmarks:');
    result.results.jsonToCsv = await this.runJsonToCsvBenchmark(
      jsonData,
      this.libraries,
      iterations
    );

    // Run streaming benchmarks if applicable
    if (scenario.fileBased) {
      console.log('\n  Streaming Benchmarks:');
      const tempFile = path.join(__dirname, `temp-benchmark-${Date.now()}.csv`);
      
      try {
        console.log(`    Generating temporary file: ${tempFile}`);
        await testDataGenerators.generateLargeFile(tempFile, scenario.csvRows);
        
        result.results.streaming = await this.runStreamingBenchmark(
          tempFile,
          this.libraries,
          Math.min(iterations, 3) // Fewer iterations for large files
        );
      } finally {
        // Clean up temporary file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    }

    return result;
  }

  printResults(results) {
    console.log('\n' + '='.repeat(80));
    console.log('BENCHMARK RESULTS');
    console.log('='.repeat(80));

    Object.entries(results).forEach(([scenarioName, scenarioResult]) => {
      console.log(`\n${scenarioResult.name.toUpperCase()}`);
      console.log('-'.repeat(40));

      // CSV to JSON results
      if (scenarioResult.results.csvToJson) {
        console.log('\nCSV → JSON Performance (mean time in ms):');
        const csvResults = Object.entries(scenarioResult.results.csvToJson)
          .map(([lib, stats]) => ({
            library: lib,
            time: stats.times.mean,
            memory: stats.memory?.peak?.heapUsed || 0
          }))
          .sort((a, b) => a.time - b.time);

        csvResults.forEach((result, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
          console.log(`  ${medal} ${result.library.padEnd(12)}: ${result.time.toFixed(2)}ms (peak memory: ${Math.round(result.memory / 1024 / 1024 * 100) / 100} MB)`);
        });
      }

      // JSON to CSV results
      if (scenarioResult.results.jsonToCsv) {
        console.log('\nJSON → CSV Performance (mean time in ms):');
        const jsonResults = Object.entries(scenarioResult.results.jsonToCsv)
          .map(([lib, stats]) => ({
            library: lib,
            time: stats.times.mean,
            memory: stats.memory?.peak?.heapUsed || 0
          }))
          .sort((a, b) => a.time - b.time);

        jsonResults.forEach((result, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
          console.log(`  ${medal} ${result.library.padEnd(12)}: ${result.time.toFixed(2)}ms (peak memory: ${Math.round(result.memory / 1024 / 1024 * 100) / 100} MB)`);
        });
      }

      // Streaming results
      if (scenarioResult.results.streaming) {
        console.log('\nStreaming Performance (mean time in ms):');
        const streamResults = Object.entries(scenarioResult.results.streaming)
          .map(([lib, stats]) => ({
            library: lib,
            time: stats.times.mean,
            memory: stats.memory?.peak?.heapUsed || 0
          }))
          .sort((a, b) => a.time - b.time);

        streamResults.forEach((result, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
          console.log(`  ${medal} ${result.library.padEnd(12)}: ${result.time.toFixed(2)}ms (peak memory: ${Math.round(result.memory / 1024 / 1024 * 100) / 100} MB)`);
        });
      }
    });
  }

  saveResults(results, outputFile) {
    const output = {
      environment,
      config: {
        iterations: config.iterations,
        scenario: config.scenario,
        timestamp: new Date().toISOString()
      },
      results
    };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`\nResults saved to: ${outputFile}`);
  }
}

// Main execution
async function main() {
  console.log('='.repeat(80));
  console.log('INDEPENDENT BENCHMARK SUITE FOR JTCSV');
  console.log('='.repeat(80));
  
  console.log('\nEnvironment:');
  console.log(`  Node.js: ${environment.nodeVersion}`);
  console.log(`  Platform: ${environment.platform}/${environment.arch}`);
  console.log(`  CPUs: ${environment.cpus}`);
  console.log(`  Memory: ${environment.totalMemory} total, ${environment.freeMemory} free`);
  
  const runner = new BenchmarkRunner();
  const allResults = {};
  
  // Determine which scenarios to run
  const scenariosToRun = config.scenario === 'all'
    ? Object.keys(scenarios)
    : [config.scenario];
  
  for (const scenarioName of scenariosToRun) {
    if (!scenarios[scenarioName]) {
      console.error(`\nError: Unknown scenario "${scenarioName}"`);
      console.error('Available scenarios:', Object.keys(scenarios).join(', '));
      process.exit(1);
    }
    
    try {
      const scenarioResult = await runner.runScenario(scenarioName, config.iterations);
      allResults[scenarioName] = scenarioResult;
    } catch (error) {
      console.error(`\nError running scenario "${scenarioName}":`, error.message);
    }
  }
  
  // Print results
  runner.printResults(allResults);
  
  // Save results
  runner.saveResults(allResults, config.output);
  
  console.log('\n' + '='.repeat(80));
  console.log('BENCHMARK COMPLETE');
  console.log('='.repeat(80));
}

// Run with error handling
main().catch(error => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
