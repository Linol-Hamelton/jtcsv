// Ядро jtcsv - только базовые функции JSON<->CSV
// Минимальный размер, максимальная производительность

import { jsonToCsv, preprocessData, deepUnwrap } from './json-to-csv-browser.js';
import { csvToJson, csvToJsonIterator, autoDetectDelimiter } from './csv-to-json-browser.js';
import {
  downloadAsCsv,
  parseCsvFile,
  parseCsvFileStream,
  jsonToCsvStream,
  jsonToNdjsonStream,
  csvToJsonStream
} from './browser-functions.js';
import {
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  ERROR_CODES
} from './errors-browser.js';

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
  version: '3.0.0-core'
};

// Экспорт для разных сред
if (typeof module !== 'undefined' && module.exports) {
  // Node.js CommonJS
  module.exports = jtcsvCore;
} else if (typeof define === 'function' && define.amd) {
  // AMD
  define([], () => jtcsvCore);
} else if (typeof window !== 'undefined') {
  // Браузер (глобальная переменная)
  window.jtcsv = jtcsvCore;
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
  ValidationError,
  SecurityError,
  FileSystemError,
  ParsingError,
  LimitError,
  ConfigurationError,
  ERROR_CODES
};