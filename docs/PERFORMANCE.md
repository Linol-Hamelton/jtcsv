# JTCSV Performance

## Benchmark Summary (Node.js 22, 10K rows/records)

CSV -> JSON (10K rows)

| Library | Time | Memory | Rank |
|---------|------|--------|------|
| JTCSV (FastPath Compact) | 16.79 ms | 4.47 MB | 1st |
| JTCSV (FastPath Stream) | 18.27 ms | 6.03 MB | 2nd |
| JTCSV | 19.76 ms | 8.96 MB | 3rd |
| PapaParse | 21.57 ms | 6.97 MB | 4th |
| csv-parser | 30.52 ms | 6.53 MB | 5th |

JSON -> CSV (10K records)

| Library | Time | Memory | Rank |
|---------|------|--------|------|
| JTCSV | 11.21 ms | 4.77 MB | 1st |
| json2csv | 12.27 ms | 12.11 MB | 2nd |

## Scaling (JTCSV only)

| Rows/Records | CSV->JSON Time (FastPath Compact) | JSON->CSV Time (JTCSV) | CSV->JSON Memory | JSON->CSV Memory |
|--------------|-----------------------------------|------------------------|------------------|------------------|
| 1,000 | 2.06 ms | 1.04 ms | 2.15 MB | 0.52 MB |
| 10,000 | 14.68 ms | 8.23 ms | 2.11 MB | 4.14 MB |
| 100,000 | 164.18 ms | 90.93 ms | 44.93 MB | 34.79 MB |

## Performance Optimizations (v2.2.9+)

JTCSV includes several performance optimizations to ensure maximum speed and minimal memory footprint:

### 1. Tree‑Shaking and Side‑Effects
- Added `"sideEffects": false` to `package.json` – enables bundlers (Webpack, Rollup, Vite) to eliminate unused code.
- Core functions are exported as ES modules for optimal tree‑shaking.

### 2. Fast Number/Boolean Parsing
- Replaced regular‑expression‑based parsing with direct character checks and `parseFloat`.
- Up to **2× faster** for numeric‑heavy CSV files.

### 3. Single‑Pass BOM Stripping
- BOM detection and removal now happen inside the main CSV parser stream, eliminating an extra Transform step.
- Reduces overhead in streaming scenarios.

### 4. Optimized Delimiter Detection
- New algorithm counts delimiter candidates in **one pass** over the first line using a `Set`.
- Handles ties correctly (returns default `;`).
- **~30% faster** than previous regex‑based detection.

### 5. Object‑Pooling (Planned)
- Future release will reuse temporary objects to reduce GC pressure in high‑throughput streaming.

### 6. Core/Full Bundle Separation (Planned)
- Lightweight `jtcsv/core` entry point with only CSV↔JSON conversion.
- Full bundle includes NDJSON, TSV, and advanced features.

## Methodology

- Main benchmark: 5 iterations, average results.
- Scale benchmark: 3 iterations, JTCSV only.
- Command: `npm run benchmark`

For full details, see `BENCHMARK-RESULTS.md`.

Last updated: 2026-01-29
