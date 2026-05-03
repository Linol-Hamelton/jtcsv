/**
 * TypeScript definitions for @jtcsv/vue
 * Vue 3 plugin for jtcsv - CSV/JSON conversion in Vue components
 * 
 * @version 1.0.0
 * @date 2026-02-26
 */

import type { App, Plugin, InjectionKey } from 'vue';
import type { CsvToJsonOptions, JsonToCsvOptions } from 'jtcsv';

/**
 * Vue plugin options
 */
export interface VuePluginOptions {
  /** Whether to enable async functions (default: true) */
  async?: boolean;
  /** Whether to enable worker support (default: false) */
  workers?: boolean;
  /** Global property name (default: '$jtcsv') */
  propertyName?: string;
  /** Provide composable? (default: true) */
  provideComposable?: boolean;
}

/**
 * JTCSV instance exposed to Vue
 */
export interface JtcsvVueInstance {
  // Core functions
  csvToJson: (csv: string, opts?: CsvToJsonOptions) => any;
  jsonToCsv: (data: any, opts?: JsonToCsvOptions) => string;
  
  // Async versions if enabled
  csvToJsonAsync?: (csv: string, opts?: CsvToJsonOptions) => Promise<any>;
  jsonToCsvAsync?: (data: any, opts?: JsonToCsvOptions) => Promise<string>;
  
  // Worker support if enabled
  createWorkerPool?: (size?: number) => any;
}

/**
 * Injection key for jtcsv
 */
export const jtcsvKey: InjectionKey<JtcsvVueInstance> = Symbol('jtcsv');

/**
 * Vue plugin for jtcsv
 */
export function JtcsvVuePlugin(options?: VuePluginOptions): Plugin;

/**
 * Composition API composable for using jtcsv
 * @returns JTCSV instance
 */
export function useJtcsv(): JtcsvVueInstance;

/**
 * Composition API composable for async jtcsv operations
 * @returns JTCSV instance with guaranteed async methods
 */
export function useJtcsvAsync(): JtcsvVueInstance & {
  csvToJson: (csv: string, opts?: CsvToJsonOptions) => Promise<any>;
  jsonToCsv: (data: any, opts?: JsonToCsvOptions) => Promise<string>;
};

/**
 * Vue directive for CSV file upload
 */
export interface CsvUploadDirectiveBinding {
  /** Callback when CSV is loaded */
  onLoad?: (data: any[], file: File) => void;
  /** Callback on error */
  onError?: (error: Error, file: File) => void;
  /** CSV parsing options */
  options?: CsvToJsonOptions;
}

/**
 * CSV Upload directive for Vue 3
 * Usage: &lt;input type="file" v-csv-upload="onLoad" /&gt;
 */
export interface CsvUploadDirective {
  mounted?: (el: HTMLInputElement, binding: CsvUploadDirectiveBinding) => void;
  updated?: (el: HTMLInputElement, binding: CsvUploadDirectiveBinding) => void;
  unmounted?: (el: HTMLInputElement, binding: CsvUploadDirectiveBinding) => void;
}

export const csvUpload: CsvUploadDirective;

// Re-export core types
export type { CsvToJsonOptions, JsonToCsvOptions };

// Default export
export default JtcsvVuePlugin;
