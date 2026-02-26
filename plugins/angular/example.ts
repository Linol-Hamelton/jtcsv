/**
 * Angular Plugin Example for jtcsv
 * 
 * This example demonstrates how to use jtcsv in Angular applications
 * with service, pipes, and file handling.
 * 
 * Run: npx ts-node --esm example.ts
 */

// Mock Angular core for demonstration
const MockAngular = {
  Injectable: (options?: any) => (target: any) => target,
  Pipe: (options?: any) => (target: any) => target,
  NgModule: (options?: any) => (target: any) => target,
  Input: (target: any, key: string) => {},
  Output: (target: any, key: string) => {},
  EventEmitter: class EventEmitter<T> {
    emit(value: T) {}
  }
};

// ============================================
// Example 1: Service Usage
// ============================================
function exampleService() {
  console.log('=== Example 1: Service Usage ===');
  
  // Simplified csvToJson implementation
  const csvToJson = (csv: string, opts?: any): any[] => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map((h: string) => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj: any, header: string, i: number) => {
        obj[header] = values[i]?.trim();
        return obj;
      }, {});
    });
  };

  const jsonToCsv = (json: any[], opts?: any): string => {
    if (!json.length) return '';
    const headers = Object.keys(json[0]);
    const rows = json.map(row => 
      headers.map(h => String(row[h] ?? '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  // Simulate service
  class JtcsvService {
    csvToJson(csv: string, options?: any): any[] {
      return csvToJson(csv, options);
    }

    jsonToCsv(json: any[], options?: any): string {
      return jsonToCsv(json, options);
    }

    parseCsvFile(file: any, options?: any): Promise<any[]> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = csvToJson(e.target?.result as string, options);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
    }

    downloadCsv(json: any[], filename: string = 'data.csv', options?: any): void {
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
  
  const csvToJson = (csv: string): any[] => {
    if (!csv) return [];
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map((h: string) => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj: any, header: string, i: number) => {
        obj[header] = values[i]?.trim();
        return obj;
      }, {});
    });
  };

  const jsonToCsv = (json: any[]): string => {
    if (!json || !json.length) return '';
    const headers = Object.keys(json[0]);
    const rows = json.map(row => 
      headers.map(h => String(row[h] ?? '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  // Simulate pipes
  class CsvToJsonPipe {
    transform(value: string): any[] {
      return csvToJson(value);
    }
  }

  class JsonToCsvPipe {
    transform(value: any[]): string {
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
  
  const csvToJson = (csv: string): any[] => {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map((h: string) => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj: any, header: string, i: number) => {
        obj[header] = values[i]?.trim();
        return obj;
      }, {});
    });
  };

  class FileUploader {
    async parseFile(file: File): Promise<any[]> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = csvToJson(e.target?.result as string);
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
  
  // In real app would be: uploader.parseFile(actualFile)
  console.log('File upload handler ready for:', mockFile.name);
  console.log();
}

// ============================================
// Example 4: Download CSV
// ============================================
function exampleDownload() {
  console.log('=== Example 4: Download CSV ===');
  
  const jsonToCsv = (json: any[]): string => {
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
  
  // In real app would trigger browser download:
  // const blob = new Blob([csv], { type: 'text/csv' });
  // const url = URL.createObjectURL(blob);
}

// Run all examples
console.log('Angular Plugin Examples\n');
exampleService();
examplePipes();
exampleFileUpload();
exampleDownload();

console.log('All examples completed!');
