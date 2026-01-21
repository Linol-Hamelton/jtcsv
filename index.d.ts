declare module 'jtcsv' {
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
    options?: CsvToJsonOptions
  ): Record<string, any>[];

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
}
