/**
 * Error Handling Examples for jtcsv
 *
 * This file demonstrates proper error handling patterns
 * using jtcsv's typed error classes.
 */

import {
  csvToJson,
  jsonToCsv,
  saveAsCsv,
  readCsvAsJson,
  // Error classes
  JtcsvError,
  ValidationError,
  SecurityError,
  ParsingError,
  FileSystemError,
  LimitError,
  ConfigurationError,
  CsvToJsonOptions,
  JsonToCsvOptions,
  SaveAsCsvOptions
} from 'jtcsv';

// =============================================================================
// Example 1: Basic Error Handling
// =============================================================================

function basicErrorHandling(): void {
  console.log('\n=== Basic Error Handling ===\n');

  // Invalid input type
  try {
    csvToJson(null as any);
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      console.log('ValidationError caught:', error.message);
      console.log('Error code:', error.code);
    }
  }

  // Malformed CSV
  const malformedCsv = 'name,age\n"unclosed quote,25';
  try {
    csvToJson(malformedCsv);
  } catch (error: unknown) {
    if (error instanceof ParsingError) {
      console.log('ParsingError caught:', error.message);
      console.log('Line number:', (error as any).lineNumber);
    }
  }
}

// =============================================================================
// Example 2: Comprehensive Error Handling with Type Checks
// =============================================================================

async function comprehensiveErrorHandling(): Promise<void> {
  console.log('\n=== Comprehensive Error Handling ===\n');

  const operations = [
    {
      name: 'Parse invalid CSV',
      action: () => csvToJson(12345 as any) // Not a string
    },
    {
      name: 'Convert non-array to CSV',
      action: () => jsonToCsv('not an array' as any)
    },
    {
      name: 'Read non-existent file',
      action: async () => await readCsvAsJson('./non-existent-file.csv')
    },
    {
      name: 'Exceed row limit',
      action: () => {
        const csv = 'a,b\n' + '1,2\n'.repeat(100);
        return csvToJson(csv, { maxRows: 5 });
      }
    },
    {
      name: 'Path traversal attempt',
      action: async () => await saveAsCsv([], '../../../etc/passwd.csv')
    }
  ];

  for (const op of operations) {
    try {
      await op.action();
      console.log(`${op.name}: Success (unexpected)`);
    } catch (error) {
      const errorType = getErrorTypeName(error as Error);
      console.log(`${op.name}: ${errorType} - ${(error as Error).message}`);
    }
  }
}

function getErrorTypeName(error: Error): string {
  if (error instanceof ValidationError) {
    return 'ValidationError';
  }
  if (error instanceof SecurityError) {
    return 'SecurityError';
  }
  if (error instanceof ParsingError) {
    return 'ParsingError';
  }
  if (error instanceof FileSystemError) {
    return 'FileSystemError';
  }
  if (error instanceof LimitError) {
    return 'LimitError';
  }
  if (error instanceof ConfigurationError) {
    return 'ConfigurationError';
  }
  if (error instanceof JtcsvError) {
    return 'JtcsvError';
  }
  return 'UnknownError';
}

// =============================================================================
// Example 3: Error Recovery Strategies
// =============================================================================

function errorRecoveryStrategies(): void {
  console.log('\n=== Error Recovery Strategies ===\n');

  // Strategy 1: Fallback to default delimiter
  function parseWithFallback(csv: string): any[] {
    const delimiters = [',', ';', '\t', '|'];

    for (const delimiter of delimiters) {
      try {
        const result = csvToJson(csv, {
          delimiter,
          autoDetect: false
        });
        console.log(`Successfully parsed with delimiter: "${delimiter}"`);
        return result;
      } catch (error) {
        console.log(`Failed with delimiter "${delimiter}": ${(error as Error).message}`);
      }
    }
    throw new Error('Could not parse CSV with any known delimiter');
  }

  const testCsv = 'name|age|city\nJohn|25|NYC\nJane|30|LA';
  const result = parseWithFallback(testCsv);
  console.log('Result:', result);
}

// =============================================================================
// Example 4: Batch Processing with Error Collection
// =============================================================================

async function batchProcessingWithErrorCollection(): Promise<void> {
  console.log('\n=== Batch Processing with Error Collection ===\n');

  const csvFiles = [
    { name: 'valid.csv', content: 'a,b\n1,2\n3,4' },
    { name: 'invalid.csv', content: 'a,b\n"unclosed' },
    { name: 'empty.csv', content: '' },
    { name: 'valid2.csv', content: 'x,y\n5,6' }
  ];

  const results = {
    successful: [] as Array<{ name: string; rowCount: number }>,
    failed: [] as Array<{ name: string; error: string; errorType: string }>
  };

  for (const file of csvFiles) {
    try {
      const data = csvToJson(file.content);
      results.successful.push({
        name: file.name,
        rowCount: data.length
      });
    } catch (error) {
      results.failed.push({
        name: file.name,
        error: (error as Error).message,
        errorType: getErrorTypeName(error as Error)
      });
    }
  }

  console.log('Processing Results:');
  console.log('Successful:', results.successful);
  console.log('Failed:', results.failed);
  console.log(`\nSuccess rate: ${results.successful.length}/${csvFiles.length}`);
}

// =============================================================================
// Example 5: Custom Error Handler Wrapper
// =============================================================================

interface SafeParserOptions {
  onError?: (error: Error) => void;
  defaultValue?: any[];
}

interface SafeParseResult {
  success: boolean;
  data: any[];
  error: {
    type: string;
    message: string;
    code?: string;
  } | null;
}

function createSafeParser(options: SafeParserOptions = {}) {
  const { onError, defaultValue = [] } = options;

  return function safeParse(csv: string, parseOptions: CsvToJsonOptions = {}): SafeParseResult {
    try {
      return {
        success: true,
        data: csvToJson(csv, parseOptions),
        error: null
      };
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      return {
        success: false,
        data: defaultValue,
        error: {
          type: getErrorTypeName(error as Error),
          message: (error as Error).message,
          code: (error as any).code
        }
      };
    }
  };
}

function customErrorHandlerDemo(): void {
  console.log('\n=== Custom Error Handler ===\n');

  const safeParse = createSafeParser({
    onError: (error: Error) => {
      console.log(`[Logger] Error occurred: ${error.message}`);
    },
    defaultValue: []
  });

  // Test with valid CSV
  const result1 = safeParse('a,b\n1,2');
  console.log('Valid CSV result:', result1);

  // Test with invalid CSV
  const result2 = safeParse(null as any);
  console.log('Invalid CSV result:', result2);
}

// =============================================================================
// Example 6: Async Error Handling with Retries
// =============================================================================

async function asyncWithRetries(): Promise<void> {
  console.log('\n=== Async Error Handling with Retries ===\n');

  async function readWithRetry(filePath: string, maxRetries = 3): Promise<any[]> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}: Reading ${filePath}`);
        const data = await readCsvAsJson(filePath);
        return data;
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${attempt} failed: ${(error as Error).message}`);

        if (error instanceof FileSystemError) {
          // File system errors might be transient
          await new Promise(r => setTimeout(r, 100 * attempt));
        } else if (error instanceof ValidationError) {
          // Validation errors won't resolve with retry
          throw error;
        } else if (error instanceof SecurityError) {
          // Security errors should not be retried
          throw error;
        }
      }
    }

    throw lastError;
  }

  try {
    await readWithRetry('./test-data.csv');
  } catch (error) {
    console.log(`All retries failed: ${(error as Error).message}`);
  }
}

// =============================================================================
// Example 7: Schema Validation Error Details
// =============================================================================

function schemaValidationErrors(): void {
  console.log('\n=== Schema Validation Errors ===\n');

  const schema = {
    type: 'object',
    required: ['name', 'age'],
    properties: {
      name: { type: 'string', minLength: 1 },
      age: { type: 'number', minimum: 0, maximum: 150 }
    }
  };

  const data = [
    { name: 'John', age: 25 },
    { name: '', age: 30 },          // Invalid: empty name
    { name: 'Jane', age: -5 },      // Invalid: negative age
    { name: 'Bob', age: 200 }       // Invalid: age > 150
  ];

  try {
    jsonToCsv(data, { schema });
  } catch (error: unknown) {
    if (error instanceof ValidationError) {
      console.log('Schema validation failed:');
      console.log('Message:', error.message);
    }
  }
}

// =============================================================================
// Run All Examples
// =============================================================================

async function main(): Promise<void> {
  console.log('jtcsv Error Handling Examples\n');
  console.log('='.repeat(60));

  basicErrorHandling();
  await comprehensiveErrorHandling();
  errorRecoveryStrategies();
  await batchProcessingWithErrorCollection();
  customErrorHandlerDemo();
  await asyncWithRetries();
  schemaValidationErrors();

  console.log('\n' + '='.repeat(60));
  console.log('All examples completed.');
}

main().catch(console.error);