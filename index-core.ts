/**
 * Core entry point for the jtcsv module (lightweight version)
 * Exports only JSON↔CSV core functions without NDJSON, TSV, or plugins
 * 
 * TypeScript version with async function support
 */

import {
  jsonToCsv,
  jsonToCsvAsync,
  preprocessData,
  saveAsCsv,
  saveAsCsvAsync,
  deepUnwrap,
  validateFilePath
} from './json-to-csv';

import {
  csvToJson,
  csvToJsonAsync,
  csvToJsonIterator,
  readCsvAsJson,
  readCsvAsJsonSync,
  autoDetectDelimiter,
  createTransformHooks,
  createDelimiterCache,
  getDelimiterCacheStats,
  clearDelimiterCache
} from './csv-to-json';

import {
  saveAsJson,
  saveAsJsonAsync,
  saveAsJsonSync
} from './json-save';

import {
  createJsonToCsvStream,
  streamJsonToCsv,
  streamJsonToCsvAsync,
  saveJsonStreamAsCsv,
  createJsonReadableStream,
  createCsvCollectorStream
} from './stream-json-to-csv';

import {
  createCsvToJsonStream,
  streamCsvToJson,
  streamCsvToJsonAsync,
  createCsvFileToJsonStream,
  createJsonCollectorStream
} from './stream-csv-to-json';

import {
  JtcsvError,
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  safeExecute,
  safeExecuteSync,
  safeExecuteAsync,
  ErrorCode
} from './errors';

// Export all functions
export {
  // JSON to CSV functions
  jsonToCsv,
  jsonToCsvAsync,
  preprocessData,
  saveAsCsv,
  saveAsCsvAsync,
  deepUnwrap,
  validateFilePath,
  
  // CSV to JSON functions
  csvToJson,
  csvToJsonAsync,
  csvToJsonIterator,
  readCsvAsJson,
  readCsvAsJsonSync,
  autoDetectDelimiter,
  createTransformHooks,
  createDelimiterCache,
  getDelimiterCacheStats,
  clearDelimiterCache,

  // JSON save functions
  saveAsJson,
  saveAsJsonAsync,
  saveAsJsonSync,

  // Streaming JSON to CSV functions
  createJsonToCsvStream,
  streamJsonToCsv,
  streamJsonToCsvAsync,
  saveJsonStreamAsCsv,
  createJsonReadableStream,
  createCsvCollectorStream,

  // Streaming CSV to JSON functions
  createCsvToJsonStream,
  streamCsvToJson,
  streamCsvToJsonAsync,
  createCsvFileToJsonStream,
  createJsonCollectorStream,

  // Error classes
  JtcsvError,
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  safeExecute,
  safeExecuteSync,
  safeExecuteAsync
};

// Export types
export type {
  JsonToCsvOptions,
  AsyncJsonToCsvOptions,
  CsvToJsonOptions,
  AsyncCsvToJsonOptions,
  SaveAsCsvOptions,
  SaveAsJsonOptions,
  JsonToCsvStreamOptions,
  CsvToJsonStreamOptions,
  AnyArray,
  AnyObject,
  WorkerTask,
  WorkerResult,
  WorkerPoolStats,
  NdjsonOptions,
  TsvOptions,
  TsvValidationResult,
  ValidateTsvOptions,
  PreprocessOptions,
  DeepUnwrapOptions
} from './src/types';

// Default export for CommonJS compatibility
const coreModule = {
  // JSON to CSV functions
  jsonToCsv,
  jsonToCsvAsync,
  preprocessData,
  saveAsCsv,
  saveAsCsvAsync,
  deepUnwrap,
  validateFilePath,
  
  // CSV to JSON functions
  csvToJson,
  csvToJsonAsync,
  csvToJsonIterator,
  readCsvAsJson,
  readCsvAsJsonSync,
  autoDetectDelimiter,
  createTransformHooks,
  createDelimiterCache,
  getDelimiterCacheStats,
  clearDelimiterCache,

  // JSON save functions
  saveAsJson,
  saveAsJsonAsync,
  saveAsJsonSync,

  // Streaming JSON to CSV functions
  createJsonToCsvStream,
  streamJsonToCsv,
  streamJsonToCsvAsync,
  saveJsonStreamAsCsv,
  createJsonReadableStream,
  createCsvCollectorStream,

  // Streaming CSV to JSON functions
  createCsvToJsonStream,
  streamCsvToJson,
  streamCsvToJsonAsync,
  createCsvFileToJsonStream,
  createJsonCollectorStream,

  // Error classes
  JtcsvError,
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  safeExecute,
  safeExecuteSync,
  safeExecuteAsync
};

export default coreModule;