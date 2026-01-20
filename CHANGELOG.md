# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
