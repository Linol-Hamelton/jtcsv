/**
 * TypeScript Examples for jtcsv
 *
 * This file demonstrates type-safe usage of jtcsv
 * with full TypeScript support.
 */

import {
  // Core functions
  csvToJson,
  jsonToCsv,
  saveAsCsv,
  readCsvAsJson,
  readCsvAsJsonSync,

  // Streaming
  createCsvToJsonStream,
  createJsonToCsvStream,
  streamCsvToJson,
  streamJsonToCsv,

  // NDJSON
  jsonToNdjson,
  ndjsonToJson,
  parseNdjsonStream,

  // TSV
  jsonToTsv,
  tsvToJson,
  validateTsv,

  // Types
  JsonToCsvOptions,
  CsvToJsonOptions,
  NdjsonOptions,
  TsvOptions,
  TsvValidationResult,

  // Error classes
  JtcsvError,
  ValidationError,
  SecurityError,
  ParsingError,
  FileSystemError,
  LimitError,
  ConfigurationError
} from 'jtcsv';

import { Readable, Writable, Transform } from 'stream';

// =============================================================================
// Type Definitions for Domain Objects
// =============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  isActive: boolean;
  createdAt: string;
}

interface Product {
  sku: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

interface Order {
  orderId: string;
  customerId: number;
  products: string[];
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
}

// =============================================================================
// Example 1: Type-Safe JSON to CSV Conversion
// =============================================================================

function typedJsonToCsv(): void {
  console.log('\n=== Type-Safe JSON to CSV ===\n');

  const users: User[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, isActive: true, createdAt: '2024-01-15' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, isActive: false, createdAt: '2024-02-20' },
    { id: 3, name: 'Bob Wilson', email: 'bob@example.com', age: 35, isActive: true, createdAt: '2024-03-10' }
  ];

  // Options with full type support
  const options: JsonToCsvOptions = {
    delimiter: ',',
    includeHeaders: true,
    preventCsvInjection: true,
    rfc4180Compliant: true,
    renameMap: {
      id: 'User ID',
      name: 'Full Name',
      email: 'Email Address',
      isActive: 'Active Status'
    },
    template: {
      id: 0,
      name: '',
      email: '',
      age: 0,
      isActive: false,
      createdAt: ''
    }
  };

  const csv = jsonToCsv<User>(users, options);
  console.log('Generated CSV:');
  console.log(csv);
}

// =============================================================================
// Example 2: Type-Safe CSV to JSON Conversion
// =============================================================================

function typedCsvToJson(): void {
  console.log('\n=== Type-Safe CSV to JSON ===\n');

  const csvData = `sku,name,price,category,inStock
PRD001,Laptop,999.99,Electronics,true
PRD002,Mouse,29.99,Electronics,true
PRD003,Desk Chair,199.99,Furniture,false`;

  const options: CsvToJsonOptions = {
    delimiter: ',',
    hasHeaders: true,
    parseNumbers: true,
    parseBooleans: true,
    trim: true
  };

  // Parse as generic records first
  const rawProducts = csvToJson(csvData, options);

  // Type assertion after validation
  const products: Product[] = rawProducts.map(row => ({
    sku: String(row.sku),
    name: String(row.name),
    price: Number(row.price),
    category: String(row.category),
    inStock: Boolean(row.inStock)
  }));

  console.log('Parsed products:');
  products.forEach(p => {
    console.log(`  ${p.sku}: ${p.name} - $${p.price.toFixed(2)} (${p.inStock ? 'In Stock' : 'Out of Stock'})`);
  });
}

// =============================================================================
// Example 3: Generic Type Helper
// =============================================================================

// Type-safe parsing helper with validation
function parseTypedCsv<T extends Record<string, unknown>>(
  csv: string,
  options: CsvToJsonOptions,
  validator: (row: Record<string, unknown>) => row is T
): T[] {
  const rawData = csvToJson(csv, options);
  const validData: T[] = [];

  for (const row of rawData) {
    if (validator(row)) {
      validData.push(row);
    } else {
      console.warn('Invalid row skipped:', row);
    }
  }

  return validData;
}

// Type guard for User
function isUser(row: Record<string, unknown>): row is User {
  return (
    typeof row.id === 'number' &&
    typeof row.name === 'string' &&
    typeof row.email === 'string' &&
    typeof row.age === 'number' &&
    typeof row.isActive === 'boolean' &&
    typeof row.createdAt === 'string'
  );
}

function genericTypeHelperExample(): void {
  console.log('\n=== Generic Type Helper ===\n');

  const csv = `id,name,email,age,isActive,createdAt
1,John,john@test.com,30,true,2024-01-01
2,Jane,jane@test.com,25,false,2024-02-01
invalid,Bob,bob@test.com,not-a-number,true,2024-03-01`;

  const users = parseTypedCsv<User>(
    csv,
    { parseNumbers: true, parseBooleans: true },
    isUser
  );

  console.log('Valid users:', users.length);
  users.forEach(u => console.log(`  ${u.id}: ${u.name} (${u.age})`));
}

// =============================================================================
// Example 4: NDJSON with Types
// =============================================================================

async function typedNdjson(): Promise<void> {
  console.log('\n=== Typed NDJSON ===\n');

  const orders: Order[] = [
    { orderId: 'ORD001', customerId: 1, products: ['PRD001', 'PRD002'], total: 1029.98, status: 'shipped' },
    { orderId: 'ORD002', customerId: 2, products: ['PRD003'], total: 199.99, status: 'pending' },
    { orderId: 'ORD003', customerId: 1, products: ['PRD002'], total: 29.99, status: 'delivered' }
  ];

  const ndjsonOptions: NdjsonOptions = {
    transform: (obj, index) => ({
      ...obj,
      lineNumber: index + 1
    })
  };

  // Convert to NDJSON
  const ndjsonString = jsonToNdjson(orders, ndjsonOptions);
  console.log('NDJSON output:');
  console.log(ndjsonString);

  // Parse back
  const parsed = ndjsonToJson(ndjsonString) as (Order & { lineNumber: number })[];
  console.log('\nParsed back:');
  parsed.forEach(o => console.log(`  Line ${o.lineNumber}: ${o.orderId} - ${o.status}`));
}

// =============================================================================
// Example 5: TSV with Validation
// =============================================================================

function typedTsv(): void {
  console.log('\n=== Typed TSV with Validation ===\n');

  const tsvData = `name\tage\tcity
Alice\t28\tNew York
Bob\t35\tLos Angeles
Charlie\t42\tChicago`;

  // Validate TSV structure
  const validation: TsvValidationResult = validateTsv(tsvData, {
    requireConsistentColumns: true,
    disallowEmptyFields: false
  });

  console.log('Validation result:');
  console.log('  Valid:', validation.valid);
  console.log('  Stats:', validation.stats);

  if (validation.valid) {
    const tsvOptions: TsvOptions = {
      hasHeaders: true,
      parseNumbers: true
    };

    interface Person {
      name: string;
      age: number;
      city: string;
    }

    const people = tsvToJson(tsvData, tsvOptions) as Person[];
    console.log('\nParsed people:');
    people.forEach(p => console.log(`  ${p.name}, ${p.age}, ${p.city}`));
  }
}

// =============================================================================
// Example 6: Error Handling with TypeScript
// =============================================================================

function typedErrorHandling(): void {
  console.log('\n=== Typed Error Handling ===\n');

  // Type-safe error handling
  function processCsv(input: string): { success: true; data: Record<string, unknown>[] } | { success: false; error: JtcsvError } {
    try {
      const data = csvToJson(input);
      return { success: true, data };
    } catch (error) {
      if (error instanceof JtcsvError) {
        return { success: false, error };
      }
      throw error; // Re-throw non-jtcsv errors
    }
  }

  // Test with various inputs
  const testCases = [
    'name,age\nJohn,30',
    null as unknown as string,
    'name,age\n"unclosed'
  ];

  testCases.forEach((input, i) => {
    const result = processCsv(input);
    if (result.success) {
      console.log(`Test ${i + 1}: Success - ${result.data.length} rows`);
    } else {
      console.log(`Test ${i + 1}: ${result.error.constructor.name} - ${result.error.message}`);
    }
  });
}

// =============================================================================
// Example 7: Discriminated Union for Error Types
// =============================================================================

type ParseResult<T> =
  | { status: 'success'; data: T[] }
  | { status: 'validation_error'; message: string }
  | { status: 'parsing_error'; line: number | undefined; message: string }
  | { status: 'security_error'; message: string }
  | { status: 'unknown_error'; message: string };

function safeParseCsv<T>(csv: string, options?: CsvToJsonOptions): ParseResult<T> {
  try {
    const data = csvToJson(csv, options) as T[];
    return { status: 'success', data };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { status: 'validation_error', message: error.message };
    }
    if (error instanceof ParsingError) {
      return { status: 'parsing_error', line: error.lineNumber, message: error.message };
    }
    if (error instanceof SecurityError) {
      return { status: 'security_error', message: error.message };
    }
    if (error instanceof Error) {
      return { status: 'unknown_error', message: error.message };
    }
    return { status: 'unknown_error', message: 'Unknown error occurred' };
  }
}

function discriminatedUnionExample(): void {
  console.log('\n=== Discriminated Union Errors ===\n');

  const csv = 'a,b\n1,2';
  const result = safeParseCsv<{ a: string; b: string }>(csv);

  // TypeScript can narrow the type based on status
  switch (result.status) {
    case 'success':
      console.log('Parsed data:', result.data);
      break;
    case 'validation_error':
      console.log('Validation failed:', result.message);
      break;
    case 'parsing_error':
      console.log(`Parse error at line ${result.line}:`, result.message);
      break;
    case 'security_error':
      console.log('Security violation:', result.message);
      break;
    case 'unknown_error':
      console.log('Unknown error:', result.message);
      break;
  }
}

// =============================================================================
// Example 8: Streaming with TypeScript
// =============================================================================

async function typedStreaming(): Promise<void> {
  console.log('\n=== Typed Streaming ===\n');

  // Create typed transform function
  const transform = (row: Record<string, unknown>): Record<string, unknown> => ({
    ...row,
    processed: true,
    timestamp: new Date().toISOString()
  });

  // Type-safe stream options
  const streamOptions: JsonToCsvOptions & { transform: typeof transform } = {
    delimiter: ',',
    includeHeaders: true,
    transform
  };

  // Note: In real usage, you'd pipe actual streams
  console.log('Stream options configured:', Object.keys(streamOptions));
}

// =============================================================================
// Example 9: Builder Pattern for Options
// =============================================================================

class CsvOptionsBuilder {
  private options: CsvToJsonOptions = {};

  withDelimiter(delimiter: string): this {
    this.options.delimiter = delimiter;
    return this;
  }

  withHeaders(hasHeaders: boolean = true): this {
    this.options.hasHeaders = hasHeaders;
    return this;
  }

  withNumberParsing(parse: boolean = true): this {
    this.options.parseNumbers = parse;
    return this;
  }

  withBooleanParsing(parse: boolean = true): this {
    this.options.parseBooleans = parse;
    return this;
  }

  withMaxRows(max: number): this {
    this.options.maxRows = max;
    return this;
  }

  withFastPath(enabled: boolean = true): this {
    this.options.useFastPath = enabled;
    return this;
  }

  build(): CsvToJsonOptions {
    return { ...this.options };
  }
}

function builderPatternExample(): void {
  console.log('\n=== Builder Pattern ===\n');

  const options = new CsvOptionsBuilder()
    .withDelimiter(',')
    .withHeaders(true)
    .withNumberParsing(true)
    .withBooleanParsing(true)
    .withMaxRows(1000)
    .withFastPath(true)
    .build();

  console.log('Built options:', options);

  const csv = 'id,name,active\n1,Test,true';
  const data = csvToJson(csv, options);
  console.log('Parsed data:', data);
}

// =============================================================================
// Main Execution
// =============================================================================

async function main(): Promise<void> {
  console.log('jtcsv TypeScript Examples');
  console.log('='.repeat(60));

  typedJsonToCsv();
  typedCsvToJson();
  genericTypeHelperExample();
  await typedNdjson();
  typedTsv();
  typedErrorHandling();
  discriminatedUnionExample();
  await typedStreaming();
  builderPatternExample();

  console.log('\n' + '='.repeat(60));
  console.log('All TypeScript examples completed.');
}

main().catch(console.error);
