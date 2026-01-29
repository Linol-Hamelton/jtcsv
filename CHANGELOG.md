# Changelog

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
  - `--flatten-prefix=STR` - Separator for flattened keys (default: '_')
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
- Transform support via 	ransform-loader module for custom data transformations
- Schema validation support via schema-validator module (EXPERIMENTAL)
- New save-csv command to save data as CSV file
- New utility modules in src/utils/ directory
- Enhanced CLI documentation and usage examples
- Support for experimental --transform and --schema options

### Changed
- Updated demo/package.json dependencies
- Improved CLI help text with better formatting
- Removed outdated test files (	est-*.js, 	est-*.html)
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





