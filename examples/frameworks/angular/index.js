const { csvToJson, jsonToCsv, streamCsvToJson, streamJsonToCsv } = require('jtcsv');

/**
 * @ngdoc service
 * @name jtcsvService
 * @description Service for CSV/JSON conversion in Angular applications
 */
class JtcsvService {
  constructor() {}

  /**
   * Convert CSV string to JSON array
   * @param {string} csv - CSV string
   * @param {Object} options - Conversion options
   * @returns {Array<Object>} JSON array
   */
  csvToJson(csv, options = {}) {
    return csvToJson(csv, options);
  }

  /**
   * Convert JSON array to CSV string
   * @param {Array<Object>} json - JSON array
   * @param {Object} options - Conversion options
   * @returns {string} CSV string
   */
  jsonToCsv(json, options = {}) {
    return jsonToCsv(json, options);
  }

  /**
   * Create a readable stream that converts CSV to JSON
   * @param {ReadableStream|string} input - Input stream or string
   * @param {Object} options - Stream options
   * @returns {ReadableStream} JSON stream
   */
  streamCsvToJson(input, options = {}) {
    return streamCsvToJson(input, options);
  }

  /**
   * Create a readable stream that converts JSON to CSV
   * @param {ReadableStream|Array<Object>} input - Input stream or JSON array
   * @param {Object} options - Stream options
   * @returns {ReadableStream} CSV stream
   */
  streamJsonToCsv(input, options = {}) {
    return streamJsonToCsv(input, options);
  }

  /**
   * Parse CSV file from File object (browser)
   * @param {File} file - File object from input[type=file]
   * @param {Object} options - Conversion options
   * @returns {Promise<Array<Object>>} Promise resolving to JSON array
   */
  parseCsvFile(file, options = {}) {
    if (typeof File === 'undefined' || !(file instanceof File)) {
      return Promise.reject(new Error('Expected File object'));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const result = csvToJson(event.target.result, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Generate CSV file and trigger download (browser)
   * @param {Array<Object>} json - JSON array
   * @param {string} filename - Download filename
   * @param {Object} options - Conversion options
   */
  downloadCsv(json, filename = 'data.csv', options = {}) {
    const csv = jsonToCsv(json, options);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Export for CommonJS/Node
module.exports = {
  JtcsvService
};