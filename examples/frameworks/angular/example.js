/**
 * Angular Plugin Example for jtcsv
 * 
 * This example demonstrates how to use jtcsv in Angular applications
 * with service, pipes, and file handling.
 * 
 * Run: node example.js
 */

'use strict';

// ============================================
// Example 1: Service Usage
// ============================================
function exampleService() {
  console.log('=== Example 1: Service Usage ===');
  
  // Simplified csvToJson implementation
  const csvToJson = (csv, opts) => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, i) => {
        obj[header] = values[i]?.trim();
        return obj;
      }, {});
    });
  };

  const jsonToCsv = (json, opts) => {
    if (!json.length) return '';
    const headers = Object.keys(json[0]);
    const rows = json.map(row => 
      headers.map(h => String(row[h] ?? '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  // Simulate service
  class JtcsvService {
    csvToJson(csv, options) {
      return csvToJson(csv, options);
    }

    jsonToCsv(json, options) {
      return jsonToCsv(json, options);
    }

    parseCsvFile(file, options) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = csvToJson(e.target?.result, options);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    }

    downloadCsv(json, filename = 'data.csv', options) {
      const csv = jsonToCsv(json, options);
      console.log(`Download: ${filename}`);
      console.log(csv);
    }
  }

  // Test service
  const service = new JtcsvService();
  
  const csvData = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
  const json = service.csvToJson(csvData);
  console.log('CSV → JSON:', json);
  
  const csv = service.jsonToCsv(json);
  console.log('JSON → CSV:', csv);
  console.log();
}

// ============================================
// Example 2: Pipes
// ============================================
function examplePipes() {
  console.log('=== Example 2: Pipes ===');
  
  const csvToJson = (csv) => {
    if (!csv) return [];
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, i) => {
        obj[header] = values[i]?.trim();
        return obj;
      }, {});
    });
  };

  const jsonToCsv = (json) => {
    if (!json || !json.length) return '';
    const headers = Object.keys(json[0]);
    const rows = json.map(row => 
      headers.map(h => String(row[h] ?? '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  // Simulate pipes
  class CsvToJsonPipe {
    transform(value) {
      return csvToJson(value);
    }
  }

  class JsonToCsvPipe {
    transform(value) {
      return jsonToCsv(value);
    }
  }

  // Test pipes
  const csvPipe = new CsvToJsonPipe();
  const jsonPipe = new JsonToCsvPipe();
  
  const csvData = 'product,price\nApple,1.50\nBanana,0.75';
  const json = csvPipe.transform(csvData);
  console.log('csvToJson pipe:', json);
  
  const backToCsv = jsonPipe.transform(json);
  console.log('jsonToCsv pipe:', backToCsv);
  console.log();
}

// ============================================
// Example 3: File Upload
// ============================================
function exampleFileUpload() {
  console.log('=== Example 3: File Upload ===');
  
  const csvToJson = (csv) => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, i) => {
        obj[header] = values[i]?.trim();
        return obj;
      }, {});
    });
  };

  class FileUploader {
    async parseFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = csvToJson(e.target?.result);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    }
  }

  // Test file upload
  const uploader = new FileUploader();
  const mockFile = {
    name: 'data.csv',
    size: 100
  };
  
  console.log('File upload handler ready for:', mockFile.name);
  console.log();
}

// ============================================
// Example 4: Download CSV
// ============================================
function exampleDownload() {
  console.log('=== Example 4: Download CSV ===');
  
  const jsonToCsv = (json) => {
    if (!json.length) return '';
    const headers = Object.keys(json[0]);
    const rows = json.map(row => 
      headers.map(h => String(row[h] ?? '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  const data = [
    { name: 'Product A', price: 29.99, inStock: true },
    { name: 'Product B', price: 49.99, inStock: false },
    { name: 'Product C', price: 19.99, inStock: true }
  ];

  const csv = jsonToCsv(data);
  console.log('CSV for download:');
  console.log(csv);
  console.log();
}

// Run all examples
console.log('Angular Plugin Examples\n');
exampleService();
examplePipes();
exampleFileUpload();
exampleDownload();

console.log('All examples completed!');
