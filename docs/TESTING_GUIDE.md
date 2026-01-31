# jtcsv Testing Guide
Current version: 3.1.0


Complete guide to running tests and performance benchmarks for jtcsv.

## Table of Contents

- [Installation](#installation)
- [Basic Tests](#basic-tests)
- [Performance Tests](#performance-tests)
- [Documentation](#documentation)
- [CI/CD Integration](#cicd-integration)

## Installation

Install all dependencies including dev dependencies:

```bash
npm install
```

## Basic Tests

### Run All Tests

```bash
npm test
```

Runs all test suites with Jest.

### Test Coverage

```bash
npm run test:coverage
```

Generates code coverage report in `coverage/` directory.

### Watch Mode

```bash
npm run test:watch
```

Runs tests in watch mode for development.

### Browser Tests

```bash
npm run test:browser
```

Runs tests in jsdom browser environment.

## Performance Tests

### Benchmark Suite

```bash
npm run test:benchmark
```

**Duration:** ~60 seconds

Runs comprehensive performance benchmarks:
- CSV to JSON parsing (simple, complex, wide)
- JSON to CSV conversion (simple, nested, wide)
- NDJSON operations
- TSV operations
- Delimiter detection
- Scalability tests

**Output Example:**
```
CSV→JSON (simple): 1053 ops/sec
JSON→CSV (nested): 735 ops/sec
NDJSON parse: 1072 ops/sec
```

**Thresholds:**
- Simple CSV: >500 ops/sec
- Complex CSV: >300 ops/sec
- Wide CSV (50 cols): >100 ops/sec

### Load Tests

#### Small Load (10K rows)

```bash
npm run test:load
```

**Duration:** ~10 seconds

Tests with 10,000 rows for quick validation.

#### Medium Load (100K rows)

```bash
LOAD_TEST_SIZE=medium npm run test:load
```

**Duration:** ~30 seconds

#### Large Load (1M rows)

```bash
npm run test:load:large
```

**Duration:** ~120 seconds

Tests with 1,000,000 rows for stress testing.

#### Extra Large Load (5M rows)

```bash
LOAD_TEST_SIZE=xlarge npm run test:load
```

**Duration:** ~300 seconds (5 minutes)

Maximum stress test with 5,000,000 rows.

**Load Test Coverage:**
- In-memory processing
- Streaming operations
- Async iterators
- NDJSON processing
- Wide rows (100 columns)
- Long values (10KB per field)
- Special characters
- Concurrent operations
- Memory stability

### Security Fuzzing

```bash
npm run test:security
```

**Duration:** ~60 seconds

Tests security vulnerabilities:
- CSV injection prevention (15+ payloads)
- Path traversal attacks
- Input fuzzing (malformed inputs)
- Prototype pollution
- Resource exhaustion
- ReDoS prevention
- Memory safety
- Concurrency safety

**Tested Attack Vectors:**
- `=CMD|'calc'` - Formula injection
- `../../../etc/passwd` - Path traversal
- Null bytes, Unicode edge cases
- Deeply nested quotes
- Extremely large inputs

### Memory Profiling

```bash
npm run test:memory
```

**Duration:** ~120 seconds

**Requires:** Node.js with `--expose-gc` flag

Tests memory usage and leak detection:
- Memory footprint per operation
- Leak detection (100 iterations)
- Streaming memory efficiency
- Large object handling
- Memory pressure recovery
- Garbage collection behavior

**Output Example:**
```
CSV Parsing Memory:
┌─────────┬──────────┬────────────┬──────────────┬─────────────┐
│ rows    │ inputKB  │ outputKB   │ memoryMB     │ bytesPerRow │
├─────────┼──────────┼────────────┼──────────────┼─────────────┤
│ 1000    │ 25       │ 48         │ 2.5          │ 2621        │
│ 5000    │ 125      │ 240        │ 12.3         │ 2580        │
└─────────┴──────────┴────────────┴──────────────┴─────────────┘
```

## Documentation

### Generate API Documentation

```bash
npm run docs
```

Generates TypeDoc API documentation in `docs/api/`.

**Output:** HTML documentation with:
- Full API reference
- Type definitions
- Function signatures
- Usage examples

### Watch Mode

```bash
npm run docs:watch
```

Regenerates docs on file changes.

### Serve Documentation

```bash
npm run docs:serve
```

Generates docs and serves them at http://localhost:3000.

## Test Suites Summary

| Test Suite | Command | Duration | Purpose |
|------------|---------|----------|---------|
| Unit Tests | `npm test` | ~2s | Core functionality |
| Coverage | `npm run test:coverage` | ~3s | Code coverage |
| Benchmark | `npm run test:benchmark` | ~60s | Performance baselines |
| Load (small) | `npm run test:load` | ~10s | 10K rows stress |
| Load (large) | `npm run test:load:large` | ~120s | 1M rows stress |
| Security | `npm run test:security` | ~60s | Security vulnerabilities |
| Memory | `npm run test:memory` | ~120s | Memory profiling |

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      # Basic tests
      - run: npm install
      - run: npm test
      - run: npm run test:coverage

      # Performance tests
      - run: npm run test:benchmark
      - run: npm run test:load

      # Security tests
      - run: npm run test:security

      # Memory tests (with GC)
      - run: npm run test:memory

      # Documentation
      - run: npm run docs
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
npm test && npm run test:benchmark
```

## Interpreting Results

### Benchmark Results

**Good Performance:**
- CSV→JSON (simple): >1000 ops/sec
- JSON→CSV (simple): >600 ops/sec
- NDJSON: >1000 ops/sec

**Warning Signs:**
- Operations <50% of threshold
- High variance between runs
- Memory growth >200MB

### Load Test Results

**Success Criteria:**
- All tests pass
- Streaming memory delta <500MB
- No memory leaks (growth <50MB)
- Throughput >10,000 rows/sec

### Security Test Results

**All tests must pass.** Any failure indicates:
- Missing sanitization
- Path traversal vulnerability
- Memory safety issue
- ReDoS vulnerability

### Memory Test Results

**Good Memory Usage:**
- Memory ratio <10x input size
- No leaks (growth <50MB over 100 iterations)
- Streaming variance <30MB
- GC effectiveness >80%

## Troubleshooting

### Out of Memory

```bash
node --max-old-space-size=4096 node_modules/jest/bin/jest
```

### Slow Tests

Skip load tests in development:

```bash
npm test -- --testPathIgnorePatterns=load-tests
```

### Memory Tests Fail

Ensure GC is exposed:

```bash
node --expose-gc node_modules/jest/bin/jest __tests__/memory-profiling.test.js
```

## Advanced Usage

### Run Specific Test Suite

```bash
npm test -- __tests__/benchmark-suite.test.js
```

### Filter Tests by Name

```bash
npm test -- --testNamePattern="CSV parsing"
```

### Update Snapshots

```bash
npm test -- -u
```

### Debug Tests

```bash
node --inspect-brk node_modules/jest/bin/jest --runInBand
```

## Performance Baseline

Current performance (as of v2.2.0):

| Operation | Throughput |
|-----------|------------|
| CSV→JSON (simple) | ~1,000 ops/sec |
| CSV→JSON (complex) | ~900 ops/sec |
| JSON→CSV (simple) | ~650 ops/sec |
| NDJSON parse | ~1,000 ops/sec |
| TSV parse | ~1,000 ops/sec |
| Delimiter detect | ~55,000 ops/sec |

These are reference values. Actual performance depends on:
- Hardware (CPU, RAM)
- Node.js version
- Data complexity
- System load

## Contributing

When adding new features:

1. Add unit tests in `__tests__/`
2. Update benchmark thresholds if needed
3. Add security tests for new inputs
4. Profile memory usage
5. Update this guide

## Related Documentation

- [API Documentation](./api/index.html)
- [Migration Guide](./MIGRATION_PAPAPARSE.md)
- [FAQ](./FAQ.md)
- [Performance Guide](./PERFORMANCE.md)
