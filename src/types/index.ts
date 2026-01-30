/**
 * TypeScript интерфейсы для проекта jtcsv
 */

// Базовые типы
export type AnyObject = Record<string, any>;
export type AnyArray = any[];

// JSON to CSV интерфейсы
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
  /** Whether to flatten nested objects into dot notation keys */
  flatten?: boolean;
  /** Separator for flattened keys (e.g., 'user.name' with '.') */
  flattenSeparator?: string;
  /** Maximum depth for flattening nested objects */
  flattenMaxDepth?: number;
  /** How to handle arrays ('stringify', 'join', 'expand') */
  arrayHandling?: 'stringify' | 'join' | 'expand';
}

export interface SaveAsCsvOptions extends JsonToCsvOptions {
  /** Validate file path security (default: true) */
  validatePath?: boolean;
}

// CSV to JSON интерфейсы
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
  /** JSON schema for validation and formatting */
  schema?: Record<string, any>;
  /** Custom transform function for each row */
  transform?: (row: Record<string, any>) => Record<string, any>;
  /** Use delimiter cache for auto-detection (default: true) */
  useCache?: boolean;
  /** Custom delimiter cache instance */
  cache?: any; // DelimiterCache type will be imported later
  /** Hooks for custom processing */
  hooks?: {
    beforeConvert?: (csv: string, options: CsvToJsonOptions) => string;
    afterConvert?: (result: any[], options: CsvToJsonOptions) => any[];
    onError?: (error: Error, csv: string, options: CsvToJsonOptions) => void;
  };
  /** Prevent CSV injection attacks by escaping formulas (default: true) */
  preventCsvInjection?: boolean;
  /** Ensure RFC 4180 compliance (proper quoting, line endings) (default: true) */
  rfc4180Compliant?: boolean;
  /** Warn about extra fields not in headers (default: false) */
  warnExtraFields?: boolean;
}

// JSON save интерфейсы
export interface SaveAsJsonOptions {
  /** Format JSON with indentation (default: false) */
  prettyPrint?: boolean;
  /** Maximum file size in bytes (default: 10MB = 10485760) */
  maxSize?: number;
}

// Streaming интерфейсы
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

// NDJSON интерфейсы
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
  /** Rename column headers { oldKey: newKey } */
  renameMap?: Record<string, string>;
  /** Maximum number of records to process */
  maxRecords?: number;
  /** Prevent CSV injection attacks by escaping formulas (default: true) */
  preventCsvInjection?: boolean;
  /** Ensure RFC 4180 compliance (proper quoting, line endings) (default: true) */
  rfc4180Compliant?: boolean;
  /** JSON schema for validation and formatting */
  schema?: Record<string, any>;
  /** Custom transform function for each row */
  transform?: (row: Record<string, any>) => Record<string, any>;
  /** Add UTF-8 BOM for Excel compatibility (default: true) */
  addBOM?: boolean;
}

// TSV интерфейсы
export interface TsvOptions {
  /** Whether TSV has headers row (default: true) */
  hasHeaders?: boolean;
  /** Trim whitespace from values (default: true) */
  trim?: boolean;
  /** Parse numeric values (default: false) */
  parseNumbers?: boolean;
  /** Parse boolean values (default: false) */
  parseBooleans?: boolean;
  /** Maximum number of rows to process */
  maxRows?: number;
  /** JSON schema for validation and formatting */
  schema?: Record<string, any>;
  /** Custom transform function for each row */
  transform?: (row: Record<string, any>) => Record<string, any>;
}

export interface TsvValidationResult {
  /** Whether the content is valid TSV */
  isValid: boolean;
  /** Number of rows detected */
  rowCount: number;
  /** Number of columns (if consistent) */
  columnCount?: number;
  /** Error message if invalid */
  error?: string;
  /** Line number where error occurred */
  errorLine?: number;
}

export interface ValidateTsvOptions {
  /** Maximum number of rows to check */
  maxRows?: number;
  /** Whether to check for consistent column count */
  checkConsistency?: boolean;
  /** Whether to validate TSV format strictly */
  strict?: boolean;
}

// Worker интерфейсы для многопоточной обработки
export interface WorkerTask<T = any, R = any> {
  id: string;
  data: T;
  type: string;
  options?: Record<string, any>;
}

export interface WorkerResult<R = any> {
  id: string;
  result: R;
  error?: Error;
  duration: number;
}

export interface WorkerPoolStats {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

// Асинхронные интерфейсы
export interface AsyncJsonToCsvOptions extends JsonToCsvOptions {
  /** Use worker threads for processing (default: auto-detect based on data size) */
  useWorkers?: boolean;
  /** Number of worker threads to use (default: CPU cores - 1) */
  workerCount?: number;
  /** Size of data chunks for parallel processing */
  chunkSize?: number;
  /** Progress callback function */
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void;
}

export interface AsyncCsvToJsonOptions extends CsvToJsonOptions {
  /** Use worker threads for processing (default: auto-detect based on data size) */
  useWorkers?: boolean;
  /** Number of worker threads to use (default: CPU cores - 1) */
  workerCount?: number;
  /** Size of data chunks for parallel processing */
  chunkSize?: number;
  /** Progress callback function */
  onProgress?: (progress: { processed: number; total: number; percentage: number }) => void;
}

// Утилитарные типы
export type PreprocessOptions = {
  flatten?: boolean;
  flattenSeparator?: string;
  flattenMaxDepth?: number;
  arrayHandling?: 'stringify' | 'join' | 'expand';
};

export type DeepUnwrapOptions = {
  maxDepth?: number;
  preserveArrays?: boolean;
};

// Экспорт всех интерфейсов
// Примечание: Типы ошибок экспортируются из errors.ts