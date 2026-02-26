/**
 * TypeScript definitions for @jtcsv/svelte
 * Svelte utilities for jtcsv - CSV/JSON conversion in Svelte applications
 * 
 * @version 1.0.0
 * @date 2026-02-26
 */

import type { Writable, Readable } from 'svelte/store';
import type { CsvToJsonOptions, JsonToCsvOptions } from 'jtcsv';

/**
 * Options for csvUpload action
 */
export interface CsvUploadOptions {
  /** Callback when CSV is loaded */
  onLoad?: (data: any[], file: File) => void;
  /** Callback on error */
  onError?: (error: Error, file: File) => void;
  /** CSV parsing options */
  parseOptions?: CsvToJsonOptions;
}

/**
 * Options for createCsvStore
 */
export interface CsvStoreOptions extends CsvToJsonOptions {
  /** Initial CSV string */
  initialCsv?: string;
}

/**
 * CSV Store interface
 */
export interface CsvStore {
  csv: Writable<string>;
  data: Writable<any[]>;
  error: Writable<string | null>;
  updateFromCsv: (csv: string, options?: CsvToJsonOptions) => void;
  updateFromJson: (json: any[], options?: JsonToCsvOptions) => void;
}

/**
 * Creates a CSV store that synchronizes between CSV string and JSON array
 * @param initialCsv - Initial CSV string
 * @param options - Conversion options
 * @returns Store with methods
 */
export function createCsvStore(initialCsv?: string, options?: CsvStoreOptions): CsvStore;

/**
 * Svelte action for CSV file upload
 * @param node - Input element
 * @param options - Configuration options
 */
export function csvUpload(node: HTMLInputElement, options?: CsvUploadOptions): {
  destroy?: () => void;
  update?: (newOptions: CsvUploadOptions) => void;
};

/**
 * Download CSV file from JSON data
 * @param json - JSON data
 * @param filename - Download filename
 * @param options - Conversion options
 */
export function downloadCsv(json: any[], filename?: string, options?: JsonToCsvOptions): void;

/**
 * Reactive derived store that converts CSV to JSON
 * @param csvStore - Store containing CSV string
 * @param options - Conversion options
 * @returns Derived store with JSON data
 */
export function csvToJsonStore(csvStore: Readable<string>, options?: CsvToJsonOptions): Readable<any[]>;

/**
 * Reactive derived store that converts JSON to CSV
 * @param jsonStore - Store containing JSON array
 * @param options - Conversion options
 * @returns Derived store with CSV string
 */
export function jsonToCsvStore(jsonStore: Readable<any[]>, options?: JsonToCsvOptions): Readable<string>;

// Re-export jtcsv functions
export { csvToJson, jsonToCsv } from 'jtcsv';
export type { CsvToJsonOptions, JsonToCsvOptions };
