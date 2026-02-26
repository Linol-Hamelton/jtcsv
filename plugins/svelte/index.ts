/**
 * Svelte utilities for jtcsv
 * Provides stores, actions, and utilities for CSV/JSON conversion in Svelte applications
 * @module plugins/svelte
 */

import { writable, derived, type Writable, type Readable } from 'svelte/store';
import { csvToJson, jsonToCsv, type CsvToJsonOptions, type JsonToCsvOptions } from 'jtcsv';

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
 * Options for createCsvStore
 */
export interface CsvStoreOptions extends CsvToJsonOptions {
  /** Initial CSV string */
  initialCsv?: string;
}

/**
 * Creates a CSV store that synchronizes between CSV string and JSON array
 * @param initialCsv - Initial CSV string
 * @param options - Conversion options
 * @returns Store with methods
 */
export function createCsvStore(initialCsv: string = '', options: CsvStoreOptions = {}): CsvStore {
  const json = csvToJson(initialCsv, options);
  const csv = writable(initialCsv);
  const data = writable(json);
  const error = writable<string | null>(null);

  const updateFromCsv = (newCsv: string, newOptions: CsvToJsonOptions = {}) => {
    try {
      const newJson = csvToJson(newCsv, { ...options, ...newOptions });
      csv.set(newCsv);
      data.set(newJson);
      error.set(null);
    } catch (err: any) {
      error.set(err.message);
    }
  };

  const updateFromJson = (newJson: any[], newOptions: JsonToCsvOptions = {}) => {
    try {
      const newCsv = jsonToCsv(newJson, { ...options, ...newOptions });
      csv.set(newCsv);
      data.set(newJson);
      error.set(null);
    } catch (err: any) {
      error.set(err.message);
    }
  };

  return {
    csv: { subscribe: csv.subscribe, set: updateFromCsv },
    data: { subscribe: data.subscribe, set: updateFromJson },
    error: { subscribe: error.subscribe },
    updateFromCsv,
    updateFromJson
  };
}

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
 * Svelte action for CSV file upload
 * @param node - Input element
 * @param options - Configuration options
 */
export function csvUpload(node: HTMLInputElement, options: CsvUploadOptions = {}) {
  if (node.tagName !== 'INPUT' || (node as HTMLInputElement).type !== 'file') {
    throw new Error('csvUpload action can only be used on file input elements');
  }

  const handleChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const onLoad = options.onLoad || (() => {});
    const onError = options.onError || (() => {});
    const parseOptions = options.parseOptions || {};

    try {
      const text = await readFileAsText(file);
      const json = csvToJson(text, parseOptions);
      onLoad(json, file);
    } catch (error) {
      onError(error as Error, file);
    }
  };

  node.addEventListener('change', handleChange);

  return {
    destroy() {
      node.removeEventListener('change', handleChange);
    },
    update(newOptions: CsvUploadOptions) {
      options = newOptions;
    }
  };
}

/**
 * Utility function to read file as text
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Download CSV file from JSON data
 * @param json - JSON data
 * @param filename - Download filename
 * @param options - Conversion options
 */
export function downloadCsv(json: any[], filename: string = 'data.csv', options: JsonToCsvOptions = {}): void {
  const csv = jsonToCsv(json, options);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Fallback for older browsers
    window.open('data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
  }
}

/**
 * Reactive derived store that converts CSV to JSON
 * @param csvStore - Store containing CSV string
 * @param options - Conversion options
 * @returns Derived store with JSON data
 */
export function csvToJsonStore(csvStore: Readable<string>, options: CsvToJsonOptions = {}): Readable<any[]> {
  return derived(csvStore, ($csv: string, set: (value: any[]) => void) => {
    try {
      const json = csvToJson($csv, options);
      set(json);
    } catch (error) {
      set([]);
    }
  }, []);
}

/**
 * Reactive derived store that converts JSON to CSV
 * @param jsonStore - Store containing JSON array
 * @param options - Conversion options
 * @returns Derived store with CSV string
 */
export function jsonToCsvStore(jsonStore: Readable<any[]>, options: JsonToCsvOptions = {}): Readable<string> {
  return derived(jsonStore, ($json: any[], set: (value: string) => void) => {
    try {
      const csv = jsonToCsv($json, options);
      set(csv);
    } catch (error) {
      set('');
    }
  }, '');
}

// Export jtcsv functions for convenience
export { csvToJson, jsonToCsv };
export type { CsvToJsonOptions, JsonToCsvOptions };
