// Ядро jtcsv - только базовые функции JSON<->CSV
// Минимальный размер, максимальная производительность

import * as jsonToCsvBrowser from './json-to-csv-browser';
import * as csvToJsonBrowser from './csv-to-json-browser';
import {
  downloadAsCsv,
  parseCsvFile,
  parseCsvFileStream,
  jsonToCsvStream,
  jsonToNdjsonStream,
  csvToJsonStream
} from './browser-functions';
import {
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  ERROR_CODES
} from './errors-browser';

import type { JsonToCsvOptions, CsvToJsonOptions } from '../types';

const { jsonToCsv, preprocessData, deepUnwrap } = jsonToCsvBrowser as any;
const { csvToJson, csvToJsonIterator, autoDetectDelimiter } = csvToJsonBrowser as any;

/**
 * Асинхронная версия jsonToCsv
 */
async function jsonToCsvAsync(data: any, options: JsonToCsvOptions = {}): Promise<string> {
  return jsonToCsv(data, options);
}

/**
 * Асинхронная версия csvToJson
 */
async function csvToJsonAsync(csv: string, options: CsvToJsonOptions = {}): Promise<any[]> {
  return csvToJson(csv, options);
}

/**
 * Асинхронная версия parseCsvFile
 */
async function parseCsvFileAsync(file: File, options: CsvToJsonOptions = {}): Promise<any[]> {
  return parseCsvFile(file, options);
}

/**
 * Асинхронная версия autoDetectDelimiter
 */
async function autoDetectDelimiterAsync(csv: string): Promise<string> {
  return autoDetectDelimiter(csv);
}

/**
 * Асинхронная версия downloadAsCsv
 */
async function downloadAsCsvAsync(
  data: any,
  filename: string = 'export.csv',
  options: JsonToCsvOptions = {}
): Promise<void> {
  return downloadAsCsv(data, filename, options);
}

// Основной экспорт ядра
const jtcsvCore = {
  // JSON to CSV функции
  jsonToCsv,
  preprocessData,
  downloadAsCsv,
  deepUnwrap,
  
  // CSV to JSON функции
  csvToJson,
  csvToJsonIterator,
  parseCsvFile,
  parseCsvFileStream,
  jsonToCsvStream,
  jsonToNdjsonStream,
  csvToJsonStream,
  autoDetectDelimiter,
  
  // Асинхронные функции
  jsonToCsvAsync,
  csvToJsonAsync,
  parseCsvFileAsync,
  autoDetectDelimiterAsync,
  downloadAsCsvAsync,
  
  // Error classes
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  ERROR_CODES,
  
  // Удобные алиасы
  parse: csvToJson,
  unparse: jsonToCsv,
  parseAsync: csvToJsonAsync,
  unparseAsync: jsonToCsvAsync,
  
  // Версия
  version: '3.0.0-core'
};

// Экспорт для разных сред
if (typeof module !== 'undefined' && module.exports) {
  // Node.js CommonJS
  module.exports = jtcsvCore;
} else if (typeof define === 'function' && (define as any).amd) {
  // AMD
  (define as any)([], () => jtcsvCore);
} else if (typeof window !== 'undefined') {
  // Браузер (глобальная переменная)
  (window as any).jtcsv = jtcsvCore;
}

export default jtcsvCore;
export {
  jsonToCsv,
  preprocessData,
  downloadAsCsv,
  deepUnwrap,
  csvToJson,
  csvToJsonIterator,
  parseCsvFile,
  parseCsvFileStream,
  jsonToCsvStream,
  jsonToNdjsonStream,
  csvToJsonStream,
  autoDetectDelimiter,
  // Асинхронные функции
  jsonToCsvAsync,
  csvToJsonAsync,
  parseCsvFileAsync,
  autoDetectDelimiterAsync,
  downloadAsCsvAsync,
  // Error classes
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  ERROR_CODES
};
