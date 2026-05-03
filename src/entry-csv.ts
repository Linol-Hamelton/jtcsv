// Subpath entry: `jtcsv/csv` — CSV→JSON sync workflow only.
// Pulls just the parser + delimiter helpers; tree-shakes streams, NDJSON, TSV.
import { readCsvAsJson as _readCsvAsJson, readCsvAsJsonSync as _readCsvAsJsonSync } from '../csv-to-json';
import { deprecate } from './utils/deprecate';

export {
  csvToJson,
  csvToJsonAsync,
  csvToJsonIterator,
  readCsvAsJson,
  readCsvAsJsonSync,
  autoDetectDelimiter,
} from '../csv-to-json';

// Deprecated aliases — runtime-warn once, removed in jtcsv 5.0.
/** @deprecated Use `readCsvAsJson()` instead. Removed in jtcsv 5.0. */
export const csvToJsonFile = deprecate(_readCsvAsJson, 'csvToJsonFile', 'readCsvAsJson');
/** @deprecated Use `readCsvAsJsonSync()` instead. Removed in jtcsv 5.0. */
export const csvToJsonFileSync = deprecate(_readCsvAsJsonSync, 'csvToJsonFileSync', 'readCsvAsJsonSync');

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
