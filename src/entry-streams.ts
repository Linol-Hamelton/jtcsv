// Subpath entry: `jtcsv/streams` — Node Transform stream helpers.
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

// Deprecated aliases (preserved for 4.x; removed in 5.0).
export {
  createCsvToJsonStream as csvToJsonStream,
  createCsvFileToJsonStream as csvFileToJsonStream,
} from '../stream-csv-to-json';
