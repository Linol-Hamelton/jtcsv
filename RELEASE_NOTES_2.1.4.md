# JTCSV 2.1.4 Release Notes

Date: 2026-01-24

Highlights
- Browser streaming CSV iterator (`csvToJsonIterator`, `parseCsvFileStream`).
- Lazy worker helpers to reduce initial bundle cost.
- NDJSON stream fallbacks for environments missing `TextDecoder`/`TransformStream`.
- Updated benchmark results with competitor runs.

Benchmarks (10K rows/records)
- CSV -> JSON:
  - JTCSV FastPath Compact: 19.67 ms / 2.35 MB
  - JTCSV FastPath Stream: 24.54 ms / 5.84 MB
  - JTCSV: 25.40 ms / 14.38 MB
  - PapaParse: 27.42 ms / 7.01 MB
  - csv-parser: 38.78 ms / 14.86 MB
- JSON -> CSV:
  - JTCSV: 13.79 ms / 4.77 MB
  - json2csv: 15.96 ms / 12.07 MB

Notes
- Browser tests now pass under jsdom with built-in polyfills.
- See `BENCHMARK-RESULTS.md` for full details and scaling results.
