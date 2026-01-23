# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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





