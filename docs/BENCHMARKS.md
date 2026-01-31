# Public Benchmarks
Current version: 3.1.0


This page summarizes how JTCSV benchmarks are generated and where to find artifacts.

## CI artifacts

Benchmark runs are published by the CI workflow in `.github/workflows/benchmark.yml`.
Each run uploads a `benchmark-results.json` artifact per Node version.

## Local run

```bash
npm run benchmark
```

Use `node benchmark.js --ci --output benchmark-results.json` to generate a JSON report
compatible with the CI artifacts.

## Competitor comparisons

When comparing with other libraries, record:
- Dataset shape and size
- Node.js version
- CPU/RAM
- Throughput (rows/sec) and latency

Planned comparison targets:
- `papaparse`
- `csv-parse`
- `fast-csv`

Add results to this document as they are collected.
