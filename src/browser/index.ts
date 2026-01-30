// Браузерный entry point для jtcsv
// Экспортирует все функции с поддержкой браузера

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
import { createWorkerPool, parseCSVWithWorker } from './workers/worker-pool';
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
 * Опции для ленивой инициализации Worker Pool
 */
interface WorkerPoolOptions {
  size?: number;
  timeout?: number;
  onError?: (error: Error) => void;
}

/**
 * Ленивая инициализация Worker Pool
 */
async function createWorkerPoolLazy(options: any = {}): Promise<any> {
  const mod = await import('./workers/worker-pool');
  return mod.createWorkerPool(options);
}

/**
 * Ленивый парсинг CSV с использованием Worker
 */
async function parseCSVWithWorkerLazy(
  csvInput: string | File,
  options: CsvToJsonOptions = {},
  onProgress?: (progress: number) => void
): Promise<any[]> {
  const mod = await import('./workers/worker-pool');
  return mod.parseCSVWithWorker(csvInput, options, onProgress);
}

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

// Основной экспорт
const jtcsv = {
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
  
  // Web Workers функции
  createWorkerPool,
  parseCSVWithWorker,
  createWorkerPoolLazy,
  parseCSVWithWorkerLazy,
  
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
  version: '2.0.0-browser'
};

// Экспорт для разных сред
if (typeof module !== 'undefined' && module.exports) {
  // Node.js CommonJS
  module.exports = jtcsv;
} else if (typeof define === 'function' && define.amd) {
  // AMD
  define([], () => jtcsv);
} else if (typeof window !== 'undefined') {
  // Браузер (глобальная переменная)
  (window as any).jtcsv = jtcsv;
}

export default jtcsv;
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
  createWorkerPool,
  parseCSVWithWorker,
  createWorkerPoolLazy,
  parseCSVWithWorkerLazy,
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
