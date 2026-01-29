declare module './index.js' {
  import { Readable, Writable, Transform } from 'stream';

  // JSON to CSV interfaces
  export interface JsonToCsvOptions {
    /** CSV delimiter (default: ';') */
    delimiter?: string;
    /** Include headers row (default: true) */
    includeHeaders?: boolean;
    /** Rename column headers { oldKey: newKey } */
    renameMap?: Record<string, string>;
    /** Template for guaranteed column order */
    template?: Record<string, any>;
    /** Maximum number of records to process (optional, no limit by default) */
    maxRecords?: number;
    /** Prevent CSV injection attacks by escaping formulas (default: true) */
    preventCsvInjection?: boolean;
    /** Ensure RFC 4180 compliance (proper quoting, line endings) (default: true) */
    rfc4180Compliant?: boolean;
    /** JSON schema for data validation and formatting */
    schema?: Record<string, any>;
  }

  export interface SaveAsCsvOptions extends JsonToCsvOptions {
    /** Validate file path security (default: true) */
    validatePath?: boolean;
  }

  // CSV to JSON interfaces
  export interface CsvToJsonOptions {
    /** CSV delimiter (default: auto-detected) */
    delimiter?: string;
    /** Auto-detect delimiter if not specified (default: true) */
    autoDetect?: boolean;
    /** Candidate delimiters for auto-detection (default: [';', ',', '\t', '|']) */
    candidates?: string[];
    /** Whether CSV has headers row (default: true) */
    hasHeaders?: boolean;
    /** Map for renaming column headers { newKey: oldKey } */
    renameMap?: Record<string, string>;
    /** Trim whitespace from values (default: true) */
    trim?: boolean;
    /** Parse numeric values (default: false) */
    parseNumbers?: boolean;
    /** Parse boolean values (default: false) */
    parseBooleans?: boolean;
    /** Maximum number of rows to process (optional, no limit by default) */
    maxRows?: number;
    /** Enable fast-path parsing (default: true) */
    useFastPath?: boolean;
    /** Fast-path output mode (default: 'objects') */
    fastPathMode?: 'objects' | 'compact' | 'stream';
  }

  // JSON save interfaces
  export interface SaveAsJsonOptions {
    /** Format JSON with indentation (default: false) */
    prettyPrint?: boolean;
    /** Maximum file size in bytes (default: 10MB = 10485760) */
    maxSize?: number;
  }

  // Streaming interfaces
  export interface JsonToCsvStreamOptions extends JsonToCsvOptions {
    /** Custom transform function for each row */
    transform?: (row: Record<string, any>) => Record<string, any>;
    /** JSON schema for validation and formatting */
    schema?: Record<string, any>;
    /** Add UTF-8 BOM for Excel compatibility (default: true) */
    addBOM?: boolean;
  }

  export interface CsvToJsonStreamOptions extends CsvToJsonOptions {
    /** Custom transform function for each row */
    transform?: (row: Record<string, any>) => Record<string, any>;
    /** JSON schema for validation and formatting */
    schema?: Record<string, any>;
  }

  // NDJSON interfaces
  export interface NdjsonOptions {
    /** Buffer size for streaming (default: 64KB) */
    bufferSize?: number;
    /** Maximum line length (default: 10MB) */
    maxLineLength?: number;
    /** Error handler callback */
    onError?: (error: Error, line: string, lineNumber: number) => void;
    /** JSON stringify replacer function */
    replacer?: (key: string, value: any) => any;
    /** JSON stringify space (indentation) */
    space?: number | string;
    /** Filter function for rows */
    filter?: (obj: Record<string, any>, index: number) => boolean;
    /** Transform function for rows */
    transform?: (obj: Record<string, any>, index: number) => any;
  }

  export interface NdjsonToCsvStreamOptions {
    /** Delimiter for CSV output (default: ',') */
    delimiter?: string;
    /** Include headers row (default: true) */
    includeHeaders?: boolean;
  }

  export interface CsvToNdjsonStreamOptions {
    /** Delimiter for CSV input (default: ',') */
    delimiter?: string;
    /** Whether CSV has headers (default: true) */
    hasHeaders?: boolean;
  }

  export interface NdjsonStats {
    /** Total lines in NDJSON */
    totalLines: number;
    /** Valid JSON lines */
    validLines: number;
    /** Lines with JSON parsing errors */
    errorLines: number;
    /** Total bytes */
    totalBytes: number;
    /** Success rate percentage */
    successRate: number;
    /** Array of parsing errors */
    errors: Array<{
      line: number;
      error: string;
      content: string;
    }>;
  }

  // TSV interfaces
  export interface TsvOptions extends JsonToCsvOptions, CsvToJsonOptions {
    /** Always use tab as delimiter for TSV */
    delimiter?: '\t';
    /** Disable auto-detection for TSV */
    autoDetect?: false;
  }

  export interface ValidateTsvOptions {
    /** Require consistent column count (default: true) */
    requireConsistentColumns?: boolean;
    /** Disallow empty fields (default: false) */
    disallowEmptyFields?: boolean;
  }

  export interface TsvValidationResult {
    /** Whether TSV is valid */
    valid: boolean;
    /** Error message if invalid */
    error?: string;
    /** Validation statistics */
    stats: {
      /** Total lines */
      totalLines: number;
      /** Total columns in first line */
      totalColumns: number;
      /** Minimum columns across all lines */
      minColumns: number;
      /** Maximum columns across all lines */
      maxColumns: number;
      /** Whether all lines have same column count */
      consistentColumns: boolean;
    };
    /** Array of validation errors */
    errors?: Array<{
      line?: number;
      error: string;
      details?: any;
      fields?: number[];
    }>;
  }

  // Error classes
  export class JtcsvError extends Error {
    code: string;
    constructor(message: string, code?: string);
  }

  export class ValidationError extends JtcsvError {
    constructor(message: string);
  }

  export class SecurityError extends JtcsvError {
    constructor(message: string);
  }

  export class FileSystemError extends JtcsvError {
    originalError?: Error;
    constructor(message: string, originalError?: Error);
  }

  export class ParsingError extends JtcsvError {
    lineNumber?: number;
    column?: number;
    constructor(message: string, lineNumber?: number, column?: number);
  }

  export class LimitError extends JtcsvError {
    limit: number;
    actual: number;
    constructor(message: string, limit: number, actual: number);
  }

  export class ConfigurationError extends JtcsvError {
    constructor(message: string);
  }

  // Utility functions
  export function createErrorMessage(type: string, details: string): string;
  export function handleError(error: Error, context?: Record<string, any>): void;
  export function safeExecute<T>(
    fn: () => Promise<T>,
    errorType: string,
    context?: Record<string, any>
  ): Promise<T>;
  export function safeExecute<T>(
    fn: () => T,
    errorType: string,
    context?: Record<string, any>
  ): T;

  /**
   * Convert JSON array to CSV string
   * @param data Array of objects to convert
   * @param options Conversion options
   * @returns CSV string
   * @throws {ValidationError} If data is not an array
   * @throws {LimitError} If record limit exceeded
   * @throws {ConfigurationError} If options are invalid
   */
  export function jsonToCsv<T extends Record<string, any>>(
    data: T[], 
    options?: JsonToCsvOptions
  ): string;

  /**
   * Preprocess data by unwrapping nested objects and arrays
   * @param data Input data array
   * @returns Processed data with flattened structure
   */
  export function preprocessData<T extends Record<string, any>>(
    data: T[]
  ): Record<string, any>[];

  /**
   * Save JSON data as CSV file with security validation
   * @param data Array of objects to convert
   * @param filePath Output file path (must end with .csv)
   * @param options Conversion and security options
   * @returns Promise that resolves when file is saved
   * @throws {ValidationError} If file path is invalid
   * @throws {SecurityError} If directory traversal detected
   * @throws {FileSystemError} If file system operation fails
   */
  export function saveAsCsv<T extends Record<string, any>>(
    data: T[], 
    filePath: string, 
    options?: SaveAsCsvOptions
  ): Promise<void>;

  /**
   * Deeply unwrap values (internal utility)
   * @param value Value to unwrap
   * @param depth Current depth
   * @param maxDepth Maximum depth (default: 10)
   * @returns Unwrapped value
   */
  export function deepUnwrap(
    value: any, 
    depth?: number, 
    maxDepth?: number
  ): any;

  /**
   * Convert CSV string to JSON array
   * @param csv CSV string to convert
   * @param options Conversion options
   * @returns JSON array
   * @throws {ValidationError} If input is not a string
   * @throws {ParsingError} If CSV parsing fails
   * @throws {LimitError} If row limit exceeded
   */
  export function csvToJson(
    csv: string,
    options: CsvToJsonOptions & { fastPathMode: 'stream' }
  ): AsyncGenerator<Record<string, any> | any[]>;

  export function csvToJson(
    csv: string,
    options: CsvToJsonOptions & { fastPathMode: 'compact' }
  ): any[][];

  export function csvToJson(
    csv: string,
    options?: CsvToJsonOptions
  ): Record<string, any>[];

  /**
   * Convert CSV string to JSON rows as async iterator
   * @param csv CSV string to convert
   * @param options Conversion options
   * @returns Async generator yielding rows
   */
  export function csvToJsonIterator(
    csv: string,
    options?: CsvToJsonOptions
  ): AsyncGenerator<Record<string, any> | any[]>;

  /**
   * Read CSV file and convert it to JSON array
   * @param filePath Path to CSV file
   * @param options Conversion options
   * @returns Promise that resolves to JSON array
   * @throws {ValidationError} If file path is invalid
   * @throws {SecurityError} If directory traversal detected
   * @throws {FileSystemError} If file not found or unreadable
   */
  export function readCsvAsJson(
    filePath: string, 
    options?: CsvToJsonOptions
  ): Promise<Record<string, any>[]>;

  /**
   * Synchronously read CSV file and convert it to JSON array
   * @param filePath Path to CSV file
   * @param options Conversion options
   * @returns JSON array
   * @throws {ValidationError} If file path is invalid
   * @throws {SecurityError} If directory traversal detected
   * @throws {FileSystemError} If file not found or unreadable
   */
  export function readCsvAsJsonSync(
    filePath: string, 
    options?: CsvToJsonOptions
  ): Record<string, any>[];

  /**
   * Auto-detect CSV delimiter from content
   * @param csv CSV content string
   * @param candidates Candidate delimiters to test (default: [';', ',', '\t', '|'])
   * @returns Detected delimiter
   */
  export function autoDetectDelimiter(
    csv: string,
    candidates?: string[]
  ): string;

  /**
   * Save data as JSON file with security validation
   * @param data Data to save as JSON
   * @param filePath Output file path (must end with .json)
   * @param options Save options
   * @returns Promise that resolves when file is saved
   * @throws {ValidationError} If file path is invalid or data cannot be stringified
   * @throws {SecurityError} If directory traversal detected
   * @throws {FileSystemError} If file system operation fails
   * @throws {LimitError} If file size exceeds limit
   */
  export function saveAsJson(
    data: any, 
    filePath: string, 
    options?: SaveAsJsonOptions
  ): Promise<void>;

  /**
   * Synchronously save data as JSON file with security validation
   * @param data Data to save as JSON
   * @param filePath Output file path (must end with .json)
   * @param options Save options
   * @returns Path to saved file
   * @throws {ValidationError} If file path is invalid or data cannot be stringified
   * @throws {SecurityError} If directory traversal detected
   * @throws {FileSystemError} If file system operation fails
   * @throws {LimitError} If file size exceeds limit
   */
  export function saveAsJsonSync(
    data: any, 
    filePath: string, 
    options?: SaveAsJsonOptions
  ): string;

  /**
   * Validate file path to prevent path traversal attacks (internal)
   * @param filePath File path to validate
   * @returns Validated absolute path
   * @throws {ValidationError} If path is invalid
   * @throws {SecurityError} If path traversal detected
   */
  export function validateFilePath(filePath: string): string;

  // Streaming JSON to CSV functions

  /**
   * Creates a transform stream that converts JSON objects to CSV rows
   * @param options Configuration options
   * @returns Transform stream
   */
  export function createJsonToCsvStream(
    options?: JsonToCsvStreamOptions
  ): Transform;

  /**
   * Converts a readable stream of JSON objects to CSV and writes to a writable stream
   * @param inputStream Readable stream of JSON objects
   * @param outputStream Writable stream for CSV output
   * @param options Configuration options
   * @returns Promise that resolves when streaming is complete
   */
  export function streamJsonToCsv(
    inputStream: Readable,
    outputStream: Writable,
    options?: JsonToCsvStreamOptions
  ): Promise<void>;

  /**
   * Converts JSON to CSV and saves it to a file using streaming
   * @param inputStream Readable stream of JSON objects
   * @param filePath Path to save the CSV file
   * @param options Configuration options
   * @returns Promise that resolves when file is saved
   */
  export function saveJsonStreamAsCsv(
    inputStream: Readable,
    filePath: string,
    options?: JsonToCsvStreamOptions
  ): Promise<void>;

  /**
   * Creates a readable stream from an array of JSON objects
   * @param data Array of JSON objects
   * @returns Readable stream
   */
  export function createJsonReadableStream(
    data: Record<string, any>[]
  ): Readable;

  /**
   * Creates a writable stream that collects CSV data
   * @returns Writable stream that collects data
   */
  export function createCsvCollectorStream(): Writable;

  // Streaming CSV to JSON functions

  /**
   * Creates a transform stream that converts CSV chunks to JSON objects
   * @param options Configuration options
   * @returns Transform stream
   */
  export function createCsvToJsonStream(
    options?: CsvToJsonStreamOptions
  ): Transform;

  /**
   * Converts a readable stream of CSV text to JSON objects
   * @param inputStream Readable stream of CSV text
   * @param outputStream Writable stream for JSON objects
   * @param options Configuration options
   * @returns Promise that resolves when streaming is complete
   */
  export function streamCsvToJson(
    inputStream: Readable,
    outputStream: Writable,
    options?: CsvToJsonStreamOptions
  ): Promise<void>;

  /**
   * Reads CSV file and converts it to JSON using streaming
   * @param filePath Path to CSV file
   * @param options Configuration options
   * @returns Readable stream of JSON objects
   */
  export function createCsvFileToJsonStream(
    filePath: string,
    options?: CsvToJsonStreamOptions
  ): Promise<Readable>;

  /**
   * Creates a writable stream that collects JSON objects into an array
   * @returns Writable stream that collects data
   */
  export function createJsonCollectorStream(): Writable;

  // NDJSON format support

  /**
   * Convert JSON array to NDJSON string
   * @param data Array of objects to convert
   * @param options NDJSON options
   * @returns NDJSON string
   */
  export function jsonToNdjson<T extends Record<string, any>>(
    data: T[],
    options?: NdjsonOptions
  ): string;

  /**
   * Convert NDJSON string to JSON array
   * @param ndjsonString NDJSON string
   * @param options NDJSON options
   * @returns JSON array
   */
  export function ndjsonToJson(
    ndjsonString: string,
    options?: NdjsonOptions
  ): Record<string, any>[];

  /**
   * Parse NDJSON stream as async iterator
   * @param input ReadableStream or string input
   * @param options NDJSON options
   * @returns Async generator of JSON objects
   */
  export function parseNdjsonStream(
    input: ReadableStream | string,
    options?: NdjsonOptions
  ): AsyncGenerator<Record<string, any>>;

  /**
   * Create TransformStream for converting NDJSON to CSV
   * @param options Conversion options
   * @returns TransformStream
   */
  export function createNdjsonToCsvStream(
    options?: NdjsonToCsvStreamOptions
  ): TransformStream;

  /**
   * Create TransformStream for converting CSV to NDJSON
   * @param options Conversion options
   * @returns TransformStream
   */
  export function createCsvToNdjsonStream(
    options?: CsvToNdjsonStreamOptions
  ): TransformStream;

  /**
   * Get statistics for NDJSON data
   * @param input NDJSON string or ReadableStream
   * @returns Promise with NDJSON statistics
   */
  export function getNdjsonStats(
    input: string | ReadableStream
  ): Promise<NdjsonStats>;

  // TSV format support

  /**
   * Convert JSON array to TSV string
   * @param data Array of objects to convert
   * @param options TSV options
   * @returns TSV string
   */
  export function jsonToTsv<T extends Record<string, any>>(
    data: T[],
    options?: TsvOptions
  ): string;

  /**
   * Convert TSV string to JSON array
   * @param tsvString TSV string
   * @param options TSV options
   * @returns JSON array
   */
  export function tsvToJson(
    tsvString: string,
    options?: TsvOptions
  ): Record<string, any>[];

  /**
   * Check if string is likely TSV format
   * @param sample Sample data string
   * @returns True if likely TSV format
   */
  export function isTsv(sample: string): boolean;

  /**
   * Validate TSV string structure
   * @param tsvString TSV string to validate
   * @param options Validation options
   * @returns Validation result
   */
  export function validateTsv(
    tsvString: string,
    options?: ValidateTsvOptions
  ): TsvValidationResult;

  /**
   * Read TSV file and convert to JSON array
   * @param filePath Path to TSV file
   * @param options TSV options
   * @returns Promise with JSON array
   */
  export function readTsvAsJson(
    filePath: string,
    options?: TsvOptions
  ): Promise<Record<string, any>[]>;

  /**
   * Synchronously read TSV file and convert to JSON array
   * @param filePath Path to TSV file
   * @param options TSV options
   * @returns JSON array
   */
  export function readTsvAsJsonSync(
    filePath: string,
    options?: TsvOptions
  ): Record<string, any>[];

  /**
   * Save JSON data as TSV file
   * @param data Array of objects to save
   * @param filePath Output file path
   * @param options TSV options
   * @returns Promise that resolves when file is saved
   */
  export function saveAsTsv<T extends Record<string, any>>(
    data: T[],
    filePath: string,
    options?: TsvOptions
  ): Promise<void>;

  /**
   * Synchronously save JSON data as TSV file
   * @param data Array of objects to save
   * @param filePath Output file path
   * @param options TSV options
   */
  export function saveAsTsvSync<T extends Record<string, any>>(
    data: T[],
    filePath: string,
    options?: TsvOptions
  ): void;

  /**
   * Create TransformStream for converting JSON to TSV
   * @param options TSV options
   * @returns TransformStream
   */
  export function createJsonToTsvStream(
    options?: TsvOptions
  ): TransformStream;

  /**
   * Create TransformStream for converting TSV to JSON
   * @param options TSV options
   * @returns TransformStream
   */
  export function createTsvToJsonStream(
    options?: TsvOptions
  ): TransformStream;
}
