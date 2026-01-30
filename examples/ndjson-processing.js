/**
 * NDJSON Processing Examples for jtcsv
 *
 * NDJSON (Newline Delimited JSON) is a format where each line
 * is a valid JSON object. It's ideal for streaming large datasets
 * and log processing.
 */

const {
  jsonToNdjson,
  ndjsonToJson,
  parseNdjsonStream,
  createNdjsonToCsvStream,
  createCsvToNdjsonStream,
  getNdjsonStats
} = require('jtcsv');

const fs = require('fs');
const path = require('path');
const { Readable, PassThrough } = require('stream');

// =============================================================================
// Example 1: Basic NDJSON Conversion
// =============================================================================

function basicNdjsonConversion() {
  console.log('\n=== Basic NDJSON Conversion ===\n');

  const data = [
    { id: 1, event: 'login', user: 'john', timestamp: '2024-01-15T10:30:00Z' },
    { id: 2, event: 'click', user: 'john', timestamp: '2024-01-15T10:30:15Z' },
    { id: 3, event: 'purchase', user: 'john', timestamp: '2024-01-15T10:31:00Z' },
    { id: 4, event: 'logout', user: 'john', timestamp: '2024-01-15T10:35:00Z' }
  ];

  // Convert to NDJSON
  const ndjson = jsonToNdjson(data);
  console.log('NDJSON output:');
  console.log(ndjson);

  // Parse back to JSON
  const parsed = ndjsonToJson(ndjson);
  console.log('\nParsed back:', parsed.length, 'records');
}

// =============================================================================
// Example 2: NDJSON with Transform and Filter
// =============================================================================

function ndjsonWithTransformAndFilter() {
  console.log('\n=== NDJSON with Transform and Filter ===\n');

  const logEntries = [
    { level: 'info', message: 'Application started', ts: 1705312200 },
    { level: 'debug', message: 'Connecting to database', ts: 1705312201 },
    { level: 'error', message: 'Connection failed', ts: 1705312202 },
    { level: 'info', message: 'Retry connection', ts: 1705312203 },
    { level: 'info', message: 'Connected successfully', ts: 1705312204 },
    { level: 'debug', message: 'Query executed', ts: 1705312205 }
  ];

  // Convert with transform - add formatted timestamp
  const ndjson = jsonToNdjson(logEntries, {
    transform: (obj, index) => ({
      ...obj,
      index,
      formattedTime: new Date(obj.ts * 1000).toISOString()
    })
  });
  console.log('Transformed NDJSON:');
  console.log(ndjson);

  // Parse back with filter - only errors and info
  const filtered = ndjsonToJson(ndjson, {
    filter: (obj) => obj.level === 'error' || obj.level === 'info'
  });
  console.log('\nFiltered entries (error + info only):', filtered.length);
  filtered.forEach(e => console.log(`  [${e.level}] ${e.message}`));
}

// =============================================================================
// Example 3: NDJSON Error Handling
// =============================================================================

function ndjsonErrorHandling() {
  console.log('\n=== NDJSON Error Handling ===\n');

  // NDJSON with some invalid lines
  const mixedNdjson = `{"id": 1, "valid": true}
{"id": 2, "valid": true}
{invalid json here}
{"id": 3, "valid": true}
not json at all
{"id": 4, "valid": true}`;

  const errors = [];

  const result = ndjsonToJson(mixedNdjson, {
    onError: (error, line, lineNumber) => {
      errors.push({
        lineNumber,
        error: error.message,
        content: line.substring(0, 30) + (line.length > 30 ? '...' : '')
      });
    }
  });

  console.log('Valid records:', result.length);
  console.log('Errors encountered:', errors.length);
  errors.forEach(e => {
    console.log(`  Line ${e.lineNumber}: ${e.error}`);
    console.log(`    Content: ${e.content}`);
  });
}

// =============================================================================
// Example 4: Streaming NDJSON Processing
// =============================================================================

async function streamingNdjsonProcessing() {
  console.log('\n=== Streaming NDJSON Processing ===\n');

  // Create a stream from NDJSON string
  const ndjsonContent = `{"type": "user", "name": "Alice", "age": 28}
{"type": "user", "name": "Bob", "age": 35}
{"type": "product", "name": "Laptop", "price": 999}
{"type": "user", "name": "Charlie", "age": 42}
{"type": "product", "name": "Phone", "price": 599}`;

  // Create readable stream
  const stream = Readable.from([ndjsonContent]);

  // Process stream with async iterator
  const users = [];
  const products = [];

  for await (const obj of parseNdjsonStream(stream)) {
    if (obj.type === 'user') {
      users.push(obj);
    } else if (obj.type === 'product') {
      products.push(obj);
    }
  }

  console.log('Users found:', users.length);
  users.forEach(u => console.log(`  - ${u.name}, ${u.age} years old`));

  console.log('\nProducts found:', products.length);
  products.forEach(p => console.log(`  - ${p.name}: $${p.price}`));
}

// =============================================================================
// Example 5: NDJSON to CSV Conversion
// =============================================================================

async function ndjsonToCsvConversion() {
  console.log('\n=== NDJSON to CSV Conversion ===\n');

  const ndjson = `{"name": "Alice", "department": "Engineering", "salary": 85000}
{"name": "Bob", "department": "Marketing", "salary": 65000}
{"name": "Charlie", "department": "Engineering", "salary": 90000}
{"name": "Diana", "department": "Sales", "salary": 70000}`;

  // Create NDJSON to CSV transform stream
  const transformStream = createNdjsonToCsvStream({
    delimiter: ',',
    includeHeaders: true
  });

  // Collect CSV output
  const csvOutput = '';
  transformStream.writable.getWriter();

  // Manual stream processing for demo
  const lines = ndjson.split('\n');
  const objects = lines.map(line => JSON.parse(line));

  // Convert to CSV manually for this example
  const { jsonToCsv } = require('jtcsv');
  const csv = jsonToCsv(objects, { delimiter: ',' });

  console.log('Converted CSV:');
  console.log(csv);
}

// =============================================================================
// Example 6: CSV to NDJSON Conversion
// =============================================================================

function csvToNdjsonConversion() {
  console.log('\n=== CSV to NDJSON Conversion ===\n');

  const csv = `id,name,email,active
1,John Doe,john@example.com,true
2,Jane Smith,jane@example.com,false
3,Bob Wilson,bob@example.com,true`;

  const { csvToJson } = require('jtcsv');

  // Parse CSV first
  const data = csvToJson(csv, {
    parseNumbers: true,
    parseBooleans: true
  });

  // Convert to NDJSON
  const ndjson = jsonToNdjson(data);
  console.log('NDJSON output:');
  console.log(ndjson);
}

// =============================================================================
// Example 7: NDJSON Statistics
// =============================================================================

async function ndjsonStatistics() {
  console.log('\n=== NDJSON Statistics ===\n');

  const ndjson = `{"id": 1, "type": "event"}
{"id": 2, "type": "event"}
{invalid}
{"id": 3, "type": "event"}
not json
{"id": 4, "type": "event"}
{"id": 5, "type": "event"}`;

  const stats = await getNdjsonStats(ndjson);

  console.log('NDJSON Statistics:');
  console.log('  Total lines:', stats.totalLines);
  console.log('  Valid lines:', stats.validLines);
  console.log('  Error lines:', stats.errorLines);
  console.log('  Total bytes:', stats.totalBytes);
  console.log('  Success rate:', (stats.successRate * 100).toFixed(1) + '%');

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    stats.errors.forEach(e => {
      console.log(`  Line ${e.line}: ${e.error}`);
    });
  }
}

// =============================================================================
// Example 8: Large NDJSON Processing with Memory Efficiency
// =============================================================================

async function largeNdjsonProcessing() {
  console.log('\n=== Large NDJSON Processing ===\n');

  // Simulate large NDJSON data
  const generateLargeNdjson = (count) => {
    const lines = [];
    for (let i = 0; i < count; i++) {
      lines.push(JSON.stringify({
        id: i,
        timestamp: Date.now() + i,
        value: Math.random() * 100,
        category: ['A', 'B', 'C'][i % 3]
      }));
    }
    return lines.join('\n');
  };

  const largeNdjson = generateLargeNdjson(10000);
  console.log(`Generated ${largeNdjson.split('\n').length} NDJSON lines`);

  // Process with aggregation
  const stats = {
    count: 0,
    sum: 0,
    categories: {}
  };

  const startTime = Date.now();

  for await (const obj of parseNdjsonStream(Readable.from([largeNdjson]))) {
    stats.count++;
    stats.sum += obj.value;
    stats.categories[obj.category] = (stats.categories[obj.category] || 0) + 1;
  }

  const endTime = Date.now();

  console.log('\nAggregation results:');
  console.log('  Records processed:', stats.count);
  console.log('  Average value:', (stats.sum / stats.count).toFixed(2));
  console.log('  Categories:', stats.categories);
  console.log('  Processing time:', endTime - startTime, 'ms');
  console.log('  Throughput:', Math.round(stats.count / ((endTime - startTime) / 1000)), 'records/sec');
}

// =============================================================================
// Example 9: NDJSON Log Processing Pipeline
// =============================================================================

async function logProcessingPipeline() {
  console.log('\n=== NDJSON Log Processing Pipeline ===\n');

  // Simulated log entries
  const logs = `{"ts": "2024-01-15T10:00:00Z", "level": "info", "service": "api", "msg": "Request received", "duration_ms": 50}
{"ts": "2024-01-15T10:00:01Z", "level": "debug", "service": "api", "msg": "Processing request", "duration_ms": 0}
{"ts": "2024-01-15T10:00:02Z", "level": "warn", "service": "db", "msg": "Slow query detected", "duration_ms": 1500}
{"ts": "2024-01-15T10:00:03Z", "level": "error", "service": "api", "msg": "Request failed", "duration_ms": 100, "error": "Timeout"}
{"ts": "2024-01-15T10:00:04Z", "level": "info", "service": "api", "msg": "Request completed", "duration_ms": 45}
{"ts": "2024-01-15T10:00:05Z", "level": "error", "service": "db", "msg": "Connection lost", "duration_ms": 0, "error": "Network error"}`;

  // Pipeline stages
  const pipeline = {
    errors: [],
    warnings: [],
    slowRequests: [],
    serviceStats: {}
  };

  // Process logs
  for await (const log of parseNdjsonStream(Readable.from([logs]))) {
    // Collect errors
    if (log.level === 'error') {
      pipeline.errors.push({
        time: log.ts,
        service: log.service,
        message: log.msg,
        error: log.error
      });
    }

    // Collect warnings
    if (log.level === 'warn') {
      pipeline.warnings.push({
        time: log.ts,
        service: log.service,
        message: log.msg
      });
    }

    // Track slow requests (> 1000ms)
    if (log.duration_ms > 1000) {
      pipeline.slowRequests.push({
        time: log.ts,
        service: log.service,
        duration: log.duration_ms
      });
    }

    // Aggregate by service
    if (!pipeline.serviceStats[log.service]) {
      pipeline.serviceStats[log.service] = { count: 0, errors: 0 };
    }
    pipeline.serviceStats[log.service].count++;
    if (log.level === 'error') {
      pipeline.serviceStats[log.service].errors++;
    }
  }

  // Report
  console.log('Log Analysis Report:');
  console.log('\nErrors:', pipeline.errors.length);
  pipeline.errors.forEach(e => {
    console.log(`  [${e.service}] ${e.message} - ${e.error}`);
  });

  console.log('\nWarnings:', pipeline.warnings.length);
  pipeline.warnings.forEach(w => {
    console.log(`  [${w.service}] ${w.message}`);
  });

  console.log('\nSlow Requests (>1s):', pipeline.slowRequests.length);
  pipeline.slowRequests.forEach(s => {
    console.log(`  [${s.service}] ${s.duration}ms`);
  });

  console.log('\nService Statistics:');
  Object.entries(pipeline.serviceStats).forEach(([service, stats]) => {
    const errorRate = ((stats.errors / stats.count) * 100).toFixed(1);
    console.log(`  ${service}: ${stats.count} requests, ${stats.errors} errors (${errorRate}%)`);
  });
}

// =============================================================================
// Example 10: NDJSON Pretty Print and Compact
// =============================================================================

function ndjsonFormatting() {
  console.log('\n=== NDJSON Formatting Options ===\n');

  const data = [
    { name: 'Test', nested: { a: 1, b: 2 }, array: [1, 2, 3] }
  ];

  // Compact (default)
  const compact = jsonToNdjson(data);
  console.log('Compact:');
  console.log(compact);

  // With custom replacer (filter out 'array' field)
  const filtered = jsonToNdjson(data, {
    replacer: (key, value) => key === 'array' ? undefined : value
  });
  console.log('\nFiltered (no array):');
  console.log(filtered);

  // With space for readability (not standard NDJSON but useful for debugging)
  const pretty = jsonToNdjson(data, {
    space: 0 // Standard NDJSON should have no space
  });
  console.log('\nStandard NDJSON:');
  console.log(pretty);
}

// =============================================================================
// Run All Examples
// =============================================================================

async function main() {
  console.log('jtcsv NDJSON Processing Examples');
  console.log('='.repeat(60));

  basicNdjsonConversion();
  ndjsonWithTransformAndFilter();
  ndjsonErrorHandling();
  await streamingNdjsonProcessing();
  await ndjsonToCsvConversion();
  csvToNdjsonConversion();
  await ndjsonStatistics();
  await largeNdjsonProcessing();
  await logProcessingPipeline();
  ndjsonFormatting();

  console.log('\n' + '='.repeat(60));
  console.log('All NDJSON examples completed.');
}

main().catch(console.error);
