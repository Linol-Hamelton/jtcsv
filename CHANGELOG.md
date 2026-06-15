# Changelog

## 3.3.0-beta.0 (unreleased)

This beta freezes the public API surface for 3.3. Subsequent betas (.1, .2, …)
and the eventual stable 3.3.0 should ship only fixes and additional tests —
no behavior or signature changes.

### Added

- **VitePress documentation site** — full scaffold under `docs/` with the
  ~60 lifted MD pages (W6 + W7 + W11), MiniSearch full-text search with a
  custom tokenize + AND-combine pipeline, and deploy wiring.
- **Subpath API reference pages** — four new ref pages under `/api/*`:
  `jtcsv/csv`, `jtcsv/json`, `jtcsv/streams`, `jtcsv/errors`.
- **CI smoke set** — 15 curated examples driven by `scripts/run-examples.js`,
  wired into CI so every example stays runnable.
- **Coverage badge generator** — `scripts/coverage-badge.js` consumes Jest
  `json-summary` and emits `coverage/badge.json` + a shields.io URL.
- **STRIDE threat model** — `docs/THREAT_MODEL.md` with two architecture
  decision records:
  - ADR-001: the transform-loader `vm.Script` is NOT a security sandbox —
    treat user-supplied transform code as trusted input.
  - ADR-002: the web-server module is dev-only — do not expose to the public
    internet.
- **+94 net new tests** across encoding/BOM/UTF-16 round-trips, schema/zod
  adapters, and fuzz-seed reproducibility.
- **csvtojson migration codemod** — `jtcsv-codemod` 0.2.0 (staged, not yet
  published) extends the papaparse codemod to cover csvtojson call sites.
- **Excel adapter rename + republish** — `@jtcsv/excel` → `jtcsv-excel` 2.1.0
  (staged, not yet published), now unscoped to match the main package.
- **Ecosystem docs** — `docs/ECOSYSTEM.md` (public) plus the internal
  `docs/ECOSYSTEM_RENAMES.md` rename-plan.
- **Fuzz replay tool** — `scripts/fuzz-replay.js` deterministically replays a
  saved counterexample for triage.
- Brand visuals (Phase 5 W15): docs/public/{logo,logo-wordmark,favicon,og-image,brand-mark}.svg + docs/BRAND_KIT.md.
- VitePress head[] block with og:* and twitter:* meta + favicon link + themeConfig.logo wired (W15).
- README hero now ships with the wordmark image.
- Marketing launch kit (Phase 6 W16): 3 dev.to articles, 1 HN post, 3 Reddit variants, 1 long-form comparison + LAUNCH_CHECKLIST.md run-book. Operator-driven publish; drafts honor the POSITIONING + BRAND_KIT locked voice.

### Changed

- **npm description** rewritten in the numbers-first POSITIONING voice.
- **README hero** standardized on the canonical taglines —
  "~18 KB gz core" and "Zero runtime deps in core".
- **Web-server hardened** (W6) — CORS allowlist, 10 MB body cap, OPTIONS
  preflight handling.
- **Fuzz tests** (W11) honor the `JTCSV_FUZZ_RUNS` and `JTCSV_FUZZ_VERBOSE`
  environment variables for CI tuning.

### Fixed

- **verify-release.js** (W12) — CHANGELOG regex no longer false-matches a
  stable `3.3.0` header when checking for a `3.3.0-beta.N` entry.
- **Excel package** (W9) — removed broken parent-traversing `require()`
  statements that prevented the rename from installing cleanly.

### Deprecated

- `csvToJsonFile` / `csvToJsonFileSync` aliases — removal scheduled for 5.0.
- `csvToJsonStream` / `csvFileToJsonStream` aliases — removal scheduled for 5.0.

### Notes

- The new surface is API-frozen for this beta. The path from beta → stable is
  intentionally narrow: only **Fixed** entries and additional **Tests** are
  expected; no new features, no signature changes.

## 3.2.3

### Patch Changes

- ## jtcsv 3.2.3 — actionable errors + browser test coverage

  Every `ParsingError` thrown by the parser now carries the offending cell
  value (when known) and a `Hint:` string pointing at the most likely fix.
  The error class gains two fields — `value: string | null` and
  `hint: string | undefined` — surfaced both as message lines and as
  own-enumerable properties for structured logging.

  What changes for users

  Before:

  ```
  ParsingError: Field count mismatch at line 5
  Context: Row: "id,name"
  Expected: 3 fields
  Actual: 2 fields
  ```

  After:

  ```
  ParsingError: Field count mismatch at line 5
  Context: Row: "id,name"
  Expected: 3 fields
  Actual: 2 fields
  Hint: try `repairRowShifts: true` to auto-fill missing trailing cells,
  or quote any cell value that contains the delimiter
  ```

  The factory methods got the corresponding hints:

  - `ParsingError.fieldCountMismatch(...)` — different hints for too-few
    vs too-many fields (`repairRowShifts: true` vs unquoted-delimiter
    check).
  - `ParsingError.unclosedQuotes(...)` — names both common causes
    (missing closing `"`, unescaped literal `"`).
  - `ParsingError.invalidDelimiter(...)` — directs to single-char
    delimiters or `autoDetect: true`.
  - New: `ParsingError.cellValue(message, value, line, column, hint)` —
    generic actionable error for any cell-specific parser failure.
  - New: `ParsingError.fastPathBailout(reason, content)` — direct
    hint to `useFastPath: false`.

  The previously-generic throw in `csv-to-json.ts:604` ("Fast-path
  parser failed to split headers") now uses `ParsingError.fastPathBailout`
  and includes the header content plus the `useFastPath: false` hint.

  Test coverage

  - New `__tests__/actionable-errors.test.ts` (+17 tests) locks the
    message format and the hints per factory method.
  - New `__tests__/browser-jsdom.test.ts` (+31 tests) covers the
    browser path through jsdom: `csvToJson`, `jsonToCsv`,
    `autoDetectDelimiter`, `downloadAsCsv`, `parseCsvFile`,
    `parseCsvFileStream`, `csvToJsonStream`, `jsonToCsvStream`,
    `csvToJsonIterator`, and the browser error classes. Two known
    browser-parser limitations are documented inline (hasHeaders:false
    treats first row as headers; parseNumbers:false still coerces) —
    Phase 3 follow-up.

  README hero now carries a "TypeScript strict: clean" badge linking
  to `.strict-baseline.json` — strict-mode error count locked at 0.

  No breaking changes. Drop-in upgrade from 3.2.2.

## 3.2.2

### Patch Changes

- ## jtcsv 3.2.2 — hardening pass

  Edge-case lock-in, ReDoS audit, and supply-chain checks land as a single
  patch. No public API changes — every existing call site keeps the same
  behaviour. This release is the Phase 2 Week 4 verification cut for the
  ratchet-down roadmap.

  What's new under the hood

  - **Edge-case test suite** (`__tests__/edge-cases-hardening.test.ts`,
    +23 tests): documents the parser's behaviour on UTF-8 / UTF-16 LE /
    UTF-16 BE BOM variants, CRLF inside quoted fields, empty/whitespace/
    BOM-only inputs, and the `repairRowShifts: false` opt-out. Future
    refactors that change any of these behaviours now fail loudly.
  - **ReDoS audit gate** (`scripts/audit-regex.js`, wired into
    `prepublishOnly`): 34 regex literals in the hot parser files all
    pass `safe-regex2`. One dynamic `new RegExp(<var>)` call site
    (json-to-csv.ts:692) is documented as accepting only a 5-char
    Unicode bidi whitelist — no metacharacters, no user input.
  - **Strict-TS baseline at 0**: the regression gate now requires every
    PR to keep the strict-mode error count at zero across hot files.
    (Phase 1 Week 3 landed the cleanup; 3.2.2 is the first release
    shipped with the ratchet locked at zero.)
  - **Workflow supply chain**: all third-party GitHub Actions are pinned
    to commit SHAs with inline version comments. The legacy
    `snyk/actions/node@master` job (sliding-tag anti-pattern) was
    removed; CodeQL provides the SAST coverage. `continue-on-error` is
    removed from the npm-audit step so moderate+ CVEs fail the build.
  - **Dependabot** is now active for `npm` and `github-actions`
    ecosystems, weekly batches grouped by toolchain (babel / jest /
    rollup / typescript / eslint) to keep PR noise down.

  Verification

  This release tests the GitHub-Actions release pipeline end-to-end:
  `release.yml` opens a "Version Packages" PR; merging it triggers
  `changeset publish` with `--provenance` (Sigstore signature). Consumers
  can verify with `npm audit signatures jtcsv@3.2.2`.

  No breaking changes. Drop-in upgrade from 3.2.1.

## 3.2.1

### Patch Changes

- f4f75a6: ## jtcsv 3.2.1 — clean dist before build (tarball 4.1 MB → 2.4 MB)

  3.2.0 shipped a 4.1 MB tarball / 125 files because rollup's
  hash-named shared chunks (`dist/_shared/csv-to-json-XXXXXXXX.cjs.js`
  etc.) accumulated across rebuilds without removal. Each `npm run build`
  left old hash variants behind; the publish picked them all up.

  Fix

  - New `npm run clean` script (`rimraf dist`), wired into `build` and
    `build:prod` as the first step. Every build now starts from an empty
    `dist/` so only the latest hashed chunks ship.
  - `rimraf` added as a dev dependency for cross-platform clean (cmd
    doesn't have `rm -rf`).

  Result: `npm pack --dry-run`
  package size: 637.4 kB → 403.5 kB (−37%)
  unpacked: 4.1 MB → 2.4 MB (−41%)
  total files: 125 → 96 (−23%)

## 3.2.0

### Minor Changes

- 1ef708c: ## jtcsv 3.2.0 — bundle diet, modernization, ecosystem
  ### Highlights
  - **Tarball gzip −49 %** (703 → 359 kB), unpacked −44 % (3.9 MB → 2.2 MB),
    88 vs 192 files. The unpacked TS sources, `examples/`, and source maps
    no longer ship; rollup is the sole producer of `.js` in `dist/`.
  - **Subpath imports** (`jtcsv/csv`, `jtcsv/json`, `jtcsv/streams`, `jtcsv/ndjson`,
    `jtcsv/tsv`, `jtcsv/errors`, plus the existing `jtcsv/browser`, `/plugins`, `/schema`,
    `/cli`). `import { csvToJson } from 'jtcsv/csv'` costs **~18 KB gzipped**.
  - **ES2022 target** + `engines.node: >=18.17.0`. Drops the `@babel/preset-env`
    - 4 babel plugins from devDependencies. Rollup pipeline no longer transpiles.
  - **Worker threads** wired into `csvToJsonAsync` / `jsonToCsvAsync` /
    `streamCsvToJsonAsync` / `streamJsonToCsvAsync` via the new `useWorkers`
    - `workerCount` options. Thresholded (1 MB CSV / 20 K rows) so small
      inputs stay sync. Closes 7 in-tree TODOs.
  - **Runtime deprecation warnings** for `csvToJsonFile`, `csvToJsonFileSync`,
    `csvToJsonStream`, `csvFileToJsonStream` — each emits a one-time
    `DeprecationWarning` (code `JTCSV_DEP_*`) on first call. Removal target: 5.0.
  - **Strict-TS regression gate** at 65 errors (was untracked / 188 unbounded).
    Any future PR that bumps strict-mode errors fails publish.
  - **CI bench badge**: head-to-head vs papaparse / csv-parse / fast-csv on
    every push to main, published to GitHub Pages, with a 25 % regression
    alert. Local results: `jtcsv (fastPath)` is **1.8–4.2× faster** than the
    competition on 100 K and 1 M rows.
  - **`@jtcsv/codemod`**: new sibling package with a jscodeshift transform
    that auto-rewrites `papaparse` imports + calls to jtcsv equivalents.
    Run `npx @jtcsv/codemod papaparse "src/**/*.{js,ts,tsx}"`.
  - **OpenSSF Scorecard** workflow + badge.
  - **Property-based fuzz tests** (fast-check) cover newline-in-cell and
    quote-in-cell round-trips with 80–100 random inputs each.
  ### @jtcsv/\* sub-packages
  All ten sub-packages now ship with:
  - `peerDependencies.jtcsv: "^3.1.0 || ^4.0.0"` (was a mix of `^2.1.0`, `^2.1.3`, `^3.1.0` — none compatible with 3.x simultaneously).
  - `publishConfig: { access: public, provenance: true }` — every release is signed via Sigstore.
  - Updated framework peer ranges: Express ^4 || ^5, Fastify ^4 || ^5, Next.js ^13 || ^14 || ^15, React ^18 || ^19, NestJS ^9 || ^10 || ^11.
  - 7 client-only adapters (vue, angular, svelte, sveltekit, nuxt, remix, trpc) demoted to `examples/frameworks/` since their wrapper value-add is thin.
  ### Migration
  Most users need no changes; the deprecated function names still work and
  just print a one-time warning. To clean up:
  ```bash
  npx @jtcsv/codemod papaparse "src/**/*.{js,ts,tsx}"
  ```
  Or replace the names by hand:
  | Deprecated | Use instead |
  | --------------------- | --------------------------- |
  | `csvToJsonFile` | `readCsvAsJson` |
  | `csvToJsonFileSync` | `readCsvAsJsonSync` |
  | `csvToJsonStream` | `createCsvToJsonStream` |
  | `csvFileToJsonStream` | `createCsvFileToJsonStream` |
  Node 12, 14, 16 are no longer supported. Bump to Node 18.17 or newer.
  ### Honest disclaimers
  - Strict TypeScript still has **65 errors** in the 9 hot files outside the
    excluded experimental modules. They're locked behind the regression
    gate; per-file cleanup is ongoing.
  - Quote-in-cell + delimiter-in-cell combinations still trip the parser's
    state machine on some shrunk fast-check counterexamples; tracked
    separately. Default `normalizeQuotes: true` is intentionally lossy
    (collapses `""` → `"`); pass `normalizeQuotes: false` for strict
    RFC 4180 round-trips.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.9] - 2026-01-29

### Fixed

- **CSS compatibility**: Added standard `background-clip: text` and `color: transparent` for cross‑browser gradient text in `web-worker-usage.html`
- **Web Worker error handling**: Fixed `Cannot read properties of undefined` in `handleWorkerResult` when worker returns array directly
- **Linting errors**:
  - Renamed unused variable `arrayHandling` to `_arrayHandling` in `json-to-csv.js`
  - Removed unreachable code and fixed undefined `csvParser` variable in `stream-csv-to-json.js`
- **Duplicate function**: Renamed duplicate `createErrorMessage` to `createDetailedErrorMessage` in `errors.js`

### Added

- **Server availability check**: Added HEAD request to `csv-parser.worker.js` in `web-worker-usage.html` with UI feedback
- **Inline Web Worker fallback**: If external worker fails to load, creates inline worker via Blob URL
- **Strategy coverage report**: Created `jtcsv-strategy-coverage-report.md` documenting implementation of all recommendations

### Changed

- **Merged HTML files**: Combined `web-worker-usage.html` and `web-worker-usage-fixed.html` into a single improved example
- **Dependency audit**: Removed unused devDependencies (`@babel/preset-env`, `@size-limit/preset-small-lib`, `blessed`, `blessed-contrib`, `jest-environment-jsdom`)

## [2.2.8] - 2026-01-27

### Fixed

- **Cross-platform security tests**: Fixed security-fuzzing tests for Linux compatibility
  - `file://` URLs and UNC paths are now platform-aware in tests
  - UNC path validation moved before `path.resolve()` to prevent network timeouts
- Added UNC path blocking to `json-save.js` for consistency

### Changed

- Security tests now properly account for platform differences:
  - `file:` is a valid directory name on Linux (not a URL scheme)
  - Backslashes are valid filename characters on Linux

## [2.2.7] - 2026-01-27

### Changed

- **CI/CD Optimization**: Restructured GitHub Actions workflow
  - Separated tests and coverage checks into distinct jobs
  - Tests run on Node.js 18.x, 20.x, 22.x without coverage overhead
  - Coverage check runs only on Node 20.x LTS after tests pass
  - Security audit moved to separate parallel job
  - Benchmark runs after tests with artifact upload
  - Updated codecov-action to v4, upload-artifact to v4

### Fixed

- Excluded unused `node-optimizations.js` from coverage collection
- Coverage now reports 99.74% (was artificially lowered by unused file)

## [2.2.6] - 2026-01-26

### Fixed

- CI workflow optimizations
- Removed Node 24.x from matrix (not yet stable)

## [2.2.5] - 2026-01-26

### Fixed

- Benchmark threshold adjustments for CI stability

## [2.1.7] - 2026-01-26

### 🎉 Major Feature Release - Full CLI Functionality & Web UI

This release completes all planned features from the improvement roadmap, bringing the project to 99% production readiness with a comprehensive set of tools for CSV/JSON conversion.

### Added

#### New Commands (4)

- **NDJSON Support**: New commands for Newline Delimited JSON format

  - `ndjson-to-csv` - Convert NDJSON to CSV format
  - `csv-to-ndjson` - Convert CSV to NDJSON format
  - `ndjson-to-json` - Convert NDJSON to JSON array
  - `json-to-ndjson` - Convert JSON array to NDJSON

- **Data Manipulation**

  - `unwrap` / `flatten` - Flatten nested JSON structures with configurable depth
  - Support for `--flatten-depth` and `--flatten-prefix` options

- **Web Interface**
  - `web` command - Launch built-in web server with REST API and beautiful HTML UI
  - Zero external dependencies (uses built-in Node.js `http` module)
  - REST API endpoints: `/api/json-to-csv`, `/api/csv-to-json`, `/api/validate`, `/api/ndjson-to-csv`, `/api/csv-to-ndjson`
  - Real-time conversion statistics (records, bytes, processing time)
  - CORS support for external integrations
  - Configurable host and port (`--host`, `--port`)

#### New Infrastructure

- **Transform System** (`src/utils/transform-loader.js`, 205 lines)

  - Load custom transform functions from JavaScript files
  - Security validation (directory traversal prevention, file type checking)
  - Support for multiple export formats (`module.exports`, `default`, `transform`)
  - Integration with TransformHooks system
  - Error handling with row-level context

- **Schema Validation** (`src/utils/schema-validator.js`, 594 lines)

  - Full JSON Schema validation support
  - Fallback simple validator (works without external dependencies)
  - Comprehensive type checking (string, number, integer, float, boolean, date, array, object)
  - Constraint validation (min/max, pattern, enum, required, minLength, maxLength)
  - Row-level error reporting with field context

- **Advanced Transform Hooks** (`src/core/transform-hooks.js`, 350 lines)

  - `TransformHooks` class with lifecycle methods
  - Hook types: `beforeConvert`, `afterConvert`, `perRow`
  - 9 predefined transformation hooks:
    - `filter` - Filter data with predicate function
    - `map` - Map data transformation
    - `sort` - Sort data with custom comparator
    - `limit` - Limit number of records
    - `addMetadata` - Add metadata to records
    - `transformKeys` - Transform object keys
    - `transformValues` - Transform values with function
    - `validate` - Validate data with custom validator
    - `deduplicate` - Remove duplicate records
  - Chainable API for composing transformations
  - Performance optimized (10,526 objects/sec with 30 hooks)

- **Web Server** (`src/web-server/index.js`, 684 lines)
  - Standalone HTTP server with embedded HTML interface
  - Gradient-based modern UI design
  - Interactive conversion with live preview
  - Copy to clipboard functionality
  - Automatic example data loading
  - Complete error handling and validation

### Enhanced

#### CLI Improvements

- **Batch Processing**

  - Full implementation of `batch process` command for mixed file types
  - Parallel processing with configurable limit (default: 4 concurrent files)
  - Progress reporting with percentage and file counts
  - Support for JSON, CSV, and NDJSON files in same batch
  - Glob pattern support for flexible file matching

- **Streaming Functions**

  - All CLI parameters now properly passed to streaming functions
  - `--rename` parameter works consistently across all stream commands
  - Enhanced error messages with detailed context
  - Better memory management for large files

- **Parameter Support**
  - `--transform=FILE` - Apply custom JavaScript transform function (fully integrated)
  - `--schema=JSON|FILE` - Validate data against JSON schema (fully integrated)
  - `--parse-numbers` - Parse numeric strings to numbers (all commands)
  - `--parse-booleans` - Parse boolean strings to booleans (all commands)
  - `--rename=JSON` - Rename columns with mapping object (all commands)
  - `--flatten-depth=N` - Control unwrap depth (default: 10)
  - `--flatten-prefix=STR` - Separator for flattened keys (default: '\_')
  - `--port=N` - Web server port (default: 3000)
  - `--host=STR` - Web server host (default: localhost)

#### TUI Integration

- Full integration with `@jtcsv/tui` package
- `tui` command launches Terminal User Interface
- Stream processing support in TUI
- Progress bars for batch operations

### Changed

- Improved help text with complete command list
- Enhanced error messages with actionable suggestions
- Better CLI argument parsing with position-independent options
- Consolidated batch processing logic
- Optimized streaming performance with proper parameter forwarding

### Fixed

- Fixed `--transform` parameter not being applied in conversions
- Fixed `--schema` parameter not performing validation
- Fixed `--rename` being ignored in streaming functions
- Fixed batch commands failing due to missing glob dependency
- Fixed parameter passing inconsistencies between regular and streaming modes
- Fixed unwrap/flatten commands being missing from CLI

### Performance

- TransformHooks: 10,526 objects/sec with 30 hooks
- Fast-path engine: 625,000 rows/sec for simple CSV
- DelimiterCache: 3.67x speedup with 99.92% hit rate
- NDJSON: 80,000 objects/sec parsing speed
- TSV: 59,524 objects/sec throughput

### Testing

- ✅ All 555 tests passing
- Comprehensive coverage for new features
- Integration tests for CLI commands
- Security tests for transform and schema validation
- Performance benchmarks included

### Security

- Zero runtime dependencies in core package (unchanged)
- Transform loader includes security validation
- Path traversal prevention in file operations
- Safe sandbox execution for custom transforms
- **Note**: 3 moderate vulnerabilities in dev dependencies (blessed-contrib) - non-critical for production use

### Documentation

- Updated help text with all new commands
- Added examples for NDJSON operations
- Documented transform and schema validation usage
- Web UI includes built-in documentation
- Improvement plan documents updated with completion status

### Breaking Changes

None - All changes are backward compatible

## [2.1.6] - 2026-01-26

### Fixed

- Critical dependency issue: Added missing `glob` dependency for batch processing
- Streaming functions now properly support `--rename` parameter
- Fixed logical error in `streamCsvToJson` function (variable declaration order)
- Removed duplicate code in `convertJsonToCsv` function

### Added

- Complete implementation of `batch process` command for mixed file types
- Full integration of `--transform` parameter across all conversion functions
- Full integration of `--schema` parameter for JSON schema validation
- New `applyTransform` function for loading and applying transform modules
- Support for `renameMap` in all streaming functions (`streamJsonToCsv`, `streamCsvToJson`)
- Enhanced CLI help with detailed examples for new parameters

### Changed

- Updated `glob` dependency to latest version (10.5.0)
- Removed "EXPERIMENTAL" label from `--transform` and `--schema` parameters
- Improved error messages for JSON parsing and transform loading
- Enhanced batch processing with better progress reporting

### Security

- Maintained zero runtime dependencies in core package
- All security features preserved (CSV injection protection, path traversal prevention)

## [2.1.5] - 2026-01-25

### Fixed

- Critical syntax error in convertCsvToJson function (unclosed brace at line 307)
- Improved error handling throughout the CLI application

### Added

- Transform support via ransform-loader module for custom data transformations
- Schema validation support via schema-validator module (EXPERIMENTAL)
- New save-csv command to save data as CSV file
- New utility modules in src/utils/ directory
- Enhanced CLI documentation and usage examples
- Support for experimental --transform and --schema options

### Changed

- Updated demo/package.json dependencies
- Improved CLI help text with better formatting
- Removed outdated test files ( est-_.js, est-_.html)
- Enhanced data transformation pipeline in conversion functions

### Security

- Maintained zero runtime dependencies in core package
- Added input validation and sanitization improvements

## [2.1.4] - 2026-01-24

### Added

- Browser streaming CSV iterator (`csvToJsonIterator`, `parseCsvFileStream`) and lazy worker helpers.
- Jest setup polyfills for `TextDecoder`/`TransformStream` in jsdom.

### Changed

- NDJSON browser stream handling now falls back to `util`/`stream/web` when globals are missing.
- Browser docs updated with streaming/lazy API examples.

### Fixed

- Browser test failures caused by missing Web APIs in jsdom.

## [2.1.3] - 2026-01-23

### Added

- New framework helpers: NestJS, Remix, Nuxt, SvelteKit, Hono, and tRPC integrations.

### Changed

- Bumped core version and aligned peer dependencies for new plugins.

## [2.1.0] - 2026-01-23

### Added

- Fast-path options for CSV parsing: `useFastPath` and `fastPathMode` (`objects`, `compact`, `stream`).
- Scaling benchmarks (1K/10K/100K) and public performance docs (`BENCHMARK-RESULTS.md`, `docs/PERFORMANCE.md`).
- CLI support for `--no-fast-path` and UI exposure in TUI/GUI for fast-path toggles and mode.

### Changed

- `csvToJson()` can return an async iterator when `fastPathMode: 'stream'` is used.
- Benchmark and documentation sections updated with latest performance results.

### Fixed

- Lint cleanup in parser utilities and option parsing paths.

### Security

- Core package keeps zero runtime dependencies; TUI and Excel move to optional add-ons to limit supply-chain exposure.

## [0.1.0-beta.1] - 2024-01-20

### Security Release - Critical Bug Fixes

This release addresses multiple critical security vulnerabilities and adds comprehensive testing.

#### Security Fixes

- **CSV Injection Protection**: Added automatic escaping of Excel formulas (=, +, -, @) to prevent formula injection attacks
- **Path Traversal Protection**: Enhanced `validateFilePath()` function to prevent directory traversal attacks in `saveAsCsv()`
- **Input Validation**: Added comprehensive input validation with proper error messages
- **Circular Reference Handling**: Fixed infinite recursion in `deepUnwrap()` when processing circular references
- **Memory Protection**: Added maximum record limit (1,000,000) to prevent OOM attacks

#### Critical Bug Fixes

1. **Circular References**: `deepUnwrap()` now safely handles circular object references without infinite recursion
2. **Data Loss**: Fixed `preprocessData()` to properly handle nested objects and arrays
3. **CSV Escaping**: Improved escaping of special characters and formulas
4. **Error Handling**: Enhanced error messages and validation
5. **Edge Cases**: Fixed various edge cases in CSV generation

#### Added

- **Comprehensive Test Suite**: 44 tests with >90% code coverage
- **Security Tests**: Tests for CSV injection, path traversal, and input validation
- **ESLint Configuration**: Code quality enforcement
- **Jest Configuration**: Test runner with coverage thresholds
- **Documentation**:
  - Updated README.md with security information
  - TESTING.md with test instructions
  - Example script (example.js)
  - Improved API documentation
- **Development Tools**:
  - `npm test` - Run all tests
  - `npm run test:coverage` - Tests with coverage report
  - `npm run test:watch` - Watch mode for development
  - `npm run lint` - Code linting
  - `npm run security-check` - Security audit

#### Changed

- **Version**: Bumped to 0.1.0-beta.1 for security release
- **Package.json**: Updated scripts and dependencies
- **Code Structure**: Improved modularity and documentation
- **Error Messages**: More descriptive error messages

#### Technical Details

- Test coverage: >90% statements, >90% branches, >87% functions
- Security: All critical CVEs addressed
- Performance: Optimized for large datasets
- Compatibility: Node.js >= 12.0.0

## [1.2.0] - 2024-01-20

### Added

- **Auto-detect delimiter**: CSV delimiter is now auto-detected by default (detects ; , \t |)
- **Unlimited processing**: Removed default 1,000,000 record limit
- **New function**: `autoDetectDelimiter()` utility function
- **New options**: `autoDetect` (default: true) and `candidates` for delimiter detection

### Changed

- **Breaking**: `csvToJson()` and `jsonToCsv()` no longer have default record limits
- **Breaking**: `delimiter` parameter is now optional (auto-detected by default)
- **Improved**: Warning for >1M records suggests streaming for large files
- **Enhanced**: Better developer experience - no need to guess CSV delimiter

### Fixed

- **Critical**: Removed arbitrary 1,000,000 record limit that caused errors for large datasets
- **Competitiveness**: Now matches PapaParse's auto-detect feature

### Security

- **Maintained**: All security features from previous versions preserved
- **Enhanced**: Optional limits still available for security-conscious applications

### Performance

- **Improved**: Unlimited processing for enterprise datasets
- **Optimized**: Auto-detect algorithm is fast and efficient

### Tests

- **Added**: 8 new tests for auto-detect functionality
- **All**: 152 tests pass (was 144)

### Documentation

- **Updated**: README.md with new features and examples
- **Enhanced**: TypeScript definitions for new API
- **Improved**: Comparison table shows auto-detect advantage

## [1.0.0] - 2024-01-20

### Added

- Initial release of jtcsv module
- Core functionality: `jsonToCsv()`, `saveAsCsv()`, `preprocessData()`, `deepUnwrap()`
- Support for custom delimiters, header renaming, and column ordering
- Proper CSV escaping for special characters (;, ", \n, \r)
- UTF-8 support for international characters and Cyrillic
- Comprehensive documentation and examples
- MIT license

### Features

- Convert arrays of objects to CSV format
- Save CSV data directly to files
- Preprocess nested JSON structures
- Customizable column headers and order
- Excel compatibility
- Lightweight with no external dependencies

### Developer

- **Ruslan Fomenko** - Initial implementation and module design

[0.1.0-beta.1]: https://github.com/Linol-Hamelton/jtcsv/releases/tag/v0.1.0-beta.1
[1.0.0]: https://github.com/Linol-Hamelton/jtcsv/releases/tag/v1.0.0
[1.2.0]: https://github.com/Linol-Hamelton/jtcsv/releases/tag/v1.2.0
[2.1.0]: https://github.com/Linol-Hamelton/jtcsv/releases/tag/v2.1.0
