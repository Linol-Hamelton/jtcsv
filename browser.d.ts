import type { JsonToCsvOptions, CsvToJsonOptions } from './index';

export interface ErrorDetails {
  [key: string]: any;
  hint?: string;
  docs?: string;
  context?: any;
}

export class JTCSVError extends Error {
  code: string;
  details: ErrorDetails;
  hint?: string;
  docs?: string;
  context?: any;
  constructor(message: string, code?: string, details?: ErrorDetails);
}

export class ValidationError extends JTCSVError {
  constructor(message: string, details?: ErrorDetails);
}

export class SecurityError extends JTCSVError {
  constructor(message: string, details?: ErrorDetails);
}

export class FileSystemError extends JTCSVError {
  constructor(message: string, originalError?: Error, details?: ErrorDetails);
}

export class ParsingError extends JTCSVError {
  lineNumber?: number;
  constructor(message: string, lineNumber?: number, details?: ErrorDetails);
}

export class LimitError extends JTCSVError {
  limit: any;
  actual: any;
  constructor(message: string, limit: any, actual: any, details?: ErrorDetails);
}

export class ConfigurationError extends JTCSVError {
  constructor(message: string, details?: ErrorDetails);
}

export const ERROR_CODES: {
  JTCSV_ERROR: string;
  VALIDATION_ERROR: string;
  SECURITY_ERROR: string;
  FILE_SYSTEM_ERROR: string;
  PARSING_ERROR: string;
  LIMIT_ERROR: string;
  CONFIGURATION_ERROR: string;
  INVALID_INPUT: string;
  SECURITY_VIOLATION: string;
  FILE_NOT_FOUND: string;
  PARSE_FAILED: string;
  SIZE_LIMIT: string;
  INVALID_CONFIG: string;
  UNKNOWN_ERROR: string;
};

export function jsonToCsv(data: any[], options?: JsonToCsvOptions): string;
export function jsonToCsvAsync(data: any[], options?: JsonToCsvOptions): Promise<string>;
export function preprocessData<T extends Record<string, any>>(data: T[]): Record<string, any>[];
export function deepUnwrap(value: any, depth?: number, maxDepth?: number): any;

export function csvToJson(csv: string, options?: CsvToJsonOptions): any[];
export function csvToJsonAsync(csv: string, options?: CsvToJsonOptions): Promise<any[]>;
export function csvToJsonIterator(
  csv: string | File | Blob,
  options?: CsvToJsonOptions
): AsyncGenerator<any>;

export function parseCsvFile(file: File, options?: CsvToJsonOptions): Promise<any[]>;
export function parseCsvFileAsync(file: File, options?: CsvToJsonOptions): Promise<any[]>;
export function parseCsvFileStream(file: File, options?: CsvToJsonOptions): AsyncIterator<any>;

export function jsonToCsvStream(options?: JsonToCsvOptions): ReadableStream;
export function jsonToNdjsonStream(options?: any): ReadableStream;
export function csvToJsonStream(options?: CsvToJsonOptions): ReadableStream;

export function autoDetectDelimiter(csv: string, options?: { candidates?: string[] }): string;
export function autoDetectDelimiterAsync(csv: string): Promise<string>;

export function downloadAsCsv(
  data: any[],
  filename?: string,
  options?: JsonToCsvOptions
): void;
export function downloadAsCsvAsync(
  data: any[],
  filename?: string,
  options?: JsonToCsvOptions
): Promise<void>;

export function createWorkerPool(options?: any): any;
export function parseCSVWithWorker(
  csvInput: string | File | ArrayBuffer | ArrayBufferView,
  options?: CsvToJsonOptions,
  onProgress?: (progress: number) => void
): Promise<any[]>;
export function createWorkerPoolLazy(options?: any): Promise<any>;
export function parseCSVWithWorkerLazy(
  csvInput: string | File | ArrayBuffer | ArrayBufferView,
  options?: CsvToJsonOptions,
  onProgress?: (progress: number) => void
): Promise<any[]>;

declare const jtcsv: {
  jsonToCsv: typeof jsonToCsv;
  preprocessData: typeof preprocessData;
  downloadAsCsv: typeof downloadAsCsv;
  deepUnwrap: typeof deepUnwrap;
  csvToJson: typeof csvToJson;
  csvToJsonIterator: typeof csvToJsonIterator;
  parseCsvFile: typeof parseCsvFile;
  parseCsvFileStream: typeof parseCsvFileStream;
  jsonToCsvStream: typeof jsonToCsvStream;
  jsonToNdjsonStream: typeof jsonToNdjsonStream;
  csvToJsonStream: typeof csvToJsonStream;
  autoDetectDelimiter: typeof autoDetectDelimiter;
  createWorkerPool: typeof createWorkerPool;
  parseCSVWithWorker: typeof parseCSVWithWorker;
  createWorkerPoolLazy: typeof createWorkerPoolLazy;
  parseCSVWithWorkerLazy: typeof parseCSVWithWorkerLazy;
  jsonToCsvAsync: typeof jsonToCsvAsync;
  csvToJsonAsync: typeof csvToJsonAsync;
  parseCsvFileAsync: typeof parseCsvFileAsync;
  autoDetectDelimiterAsync: typeof autoDetectDelimiterAsync;
  downloadAsCsvAsync: typeof downloadAsCsvAsync;
  ValidationError: typeof ValidationError;
  SecurityError: typeof SecurityError;
  FileSystemError: typeof FileSystemError;
  ParsingError: typeof ParsingError;
  LimitError: typeof LimitError;
  ConfigurationError: typeof ConfigurationError;
  ERROR_CODES: typeof ERROR_CODES;
  version: string;
};

export default jtcsv;
