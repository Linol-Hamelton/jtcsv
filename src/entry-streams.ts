// Subpath entry: `jtcsv/streams` — Node Transform stream helpers.
import {
  createCsvToJsonStream as _createCsvToJsonStream,
  createCsvFileToJsonStream as _createCsvFileToJsonStream,
} from '../stream-csv-to-json';
import { deprecate } from './utils/deprecate';

export {
  createJsonToCsvStream,
  streamJsonToCsv,
  streamJsonToCsvAsync,
  saveJsonStreamAsCsv,
  createJsonReadableStream,
  createCsvCollectorStream,
} from '../stream-json-to-csv';

export {
  createCsvToJsonStream,
  streamCsvToJson,
  streamCsvToJsonAsync,
  createCsvFileToJsonStream,
  createJsonCollectorStream,
} from '../stream-csv-to-json';

// Deprecated aliases — runtime-warn once, removed in jtcsv 5.0.
/** @deprecated Use `createCsvToJsonStream()` instead. Removed in jtcsv 5.0. */
export const csvToJsonStream = deprecate(_createCsvToJsonStream, 'csvToJsonStream', 'createCsvToJsonStream');
/** @deprecated Use `createCsvFileToJsonStream()` instead. Removed in jtcsv 5.0. */
export const csvFileToJsonStream = deprecate(
  _createCsvFileToJsonStream,
  'csvFileToJsonStream',
  'createCsvFileToJsonStream',
);
