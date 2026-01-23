// Браузерный entry point для jtcsv
// Экспортирует все функции с поддержкой браузера

import { jsonToCsv, preprocessData, deepUnwrap } from './json-to-csv-browser.js';
import { csvToJson, autoDetectDelimiter } from './csv-to-json-browser.js';
import { downloadAsCsv, parseCsvFile } from './browser-functions.js';
import { createWorkerPool, parseCSVWithWorker } from './workers/worker-pool.js';
import {
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError
} from './errors-browser.js';

// Основной экспорт
const jtcsv = {
  // JSON to CSV функции
  jsonToCsv,
  preprocessData,
  downloadAsCsv,
  deepUnwrap,
  
  // CSV to JSON функции
  csvToJson,
  parseCsvFile,
  autoDetectDelimiter,
  
  // Web Workers функции
  createWorkerPool,
  parseCSVWithWorker,
  
  // Error classes
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  
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
  parseCsvFile,
  autoDetectDelimiter,
  createWorkerPool,
  parseCSVWithWorker,
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError
};
