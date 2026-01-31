// Main entry point for the jtcsv module
// Exports both JSON→CSV and CSV→JSON functions

// Re-export all functions from individual modules
export { jsonToCsv, preprocessData, saveAsCsv, deepUnwrap, validateFilePath } from './json-to-csv';
export { csvToJson, csvToJsonIterator, readCsvAsJson, readCsvAsJsonSync, autoDetectDelimiter } from './csv-to-json';
export { readCsvAsJson as csvToJsonFile, readCsvAsJsonSync as csvToJsonFileSync } from './csv-to-json';
export { saveAsJson, saveAsJsonSync } from './json-save';
export { createJsonToCsvStream, streamJsonToCsv, saveJsonStreamAsCsv, createJsonReadableStream, createCsvCollectorStream } from './stream-json-to-csv';
export { createCsvToJsonStream, streamCsvToJson, createCsvFileToJsonStream, createJsonCollectorStream } from './stream-csv-to-json';
export { createCsvToJsonStream as csvToJsonStream, createCsvFileToJsonStream as csvFileToJsonStream } from './stream-csv-to-json';

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
