// @ts-nocheck
// Core entry point for the jtcsv module (lightweight version)
// Exports only JSON↔CSV core functions without NDJSON, TSV, or plugins

const jsonToCsvModule = require('./json-to-csv');
const csvToJsonModule = require('./csv-to-json');
const errorsModule = require('./errors');
const jsonSaveModule = require('./json-save');
const streamJsonToCsvModule = require('./stream-json-to-csv');
const streamCsvToJsonModule = require('./stream-csv-to-json');

// Combine core exports
module.exports = {
  // JSON to CSV functions
  jsonToCsv: jsonToCsvModule.jsonToCsv,
  preprocessData: jsonToCsvModule.preprocessData,
  saveAsCsv: jsonToCsvModule.saveAsCsv,
  deepUnwrap: jsonToCsvModule.deepUnwrap,
  validateFilePath: jsonToCsvModule.validateFilePath,
  
  // CSV to JSON functions
  csvToJson: csvToJsonModule.csvToJson,
  csvToJsonIterator: csvToJsonModule.csvToJsonIterator,
  readCsvAsJson: csvToJsonModule.readCsvAsJson,
  readCsvAsJsonSync: csvToJsonModule.readCsvAsJsonSync,
  autoDetectDelimiter: csvToJsonModule.autoDetectDelimiter,

  // JSON save functions
  saveAsJson: jsonSaveModule.saveAsJson,
  saveAsJsonSync: jsonSaveModule.saveAsJsonSync,

  // Streaming JSON to CSV functions
  createJsonToCsvStream: streamJsonToCsvModule.createJsonToCsvStream,
  streamJsonToCsv: streamJsonToCsvModule.streamJsonToCsv,
  saveJsonStreamAsCsv: streamJsonToCsvModule.saveJsonStreamAsCsv,
  createJsonReadableStream: streamJsonToCsvModule.createJsonReadableStream,
  createCsvCollectorStream: streamJsonToCsvModule.createCsvCollectorStream,

  // Streaming CSV to JSON functions
  createCsvToJsonStream: streamCsvToJsonModule.createCsvToJsonStream,
  streamCsvToJson: streamCsvToJsonModule.streamCsvToJson,
  createCsvFileToJsonStream: streamCsvToJsonModule.createCsvFileToJsonStream,
  createJsonCollectorStream: streamCsvToJsonModule.createJsonCollectorStream,

  // Error classes
  ...errorsModule
};