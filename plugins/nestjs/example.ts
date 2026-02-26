/**
 * NestJS Plugin Example for jtcsv
 * 
 * This example demonstrates how to use jtcsv in NestJS applications
 * with service, pipes, module, and interceptors.
 * 
 * Run: npx ts-node --esm example.ts
 */

// ============================================
// Example 1: Service Usage
// ============================================
function exampleService() {
  console.log('=== Example 1: Service Usage ===');
  
  // Simplified csvToJson
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

    async csvToJsonAsync(csv, options) {
      return csvToJson(csv, options);
    }

    async jsonToCsvAsync(json, options) {
      return jsonToCsv(json, options);
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
  class ParseCsvPipe {
    constructor(options) {
      this.options = options;
    }
    transform(value) {
      if (typeof value === 'string') {
        return csvToJson(value, this.options);
      }
      return value;
    }
  }

  class JsonToCsvPipe {
    constructor(options) {
      this.options = options;
    }
    transform(value) {
      if (Array.isArray(value)) {
        return jsonToCsv(value, this.options);
      }
      return value;
    }
  }

  // Test pipes
  const csvPipe = new ParseCsvPipe({});
  const jsonPipe = new JsonToCsvPipe({});
  
  const csvData = 'product,price\nApple,1.50\nBanana,0.75';
  const json = csvPipe.transform(csvData);
  console.log('ParseCsvPipe:', json);
  
  const backToCsv = jsonPipe.transform(json);
  console.log('JsonToCsvPipe:', backToCsv);
  console.log();
}

// ============================================
// Example 3: Interceptors
// ============================================
function exampleInterceptors() {
  console.log('=== Example 3: Interceptors ===');
  
  const csvToJsonAsync = async (csv, opts) => {
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

  const jsonToCsvAsync = async (json, opts) => {
    if (!json.length) return '';
    const headers = Object.keys(json[0]);
    const rows = json.map(row => 
      headers.map(h => String(row[h] ?? '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  // Simulate interceptor
  function createCsvParserInterceptor(options = {}) {
    return {
      intercept: async (context, next) => {
        const req = { body: 'name,age\nJohn,30' };
        const body = req.body;
        if (typeof body === 'string') {
          req.body = await csvToJsonAsync(body, options);
        }
        console.log('Parsed body:', req.body);
        return { handle: () => Promise.resolve(req.body) };
      }
    };
  }

  function createCsvDownloadInterceptor(options = {}) {
    return {
      intercept: (context, next) => {
        const mockData = [{ name: 'Product A', price: 29.99 }];
        return {
          pipe: (fn) => {
            const result = fn(mockData);
            console.log('Would set headers for CSV download');
            return Promise.resolve(result);
          }
        };
      }
    };
  }

  // Test interceptors
  const parser = createCsvParserInterceptor();
  parser.intercept({}, { handle: () => Promise.resolve() });
  
  const downloader = createCsvDownloadInterceptor({ filename: 'data.csv' });
  downloader.intercept({}, { 
    pipe: async (fn) => {
      const result = await fn({ name: 'Test', value: 100 });
      console.log('Result:', result);
    }
  });
  console.log();
}

// ============================================
// Example 4: Module
// ============================================
function exampleModule() {
  console.log('=== Example 4: Module ===');
  
  // Simulate module
  const JtcsvModule = {
    forRoot: () => {
      return {
        module: JtcsvModule,
        providers: [
          { provide: 'JtcsvService', useClass: class JtcsvService {} }
        ],
        exports: ['JtcsvService']
      };
    },
    forChild: () => {
      return {
        module: JtcsvModule,
        providers: [],
        exports: []
      };
    }
  };

  const moduleConfig = JtcsvModule.forRoot();
  console.log('Module config:', {
    module: moduleConfig.module.name,
    providers: moduleConfig.providers.length,
    exports: moduleConfig.exports
  });
  console.log();
}

// Run all examples
console.log('NestJS Plugin Examples\n');
exampleService();
examplePipes();
exampleInterceptors();
exampleModule();

console.log('All examples completed!');
