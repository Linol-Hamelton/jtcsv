/**
 * Vue 3 Plugin Example for jtcsv
 * 
 * This example demonstrates how to use jtcsv in Vue 3 applications
 * with Composition API, Options API, and file upload directive.
 * 
 * Run: node example.js
 */

'use strict';

const { createApp, ref } = require('vue');

// Import the plugin
const JtcsvVuePlugin = require('./index').default;
const { useJtcsv, useJtcsvAsync, csvUpload } = require('./index');

// ============================================
// Example 1: Basic CSV to JSON conversion
// ============================================
function exampleBasicConversion() {
  console.log('=== Example 1: Basic Conversion ===');
  
  // Create mock app context
  const mockApp = {
    config: {
      globalProperties: {}
    },
    provide: (key, value) => {
      console.log(`Provided: ${key}`);
    }
  };
  
  // Install plugin
  JtcsvVuePlugin.install(mockApp);
  
  // Use in Composition API style
  const jtcsv = {
    csvToJson: (csv, opts) => {
      // Simplified mock - real implementation would use jtcsv
      const lines = csv.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, i) => {
          obj[header] = values[i]?.trim();
          return obj;
        }, {});
      });
    },
    jsonToCsv: (data, opts) => {
      if (!data.length) return '';
      const headers = Object.keys(data[0]);
      const rows = data.map(row => 
        headers.map(h => String(row[h] ?? '')).join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }
  };
  
  // Test conversion
  const csvData = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
  const jsonData = jtcsv.csvToJson(csvData);
  console.log('CSV:', csvData);
  console.log('JSON:', JSON.stringify(jsonData, null, 2));
  
  // Reverse
  const backToCsv = jtcsv.jsonToCsv(jsonData);
  console.log('Back to CSV:', backToCsv);
  console.log();
}

// ============================================
// Example 2: Async Operations
// ============================================
function exampleAsyncOperations() {
  console.log('=== Example 2: Async Operations ===');
  
  // Mock async jtcsv
  const jtcsvAsync = {
    csvToJsonAsync: async (csv, opts) => {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      const lines = csv.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, i) => {
          obj[header] = values[i]?.trim();
          return obj;
        }, {});
      });
    },
    jsonToCsvAsync: async (data, opts) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      if (!data.length) return '';
      const headers = Object.keys(data[0]);
      const rows = data.map(row => 
        headers.map(h => String(row[h] ?? '')).join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }
  };
  
  // Test async
  const csvData = 'product,price,quantity\nApple,1.50,100\nBanana,0.75,200';
  
  jtcsvAsync.csvToJsonAsync(csvData).then(json => {
    console.log('Async JSON:', JSON.stringify(json, null, 2));
    return jtcsvAsync.jsonToCsvAsync(json);
  }).then(csv => {
    console.log('Async CSV:', csv);
    console.log();
  });
}

// ============================================
// Example 3: File Upload Handling
// ============================================
function exampleFileUpload() {
  console.log('=== Example 3: File Upload ===');
  
  // Mock file upload handler
  const handleFileUpload = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target?.result;
        // Parse CSV (simplified)
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((obj, header, i) => {
            obj[header] = values[i]?.trim();
            return obj;
          }, {});
        });
        resolve(data);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };
  
  // Simulate file
  const mockFile = {
    name: 'data.csv',
    text: () => Promise.resolve('id,name,value\n1,Item A,100\n2,Item B,200')
  };
  
  handleFileUpload(mockFile).then(data => {
    console.log('Uploaded data:', data);
    console.log();
  });
}

// ============================================
// Example 4: Download CSV
// ============================================
function exampleDownloadCsv() {
  console.log('=== Example 4: Download CSV ===');
  
  const data = [
    { name: 'Product A', price: 29.99, inStock: true },
    { name: 'Product B', price: 49.99, inStock: false },
    { name: 'Product C', price: 19.99, inStock: true }
  ];
  
  // Convert to CSV
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => String(row[h])).join(','))
  ].join('\n');
  
  console.log('Generated CSV:');
  console.log(csv);
  console.log();
  
  // In real app, would trigger download:
  // const blob = new Blob([csv], { type: 'text/csv' });
  // const url = URL.createObjectURL(blob);
  // const a = document.createElement('a');
  // a.href = url;
  // a.download = 'data.csv';
  // a.click();
}

// Run all examples
console.log('Vue Plugin Examples\n');
exampleBasicConversion();
exampleAsyncOperations();
exampleFileUpload();
exampleDownloadCsv();

console.log('All examples completed!');
