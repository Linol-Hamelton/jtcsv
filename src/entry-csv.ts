// Subpath entry: `jtcsv/csv` — CSV→JSON sync workflow only.
// Pulls just the parser + delimiter helpers; tree-shakes streams, NDJSON, TSV.
export {
  csvToJson,
  csvToJsonAsync,
  csvToJsonIterator,
  readCsvAsJson,
  readCsvAsJsonSync,
  autoDetectDelimiter,
} from '../csv-to-json';

// Deprecated aliases (preserved for 4.x; removed in 5.0).
export { readCsvAsJson as csvToJsonFile, readCsvAsJsonSync as csvToJsonFileSync } from '../csv-to-json';

// Errors most callers need.
export {
  JtcsvError,
  ValidationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
} from '../errors';
