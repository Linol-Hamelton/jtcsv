// Браузерный entry point для jtcsv
// Экспортирует все функции с поддержкой браузера

import { jsonToCsv, preprocessData, deepUnwrap } from './json-to-csv-browser.js';
import { csvToJson, csvToJsonIterator, autoDetectDelimiter } from './csv-to-json-browser.js';
import { downloadAsCsv, parseCsvFile, parseCsvFileStream } from './browser-functions.js';
import { createWorkerPool, parseCSVWithWorker } from './workers/worker-pool.js';
import {
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  ERROR_CODES
} from './errors-browser.js';

async function createWorkerPoolLazy(options = {}) {
  const mod = await import('./workers/worker-pool.js');
  return mod.createWorkerPool(options);
}

async function parseCSVWithWorkerLazy(csvInput, options = {}, onProgress = null) {
  const mod = await import('./workers/worker-pool.js');
  return mod.parseCSVWithWorker(csvInput, options, onProgress);
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
  autoDetectDelimiter,
  
  // Web Workers функции
  createWorkerPool,
  parseCSVWithWorker,
  createWorkerPoolLazy,
  parseCSVWithWorkerLazy,
  
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
  window.jtcsv = jtcsv;
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
  autoDetectDelimiter,
  createWorkerPool,
  parseCSVWithWorker,
  createWorkerPoolLazy,
  parseCSVWithWorkerLazy,
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  ERROR_CODES
};
