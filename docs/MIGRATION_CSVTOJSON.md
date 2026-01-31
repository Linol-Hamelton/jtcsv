# Migration Guide: csvtojson to jtcsv
Current version: 3.1.0


This guide helps you migrate from [csvtojson](https://github.com/Keyang/node-csvtojson) to jtcsv. Both libraries handle CSV parsing, but jtcsv offers bidirectional conversion, better performance, and enhanced security features.

## Table of Contents

- [Why Migrate?](#why-migrate)
- [Installation](#installation)
- [Quick Comparison](#quick-comparison)
- [API Mapping](#api-mapping)
  - [Basic CSV Parsing](#basic-csv-parsing)
  - [Streaming](#streaming)
  - [Column Mapping](#column-mapping)
  - [Data Transformation](#data-transformation)
  - [Error Handling](#error-handling)
- [Feature Comparison](#feature-comparison)
- [Common Migration Patterns](#common-migration-patterns)
- [Performance Comparison](#performance-comparison)
- [Breaking Changes to Watch](#breaking-changes-to-watch)

## Why Migrate?

| Feature | csvtojson | jtcsv |
|---------|-----------|-------|
| CSV → JSON | ✅ | ✅ |
| JSON → CSV | ❌ | ✅ |
| Streaming | ✅ | ✅ |
| TypeScript Support | @types package | Native |
| CSV Injection Protection | Manual | Built-in (default) |
| NDJSON Support | ❌ | ✅ |
| TSV Support | Via delimiter | Native API |
| RFC 4180 Compliance | Partial | Full |
| Bundle Size | ~45KB | ~55KB |
| Zero Dependencies | No | Yes (core) |
| Performance | Good | Better (see benchmarks) |

## Installation

```bash
# Remove csvtojson
npm uninstall csvtojson @types/csvtojson

# Install jtcsv
npm install jtcsv
```

## Quick Comparison

### csvtojson
```javascript
const csv = require('csvtojson');

// Parse CSV
csv()
  .fromString(csvString)
  .then((jsonArray) => {
    console.log(jsonArray);
  });

// Parse file
csv()
  .fromFile('./data.csv')
  .then((jsonArray) => {
    console.log(jsonArray);
  });
```

### jtcsv
```javascript
import { csvToJson, readCsvAsJson } from 'jtcsv';

// Parse CSV string
const jsonArray = csvToJson(csvString);

// Parse file
const jsonArray = await readCsvAsJson('./data.csv');
```

## API Mapping

### Basic CSV Parsing

#### From String

**csvtojson:**
```javascript
const csv = require('csvtojson');

csv()
  .fromString(csvString)
  .then((jsonArray) => {
    // Process data
  });
```

**jtcsv:**
```javascript
import { csvToJson } from 'jtcsv';

// Promise-based
const jsonArray = await csvToJson(csvString);

// Or synchronous
const jsonArray = csvToJson(csvString, { sync: true });
```

#### From File

**csvtojson:**
```javascript
csv()
  .fromFile('./data.csv')
  .then((jsonArray) => {
    // Process data
  });
```

**jtcsv:**
```javascript
import { readCsvAsJson, readCsvAsJsonSync } from 'jtcsv';

// Async
const jsonArray = await readCsvAsJson('./data.csv');

// Sync
const jsonArray = readCsvAsJsonSync('./data.csv');
```

#### With Headers

**csvtojson:**
```javascript
csv({ output: "json" })
  .fromString(csvString)
  .then((jsonArray) => {
    // Uses first row as headers by default
  });
```

**jtcsv:**
```javascript
csvToJson(csvString, { hasHeaders: true }); // default
```

#### Without Headers

**csvtojson:**
```javascript
csv({ noheader: true })
  .fromString(csvString)
  .then((jsonArray) => {
    // Returns array of arrays
  });
```

**jtcsv:**
```javascript
csvToJson(csvString, { hasHeaders: false });
// Returns array of arrays
```

### Streaming

#### Basic Streaming

**csvtojson:**
```javascript
const csv = require('csvtojson');
const fs = require('fs');

csv()
  .fromStream(fs.createReadStream('./large.csv'))
  .subscribe((jsonObj) => {
    console.log(jsonObj);
  }, (error) => {
    console.error(error);
  }, () => {
    console.log('Completed');
  });
```

**jtcsv:**
```javascript
import { createCsvToJsonStream } from 'jtcsv';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

const csvStream = createCsvToJsonStream();
const readable = createReadStream('./large.csv');

// Using pipeline
await pipeline(
  readable,
  csvStream,
  async function* (source) {
    for await (const chunk of source) {
      console.log(chunk);
      yield chunk;
    }
  }
);

// Or with event listeners
csvStream.on('data', (row) => console.log(row));
csvStream.on('end', () => console.log('Completed'));
```

#### Streaming with Transform

**csvtojson:**
```javascript
csv()
  .fromStream(inputStream)
  .subscribe((jsonObj) => {
    const transformed = transform(jsonObj);
    processTransformed(transformed);
  });
```

**jtcsv:**
```javascript
import { Transform } from 'stream';

const transformer = new Transform({
  objectMode: true,
  transform(row, encoding, callback) {
    const transformed = transform(row);
    callback(null, transformed);
  }
});

await pipeline(
  inputStream,
  createCsvToJsonStream(),
  transformer,
  outputStream
);
```

### Column Mapping

#### Rename Columns

**csvtojson:**
```javascript
csv({
  colParser: {
    "oldName": "newName"
  }
})
.fromString(csvString)
.then((jsonArray) => {
  // Columns renamed
});
```

**jtcsv:**
```javascript
csvToJson(csvString, {
  renameMap: {
    oldName: 'newName'
  }
});
```

#### Select Specific Columns

**csvtojson:**
```javascript
csv({
  includeColumns: /(name|email|age)/
})
.fromString(csvString)
.then((jsonArray) => {
  // Only selected columns
});
```

**jtcsv:**
```javascript
csvToJson(csvString, {
  filter: (header) => ['name', 'email', 'age'].includes(header)
});
```

#### Ignore Columns

**csvtojson:**
```javascript
csv({
  ignoreColumns: /(id|timestamp)/
})
.fromString(csvString)
.then((jsonArray) => {
  // Columns ignored
});
```

**jtcsv:**
```javascript
csvToJson(csvString, {
  filter: (header) => !['id', 'timestamp'].includes(header)
});
```

### Data Transformation

#### Type Conversion

**csvtojson:**
```javascript
csv({
  colParser: {
    "age": "number",
    "active": "boolean",
    "salary": {
      "cellParser": "number",
      "defaultValue": 0
    }
  }
})
.fromString(csvString)
.then((jsonArray) => {
  // Types converted
});
```

**jtcsv:**
```javascript
csvToJson(csvString, {
  parseNumbers: true,
  parseBooleans: true,
  // Custom parser
  transform: (row) => ({
    ...row,
    age: Number(row.age),
    active: row.active === 'true',
    salary: row.salary ? Number(row.salary) : 0
  })
});
```

#### Default Values

**csvtojson:**
```javascript
csv({
  colParser: {
    "status": {
      "cellParser": "string",
      "defaultValue": "unknown"
    }
  }
})
.fromString(csvString);
```

**jtcsv:**
```javascript
csvToJson(csvString, {
  transform: (row) => ({
    ...row,
    status: row.status || 'unknown'
  })
});
```

#### Custom Parsers

**csvtojson:**
```javascript
csv({
  colParser: {
    "date": (item, head, resultRow, row, colIdx) => {
      return new Date(item);
    }
  }
})
.fromString(csvString);
```

**jtcsv:**
```javascript
csvToJson(csvString, {
  transform: (row) => ({
    ...row,
    date: new Date(row.date)
  })
});
```

### Error Handling

#### Basic Error Handling

**csvtojson:**
```javascript
csv()
  .fromString(csvString)
  .then((jsonArray) => {
    // Success
  })
  .catch((error) => {
    console.error('Parsing failed:', error);
  });
```

**jtcsv:**
```javascript
import { csvToJson, ParsingError } from 'jtcsv';

try {
  const jsonArray = await csvToJson(csvString);
} catch (error) {
  if (error instanceof ParsingError) {
    console.error(`Parsing failed at line ${error.lineNumber}:`, error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

#### Row-level Error Handling

**csvtojson:**
```javascript
csv()
  .fromString(csvString)
  .subscribe((jsonObj) => {
    // Process row
  }, (error) => {
    console.error('Row error:', error);
    // Continue processing
  }, () => {
    console.log('Completed');
  });
```

**jtcsv:**
```javascript
csvToJson(csvString, {
  onError: (error, row, rowNumber) => {
    console.error(`Error at row ${rowNumber}:`, error.message);
    // Return null to skip this row
    return null;
  }
});
```

## Feature Comparison

### Delimiter Detection

**csvtojson:**
```javascript
// Manual delimiter specification
csv({ delimiter: ';' })
  .fromString(csvString);
```

**jtcsv:**
```javascript
// Auto-detection (default)
csvToJson(csvString);

// Or manual
csvToJson(csvString, { delimiter: ';' });

// Force auto-detection
csvToJson(csvString, { autoDetect: true });
```

### Quote Handling

**csvtojson:**
```javascript
csv({ quote: '"' })
  .fromString(csvString);
```

**jtcsv:**
```javascript
// RFC 4180 compliant by default
csvToJson(csvString, { rfc4180Compliant: true });
```

### Trim Whitespace

**csvtojson:**
```javascript
csv({ trim: true })
  .fromString(csvString);
```

**jtcsv:**
```javascript
csvToJson(csvString, { trim: true }); // default
```

### Max Row Limit

**csvtojson:**
```javascript
csv({ maxRowLength: 1000 })
  .fromString(csvString);
```

**jtcsv:**
```javascript
csvToJson(csvString, { maxRows: 1000 });
```

## Common Migration Patterns

### Pattern 1: Simple File Conversion

**Before (csvtojson):**
```javascript
const csv = require('csvtojson');

async function convertFile(inputPath) {
  const jsonArray = await csv().fromFile(inputPath);
  return jsonArray;
}
```

**After (jtcsv):**
```javascript
import { readCsvAsJson } from 'jtcsv';

async function convertFile(inputPath) {
  const jsonArray = await readCsvAsJson(inputPath);
  return jsonArray;
}
```

### Pattern 2: Streaming with Processing

**Before (csvtojson):**
```javascript
const csv = require('csvtojson');
const fs = require('fs');

async function processLargeFile(inputPath) {
  const results = [];
  
  return new Promise((resolve, reject) => {
    csv()
      .fromStream(fs.createReadStream(inputPath))
      .subscribe(
        (jsonObj) => {
          const processed = processRow(jsonObj);
          results.push(processed);
        },
        (error) => reject(error),
        () => resolve(results)
      );
  });
}
```

**After (jtcsv):**
```javascript
import { createCsvToJsonStream } from 'jtcsv';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

async function processLargeFile(inputPath) {
  const results = [];
  
  const csvStream = createCsvToJsonStream();
  const processor = new (require('stream').Writable)({
    objectMode: true,
    write(row, encoding, callback) {
      const processed = processRow(row);
      results.push(processed);
      callback();
    }
  });
  
  await pipeline(
    createReadStream(inputPath),
    csvStream,
    processor
  );
  
  return results;
}
```

### Pattern 3: Column Transformation

**Before (csvtojson):**
```javascript
csv({
  colParser: {
    "first_name": "string",
    "last_name": "string",
    "full_name": (item, head, resultRow) => {
      return `${resultRow.first_name} ${resultRow.last_name}`;
    },
    "age": "number",
    "registration_date": (item) => new Date(item)
  }
})
.fromFile('./users.csv')
.then((users) => {
  // Process transformed users
});
```

**After (jtcsv):**
```javascript
import { csvToJson } from 'jtcsv';

const users = await csvToJson('./users.csv', {
  transform: (row) => ({
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: `${row.first_name} ${row.last_name}`,
    age: Number(row.age),
    registration_date: new Date(row.registration_date)
  })
});
```

### Pattern 4: Error-Resilient Processing

**Before (csvtojson):**
```javascript
const results = [];
const errors = [];

csv()
  .fromStream(inputStream)
  .subscribe(
    (jsonObj) => {
      try {
        const processed = validateAndProcess(jsonObj);
        results.push(processed);
      } catch (error) {
        errors.push({ row: jsonObj, error: error.message });
      }
    },
    (streamError) => {
      console.error('Stream error:', streamError);
    },
    () => {
      console.log(`Processed ${results.length} rows, ${errors.length} errors`);
    }
  );
```

**After (jtcsv):**
```javascript
import { createCsvToJsonStream } from 'jtcsv';

const results = [];
const errors = [];

const csvStream = createCsvToJsonStream({
  onError: (error, row, rowNumber) => {
    errors.push({ row, rowNumber, error: error.message });
    return null; // Skip this row
  },
  validate: (row) => {
    // Custom validation
    if (!row.id || !row.email) {
      throw new Error('Missing required fields');
    }
    return true;
  }
});

await pipeline(
  inputStream,
  csvStream,
  async function* (source) {
    for await (const row of source) {
      if (row) {
        results.push(row);
      }
    }
  }
);

console.log(`Processed ${results.length} rows, ${errors.length} errors`);
```

## Performance Comparison

### Benchmark Results

Based on internal testing with 100,000 rows:

| Operation | csvtojson | jtcsv | Improvement |
|-----------|-----------|-------|-------------|
| CSV → JSON (sync) | 420ms | 320ms | 24% faster |
| CSV → JSON (stream) | 380ms | 290ms | 24% faster |
| Memory Usage | 85MB | 65MB | 24% less |
| JSON → CSV | N/A | 280ms | N/A |

### Memory Efficiency

**csvtojson:**
- Loads entire CSV into memory for non-streaming operations
- Streaming uses backpressure but still buffers chunks

**jtcsv:**
- True streaming with configurable chunk sizes
- Lower memory footprint for large files
- Automatic backpressure handling

## Breaking Changes to Watch

### 1. API Structure

**csvtojson** uses a fluent chainable API:
```javascript
csv().fromString(csvString).then(...)
```

**jtcsv** uses direct function calls:
```javascript
csvToJson(csvString).then(...)
```

### 2. Return Values

**csvtojson** always returns promises:
```javascript
const promise = csv().fromString(csvString);
```

**jtcsv** can be synchronous or asynchronous:
```javascript
// Async (default)
const promise = csvToJson(csvString);

// Sync
const data = csvToJson(csvString, { sync: true });
```

### 3. Error Handling

**csvtojson** uses promise rejection and subscription errors:
```javascript
csv().fromString(csvString)
  .then(...)
  .catch(...);
```

**jtcsv** uses thrown exceptions with specific error types:
```javascript
try {
  csvToJson(csvString);
} catch (error) {
  if (error instanceof ParsingError) { ... }
}
```

### 4. Column Parser Configuration

**csvtojson** uses `colParser` object with string or function values:
```javascript
colParser: {
  "age": "number",
  "date": (item) => new Date(item)
}
```

**jtcsv** uses `transform` function for complex transformations:
```javascript
transform: (row) => ({
  age: Number(row.age),
  date: new Date(row.date)
})
```

### 5. Streaming Model

**csvtojson** uses RxJS-like subscription:
```javascript
.subscribe(onNext, onError, onComplete)
```

**jtcsv** uses Node.js streams:
```javascript
stream.on('data', callback)
stream.on('end', callback)
// or async iteration
for await (const row of stream) { ... }
```

## Migration Checklist

1. **Replace installation:**
   ```bash
