/**
 * Svelte Plugin Example for jtcsv
 * 
 * This example demonstrates how to use jtcsv in Svelte applications
 * with stores, actions, and utilities.
 * 
 * Run: npx ts-node --esm example.ts
 */

// Mock Svelte stores
class MockWritable<T> {
  private subscribers: ((value: T) => void)[] = [];
  constructor(private value: T) {}
  
  subscribe(fn: (value: T) => void) {
    fn(this.value);
    this.subscribers.push(fn);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== fn);
    };
  }
  
  set(value: T) {
    this.value = value;
    this.subscribers.forEach(fn => fn(value));
  }
}

// ============================================
// Example 1: createCsvStore
// ============================================
function exampleCsvStore() {
  console.log('=== Example 1: createCsvStore ===');
  
  // Simplified csvToJson
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

  const jsonToCsv = (json: any[]): string => {
    if (!json.length) return '';
    const headers = Object.keys(json[0]);
    const rows = json.map(row => 
      headers.map(h => String(row[h] ?? '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  // Create CSV store
  const initialCsv = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
  
  const csv = new MockWritable(initialCsv);
  const data = new MockWritable(csvToJson(initialCsv));
  const error = new MockWritable<string | null>(null);

  const updateFromCsv = (newCsv: string) => {
    try {
      const newJson = csvToJson(newCsv);
      csv.set(newCsv);
      data.set(newJson);
      error.set(null);
    } catch (err: any) {
      error.set(err.message);
    }
  };

  const store = {
    csv: { subscribe: csv.subscribe.bind(csv), set: updateFromCsv },
    data: { subscribe: data.subscribe.bind(data) },
    error: { subscribe: error.subscribe.bind(error) },
    updateFromCsv
  };

  // Test store
  console.log('Initial CSV:', initialCsv);
  console.log('Initial Data:', store.data);
  
  // Update from CSV
  const newCsv = 'product,price\nApple,1.50\nBanana,0.75';
  updateFromCsv(newCsv);
  console.log('Updated Data:', store.data);
  console.log();
}

// ============================================
// Example 2: csvUpload Action
// ============================================
function exampleCsvUpload() {
  console.log('=== Example 2: csvUpload Action ===');
  
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

  // Simulate file upload action
  const csvUpload = (options: any = {}) => {
    return {
      onLoad: options.onLoad || (() => {}),
      onError: options.onError || (() => {})
    };
  };

  // Test action
  const action = csvUpload({
    onLoad: (data: any[]) => {
      console.log('Loaded:', data);
    },
    onError: (err: Error) => {
      console.error('Error:', err.message);
    }
  });

  console.log('csvUpload action ready');
  console.log('onLoad callback:', typeof action.onLoad);
  console.log('onError callback:', typeof action.onError);
  console.log();
}

// ============================================
// Example 3: downloadCsv
// ============================================
function exampleDownloadCsv() {
  console.log('=== Example 3: downloadCsv ===');
  
  const jsonToCsv = (json: any[]): string => {
    if (!json.length) return '';
    const headers = Object.keys(json[0]);
    const rows = json.map(row => 
      headers.map(h => String(row[h] ?? '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadCsv = (json: any[], filename: string = 'data.csv') => {
    const csv = jsonToCsv(json);
    console.log(`Would download: ${filename}`);
    console.log(csv);
  };

  const data = [
    { name: 'Product A', price: 29.99, inStock: true },
    { name: 'Product B', price: 49.99, inStock: false },
    { name: 'Product C', price: 19.99, inStock: true }
  ];

  downloadCsv(data, 'products.csv');
  console.log();
}

// ============================================
// Example 4: csvToJsonStore
// ============================================
function exampleCsvToJsonStore() {
  console.log('=== Example 4: csvToJsonStore ===');
  
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

  // Simulate derived store
  class DerivedStore {
    private csvValue = '';
    private dataValue: any[] = [];
    
    constructor(csvStore: MockWritable<string>) {
      csvStore.subscribe((value: string) => {
        this.csvValue = value;
        this.dataValue = csvToJson(value);
      });
    }
    
    subscribe(fn: (value: any[]) => void) {
      fn(this.dataValue);
    }
  }

  const csvStore = new MockWritable('id,name\n1,Item A\n2,Item B');
  const derived = new DerivedStore(csvStore);
  
  console.log('CSV value:', csvStore);
  derived.subscribe((data) => {
    console.log('Derived JSON:', data);
  });
  console.log();
}

// Run all examples
console.log('Svelte Plugin Examples\n');
exampleCsvStore();
exampleCsvUpload();
exampleDownloadCsv();
exampleCsvToJsonStore();

console.log('All examples completed!');
