# Streaming Guide for jtcsv
Current version: 3.1.0


## Overview

jtcsv provides powerful streaming capabilities for processing large CSV/JSON files without loading them entirely into memory. This guide covers all streaming APIs, best practices, and real-world examples.

## Why Streaming?

- **Memory Efficiency**: Process files larger than available RAM
- **Real-time Processing**: Start processing immediately without waiting for entire file
- **Backpressure Handling**: Control data flow to prevent memory overflow
- **Error Resilience**: Handle errors per-row without losing entire dataset

## When to Prefer Streaming

If you are parsing large CSV/JSON payloads in memory, prefer streaming APIs:
- `csvToJson` and `jsonToCsv` load all rows into memory.
- The library warns when row/record count exceeds `memoryWarningThreshold` (default: 1,000,000).
- A safety limit (`memoryLimit`, default: 5,000,000) prevents accidental out-of-memory crashes.
- Override the safety limit with `memoryLimit: Infinity` if you explicitly want full in-memory parsing.

## Core Streaming APIs

### 1. CSV to JSON Streaming

#### `createCsvToJsonStream(options)`
Creates a transform stream that converts CSV chunks to JSON objects.

```javascript
const { createCsvToJsonStream } = require('jtcsv/stream-csv-to-json');
const fs = require('fs');
const { pipeline } = require('stream/promises');

async function processLargeCsv() {
  const csvStream = fs.createReadStream('./large-file.csv', 'utf8');
  const jsonStream = createCsvToJsonStream({
    delimiter: ',',
    hasHeaders: true,
    parseNumbers: true,
    parseBooleans: true,
    maxRows: 1000000 // Limit processing
  });

  const writable = new (require('stream').Writable)({
    objectMode: true,
    write(chunk, encoding, callback) {
      console.log('Processed row:', chunk);
      // Process each row as it arrives
      callback();
    }
  });

  await pipeline(csvStream, jsonStream, writable);
  console.log('Stream processing complete');
}
```

#### `streamCsvToJson(input, options)`
Higher-level function that returns an async iterator.

```javascript
const { streamCsvToJson } = require('jtcsv');

async function processWithIterator() {
  const stream = fs.createReadStream('./data.csv');
  
  for await (const row of streamCsvToJson(stream, {
    delimiter: ';',
    transform: (row) => ({
      ...row,
      processedAt: new Date().toISOString()
    })
  })) {
    // Process each row immediately
    await saveToDatabase(row);
  }
}
```

### 2. JSON to CSV Streaming

#### `createJsonToCsvStream(options)`
Creates a transform stream that converts JSON objects to CSV rows.

```javascript
const { createJsonToCsvStream } = require('jtcsv/stream-json-to-csv');
const fs = require('fs');

async function exportLargeDataset() {
  const jsonStream = Readable.from([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    // ... millions of objects
  ]);

  const csvStream = createJsonToCsvStream({
    delimiter: ',',
    headers: ['id', 'name'],
    includeHeaders: true
  });

  const output = fs.createWriteStream('./export.csv');
  
  await pipeline(jsonStream, csvStream, output);
  console.log('Export completed');
}
```

#### `streamJsonToCsv(input, options)`
Process JSON array or stream to CSV.

```javascript
const { streamJsonToCsv } = require('jtcsv');

// Stream from database cursor
async function streamFromDatabase() {
  const cursor = db.collection('users').find({});
  const csvStream = await streamJsonToCsv(cursor, {
    headers: ['_id', 'email', 'createdAt'],
    delimiter: '\t' // TSV format
  });

  // Pipe to HTTP response or file
  csvStream.pipe(res);
}
```

## Real-World Examples

### Example 1: Processing 10GB CSV File

```javascript
const { createCsvToJsonStream } = require('jtcsv/stream-csv-to-json');
const fs = require('fs');
const { pipeline } = require('stream/promises');

async function process10GbCsv() {
  console.time('processing');
  
  const csvStream = fs.createReadStream('./10gb-data.csv', {
    highWaterMark: 64 * 1024 // 64KB chunks for optimal performance
  });

  const parser = createCsvToJsonStream({
    delimiter: ',',
    hasHeaders: true,
    parseNumbers: true,
    // Process in batches of 1000 rows
    batchSize: 1000,
    transform: async (batch) => {
      // Bulk insert to database
      await db.insertMany(batch);
      console.log(`Inserted ${batch.length} rows`);
    }
  });

  const monitor = new (require('stream').Transform)({
    objectMode: true,
    transform(chunk, encoding, callback) {
      this.rowCount = (this.rowCount || 0) + 1;
      if (this.rowCount % 100000 === 0) {
        console.log(`Processed ${this.rowCount} rows`);
      }
      callback(null, chunk);
    }
  });

  await pipeline(csvStream, parser, monitor);
  
  console.timeEnd('processing');
  console.log('10GB file processed successfully');
}
```

### Example 2: Real-time Data Pipeline

```javascript
const { createCsvToJsonStream, createJsonToCsvStream } = require('jtcsv');
const { Transform, pipeline } = require('stream');

class DataEnricher extends Transform {
  constructor() {
    super({ objectMode: true });
  }
  
  async _transform(row, encoding, callback) {
    try {
      // Enrich data with external API
      const enriched = await enrichWithExternalApi(row);
      callback(null, enriched);
    } catch (error) {
      // Skip problematic rows, don't break entire stream
      console.warn(`Skipping row ${row.id}:`, error.message);
      callback();
    }
  }
}

async function realTimePipeline() {
  // Read from HTTP stream
  const response = await fetch('https://api.example.com/live-data.csv');
  const csvStream = response.body;
  
  const pipeline = [
    createCsvToJsonStream({ delimiter: ',' }),
    new DataEnricher(),
    createJsonToCsvStream({
      headers: ['id', 'name', 'enrichedValue'],
      delimiter: '|'
    })
  ];
  
  // Write to Kafka or another stream
  const kafkaProducer = createKafkaProducer();
  
  await pipelineStreams(csvStream, ...pipeline, kafkaProducer);
}
```

### Example 3: Error Handling in Streams

```javascript
const { createCsvToJsonStream } = require('jtcsv/stream-csv-to-json');

async function robustStreamProcessing() {
  const errorLog = fs.createWriteStream('./errors.log');
  let successCount = 0;
  let errorCount = 0;

  const parser = createCsvToJsonStream({
    delimiter: ',',
    hasHeaders: true,
    // Custom error handler per row
    onError: (error, row, rowNumber) => {
      errorCount++;
      errorLog.write(`Row ${rowNumber}: ${error.message}\n`);
      // Return null to skip this row
      return null;
    },
    // Validate each row
    validate: (row) => {
      if (!row.id || !row.email) {
        throw new Error('Missing required fields');
      }
      return true;
    }
  });

  const processor = new (require('stream').Writable)({
    objectMode: true,
    write(row, encoding, callback) {
      if (row) {
        successCount++;
        processRow(row);
      }
      callback();
    }
  });

  parser.on('end', () => {
    console.log(`Processing complete: ${successCount} successful, ${errorCount} errors`);
    errorLog.end();
  });

  fs.createReadStream('./data.csv').pipe(parser).pipe(processor);
}
```

## Performance Optimization

### 1. Chunk Size Tuning

```javascript
// Optimal settings for different scenarios
const optimizations = {
  'high-memory': {
    highWaterMark: 1024 * 1024, // 1MB chunks
    batchSize: 5000
  },
  'low-memory': {
    highWaterMark: 16 * 1024, // 16KB chunks
    batchSize: 100
  },
  'network-streaming': {
    highWaterMark: 64 * 1024, // 64KB chunks
    batchSize: 1000
  }
};
```

### 2. Memory Monitoring

```javascript
const { createCsvToJsonStream } = require('jtcsv/stream-csv-to-json');

function createMemoryAwareStream() {
  let memoryWarning = false;
  
  setInterval(() => {
    const used = process.memoryUsage();
    if (used.heapUsed > 500 * 1024 * 1024) { // 500MB
      memoryWarning = true;
      console.warn('High memory usage, pausing stream...');
    }
  }, 1000);

  return createCsvToJsonStream({
    delimiter: ',',
    // Pause/resume based on memory
    highWaterMark: memoryWarning ? 0 : 1000
  });
}
```

### 3. Parallel Processing

```javascript
const { createCsvToJsonStream } = require('jtcsv/stream-csv-to-json');
const { Transform } = require('stream');
const { Worker } = require('worker_threads');

class ParallelProcessor extends Transform {
  constructor(concurrency = 4) {
    super({ objectMode: true });
    this.workers = Array.from({ length: concurrency }, () => new Worker('./processor.js'));
    this.queue = [];
    this.processing = 0;
  }
  
  _transform(row, encoding, callback) {
    this.queue.push({ row, callback });
    this._processQueue();
  }
  
  _processQueue() {
    while (this.queue.length > 0 && this.processing < this.workers.length) {
      const { row, callback } = this.queue.shift();
      this.processing++;
      
      const worker = this.workers[this.processing % this.workers.length];
      worker.postMessage(row);
      worker.once('message', (result) => {
        this.push(result);
        this.processing--;
        callback();
        this._processQueue();
      });
    }
  }
}

// Usage
fs.createReadStream('./large.csv')
  .pipe(createCsvToJsonStream())
  .pipe(new ParallelProcessor(8))
  .pipe(createJsonToCsvStream())
  .pipe(fs.createWriteStream('./processed.csv'));
```

## Browser Streaming

### Web Streams API Support

```javascript
import { createCsvToJsonStream } from 'jtcsv/browser';

async function processInBrowser() {
  const response = await fetch('/api/large-csv');
  const csvStream = response.body;
  
  const jsonStream = createCsvToJsonStream({
    delimiter: ',',
    hasHeaders: true
  });
  
  const reader = jsonStream.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Process each row without blocking UI
    updateUI(value);
    
    // Yield to main thread periodically
    if (performance.now() - lastYield > 16) { // ~60fps
      await new Promise(resolve => setTimeout(resolve, 0));
      lastYield = performance.now();
    }
  }
}
```

### Web Workers for Heavy Processing

```javascript
// main.js
const worker = new Worker('./csv-worker.js');

worker.postMessage({
  type: 'process',
  csvUrl: '/api/large-data.csv',
  options: { delimiter: ',', parseNumbers: true }
});

worker.onmessage = (event) => {
  if (event.data.type === 'row') {
    console.log('Processed row:', event.data.row);
  } else if (event.data.type === 'complete') {
    console.log('Processing complete');
  }
};

// csv-worker.js
importScripts('https://unpkg.com/jtcsv@latest/dist/jtcsv-browser.min.js');

self.onmessage = async (event) => {
  const { csvUrl, options } = event.data;
  const response = await fetch(csvUrl);
  const stream = response.body;
  
  for await (const row of jtcsv.streamCsvToJson(stream, options)) {
    self.postMessage({ type: 'row', row });
  }
  
  self.postMessage({ type: 'complete' });
};
```

## Common Patterns

### 1. Filter and Transform Pipeline

```javascript
const { createCsvToJsonStream, createJsonToCsvStream } = require('jtcsv');
const { Transform, pipeline } = require('stream');

const filterActiveUsers = new Transform({
  objectMode: true,
  transform(row, encoding, callback) {
    if (row.status === 'active') {
      callback(null, row);
    } else {
      callback(); // Skip inactive users
    }
  }
});

const addTimestamp = new Transform({
  objectMode: true,
  transform(row, encoding, callback) {
    row.processedAt = new Date().toISOString();
    callback(null, row);
  }
});

async function buildPipeline() {
  await pipeline(
    fs.createReadStream('./users.csv'),
    createCsvToJsonStream(),
    filterActiveUsers,
    addTimestamp,
    createJsonToCsvStream(),
    fs.createWriteStream('./active-users.csv')
  );
}
```

### 2. Batch Processing with Database

```javascript
const { createCsvToJsonStream } = require('jtcsv');

class BatchDatabaseWriter extends require('stream').Writable {
  constructor(batchSize = 1000) {
    super({ objectMode: true });
    this.batch = [];
    this.batchSize = batchSize;
  }
  
  _write(row, encoding, callback) {
    this.batch.push(row);
    
    if (this.batch.length >= this.batchSize) {
      this._flushBatch(callback);
    } else {
      callback();
    }
  }
  
  async _flushBatch(callback) {
    try {
      await db.collection('data').insertMany(this.batch);
      console.log(`Inserted ${this.batch.length} rows`);
      this.batch = [];
      callback();
    } catch (error) {
      callback(error);
    }
  }
  
  _final(callback) {
    if (this.batch.length > 0) {
      this._flushBatch(callback);
    } else {
      callback();
    }
  }
}

// Usage
fs.createReadStream('./large.csv')
  .pipe(createCsvToJsonStream())
  .pipe(new BatchDatabaseWriter(5000));
```

### 3. Progress Monitoring

```javascript
const { createCsvToJsonStream } = require('jtcsv');

function createStreamWithProgress(totalBytes) {
  let processedBytes = 0;
  let processedRows = 0;
  
  const progressStream = new (require('stream').Transform)({
    transform(chunk, encoding, callback) {
      processedBytes += chunk.length;
      const percent = Math.round((processedBytes / totalBytes) * 100);
      
      // Update progress every 1%
      if (percent % 1 === 0) {
        console.log(`Progress: ${percent}% (${processedRows} rows)`);
      }
      
      callback(null, chunk);
    }
  });
  
  const rowCounter = new (require('stream').Transform)({
    objectMode: true,
    transform(row, encoding, callback) {
      processedRows++;
      callback(null, row);
    }
  });
  
  return { progressStream, rowCounter };
}

// Usage
const fileStats = fs.statSync('./large.csv');
const { progressStream, rowCounter } = createStreamWithProgress(fileStats.size);

fs.createReadStream('./large.csv')
  .pipe(progressStream)
  .pipe(createCsvToJsonStream())
  .pipe(rowCounter)
  .pipe(/* ... */);
```

## Troubleshooting

### Common Issues and Solutions

1. **Stream Stalls or Memory Grows**
   - Reduce `highWaterMark` size
   - Implement backpressure handling
   - Use smaller batch sizes

2. **Encoding Issues**
   ```javascript
   fs.createReadStream('./file.csv', { 
     encoding: 'utf8',
     // Handle BOM automatically
     autoDetectEncoding: true 
   })
   ```

3. **Performance Bottlenecks**
   - Profile with `node --inspect`
   - Check if transform functions are synchronous
   - Consider worker threads for CPU-intensive operations

4. **Error Recovery**
   ```javascript
   parser.on('error', (error) => {
     console.error('Parser error:', error);
     // Skip to next line or recover
     parser.resume();
   });
   ```

## Best Practices

1. **Always Handle Errors**
   ```javascript
   pipeline(stream1, stream2, stream3)
     .catch(error => {
       console.error('Pipeline failed:', error);
       // Cleanup resources
     });
   ```

2. **Monitor Memory Usage**
   ```javascript
   setInterval(() => {
     const memory = process.memoryUsage();
     if (memory.heapUsed > 1e9) { // 1GB
       console.warn('High memory usage');
     }
   }, 5000);
   ```

3. **Use Appropriate Chunk Sizes**
   - Small files: 16KB chunks
   - Large files: 64KB-1MB chunks
   - Network streams: 32KB chunks

4. **Test with Real Data**
   - Always test with files similar to production size
   - Monitor performance under load
   - Implement circuit breakers for error scenarios

## API Reference

### `createCsvToJsonStream(options)`
- `options.delimiter`: CSV delimiter (default: ';')
- `options.hasHeaders`: Whether CSV has headers (default: true)
- `options.parseNumbers`: Parse numeric values (default: false)
- `options.parseBooleans`: Parse boolean values (default: false)
- `options.maxRows`: Maximum rows to process
- `options.batchSize`: Rows per batch (default: 1000)
- `options.transform`: Function to transform each row/batch
- `options.onError`: Error handler function
- `options.validate`: Row validation function

### `createJsonToCsvStream(options)`
- `options.headers`: Column headers array
- `options.delimiter`: Output delimiter (default: ',')
- `options.includeHeaders`: Include header row

### Batch helpers (Node.js)
- `createBatchProcessor(processor, { batchSize, parallelism })`: returns an async generator that processes an array in batches with limited parallelism.
- `asyncIterUtils.batch(iterator, size)`: group an async iterator into arrays of `size`.
- `asyncIterUtils.mapConcurrent(iterator, mapper, concurrency)`: map items concurrently from an async iterator.
