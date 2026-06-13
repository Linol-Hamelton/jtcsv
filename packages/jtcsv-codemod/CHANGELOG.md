# jtcsv-codemod

## 0.2.0 (2026-06-13)

### Added

- csvtojson-to-jtcsv transform — rewrites `csvtojson` default imports / require calls and their `.fromString` / `.fromFile` / `.fromStream(...).subscribe(...)` chains into `csvToJson` / `readCsvAsJson` / `createCsvToJsonStream` calls. Option renames covered: `noheader` → `hasHeaders` (inverted), `delimiter`, `checkType` → `parseNumbers` + `parseBooleans`, `trim`. Unmappable options (`includeColumns`, `output`, `colParser`) and the `.on('json'/'end_parsed')` / `preFileLine` hooks are surfaced as inline TODO comments instead of being silently dropped.
- CLI: new positional argument `csvtojson` (alongside the existing `papaparse`).

### Notes

- No new runtime dependencies. The transform reads/writes source text; you never need to install `csvtojson` to run the migration.

## 0.1.1

### Patch Changes

- Initial public release. jscodeshift transform that rewrites
  `papaparse` imports and call sites to their `jtcsv` equivalents
  (`csvToJson` / `jsonToCsv`), renames Papa-specific options
  (`header` → `hasHeaders`, `dynamicTyping` → `parseNumbers`), and
  strips options that have no jtcsv counterpart with a
  `// TODO(jtcsv-codemod): …` comment so you can review the dropped
  intent.

  Run via:

  ```bash
  npx jtcsv-codemod papaparse "src/**/*.{js,ts,tsx}"
  ```

  Renamed from the originally proposed `@jtcsv/codemod` because the
  `@jtcsv` npm scope is currently unavailable to this project; the
  unscoped name is the lasting one.
