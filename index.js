// Main entry point for the jtcsv module
// Exports both JSON→CSV and CSV→JSON functions

const jsonToCsvModule = require('./json-to-csv');
const csvToJsonModule = require('./csv-to-json');
const errorsModule = require('./errors');

// Combine all exports
module.exports = {
  // JSON to CSV functions
  jsonToCsv: jsonToCsvModule.jsonToCsv,
  preprocessData: jsonToCsvModule.preprocessData,
  saveAsCsv: jsonToCsvModule.saveAsCsv,
  deepUnwrap: jsonToCsvModule.deepUnwrap,
  validateFilePath: jsonToCsvModule.validateFilePath,
  
  // CSV to JSON functions
  csvToJson: csvToJsonModule.csvToJson,
  readCsvAsJson: csvToJsonModule.readCsvAsJson,
  readCsvAsJsonSync: csvToJsonModule.readCsvAsJsonSync,

  // Error classes
  ...errorsModule
};
