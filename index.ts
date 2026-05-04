// Main entry point for the jtcsv module
// Exports both JSON→CSV and CSV→JSON functions

// Re-export all functions from individual modules
export { jsonToCsv, jsonToCsvAsync, saveAsCsvAsync, preprocessData, saveAsCsv, deepUnwrap, validateFilePath } from './json-to-csv';
export { csvToJson, csvToJsonAsync, csvToJsonIterator, readCsvAsJson, readCsvAsJsonSync, autoDetectDelimiter } from './csv-to-json';
export { saveAsJson, saveAsJsonAsync, saveAsJsonSync } from './json-save';
export { createJsonToCsvStream, streamJsonToCsv, streamJsonToCsvAsync, saveJsonStreamAsCsv, createJsonReadableStream, createCsvCollectorStream } from './stream-json-to-csv';
export { createCsvToJsonStream, streamCsvToJson, streamCsvToJsonAsync, createCsvFileToJsonStream, createJsonCollectorStream } from './stream-csv-to-json';

// ============================================================================
// DEPRECATED ALIASES - To be removed in jtcsv 5.0
// Each emits a one-time `process.emitWarning` on first call.
// Use canonical functions instead:
//   - csvToJsonFile()       -> readCsvAsJson()
//   - csvToJsonFileSync()   -> readCsvAsJsonSync()
//   - csvToJsonStream()     -> createCsvToJsonStream()
//   - csvFileToJsonStream() -> createCsvFileToJsonStream()
// ============================================================================
import { readCsvAsJson as _readCsvAsJson, readCsvAsJsonSync as _readCsvAsJsonSync } from './csv-to-json';
import {
  createCsvToJsonStream as _createCsvToJsonStream,
  createCsvFileToJsonStream as _createCsvFileToJsonStream
} from './stream-csv-to-json';
import { deprecate } from './src/utils/deprecate';

/** @deprecated Use `readCsvAsJson()` instead. Removed in jtcsv 5.0. */
export const csvToJsonFile = deprecate(_readCsvAsJson, 'csvToJsonFile', 'readCsvAsJson');

/** @deprecated Use `readCsvAsJsonSync()` instead. Removed in jtcsv 5.0. */
export const csvToJsonFileSync = deprecate(_readCsvAsJsonSync, 'csvToJsonFileSync', 'readCsvAsJsonSync');

/** @deprecated Use `createCsvToJsonStream()` instead. Removed in jtcsv 5.0. */
export const csvToJsonStream = deprecate(_createCsvToJsonStream, 'csvToJsonStream', 'createCsvToJsonStream');

/** @deprecated Use `createCsvFileToJsonStream()` instead. Removed in jtcsv 5.0. */
export const csvFileToJsonStream = deprecate(
  _createCsvFileToJsonStream,
  'csvFileToJsonStream',
  'createCsvFileToJsonStream'
);

// Re-export from submodules
import NdjsonParser from './src/formats/ndjson-parser';
import TsvParser from './src/formats/tsv-parser';

export const jsonToNdjson = NdjsonParser.toNdjson;
export const ndjsonToJson = NdjsonParser.fromNdjson;
export const parseNdjsonStream = NdjsonParser.parseStream;
export const createNdjsonToCsvStream = NdjsonParser.createNdjsonToCsvStream;
export const createCsvToNdjsonStream = NdjsonParser.createCsvToNdjsonStream;
export const getNdjsonStats = NdjsonParser.getStats;

export const jsonToTsv = TsvParser.jsonToTsv;
export const tsvToJson = TsvParser.tsvToJson;
export const isTsv = TsvParser.isTsv;
export const validateTsv = TsvParser.validateTsv;
export const readTsvAsJson = TsvParser.readTsvAsJson;
export const readTsvAsJsonSync = TsvParser.readTsvAsJsonSync;
export const saveAsTsv = TsvParser.saveAsTsv;
export const saveAsTsvSync = TsvParser.saveAsTsvSync;
export const createJsonToTsvStream = TsvParser.createJsonToTsvStream;
export const createTsvToJsonStream = TsvParser.createTsvToJsonStream;
export { createZodValidationHook, createYupValidationHook, createValidatedParser } from './src/utils/zod-adapter';
export { detectEncoding, convertToUtf8, autoDetectAndConvert, csvToJsonWithEncoding } from './src/utils/encoding-support';
export { isEmail, isUrl, isDate, validators } from './src/utils/validators';
export { createBatchProcessor, asyncIterUtils } from './src/core/node-optimizations';

// Export error classes
export * from './errors';

// Export types
export * from './src/types/index';
