/**
 * Vue 3 plugin for jtcsv
 * Provides jtcsv integration for Vue applications
 * @module plugins/vue
 */

import type { App, Plugin } from 'vue';
import type { CsvToJsonOptions, JsonToCsvOptions } from '../../src/types';
import { csvToJson, jsonToCsv } from 'jtcsv';

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
 * Vue plugin implementation
 */
const jtcsvVuePlugin: Plugin = {
  install(app: App, options: VuePluginOptions = {}) {
    const {
      async = true,
      workers = false,
      propertyName = '$jtcsv',
      provideComposable = true
    } = options;

    // Use statically imported jtcsv functions
    const jtcsv: JtcsvVueInstance = {
      // Core functions
      csvToJson: (csv: string, opts?: CsvToJsonOptions) => {
        return csvToJson(csv, opts);
      },
      jsonToCsv: (data: any, opts?: JsonToCsvOptions) => {
        return jsonToCsv(data, opts);
      },

      // Async versions if enabled
      ...(async ? {
        csvToJsonAsync: async (csv: string, opts?: CsvToJsonOptions) => {
          return csvToJson(csv, opts);
        },
        jsonToCsvAsync: async (data: any, opts?: JsonToCsvOptions) => {
          return jsonToCsv(data, opts);
        }
      } : {}),

      // Worker support if enabled
      ...(workers ? {
        createWorkerPool: (size?: number) => {
          const { WorkerPool } = require('../../src/workers/worker-pool');
          return new WorkerPool(size);
        }
      } : {})
    };

    // Provide global property
    app.config.globalProperties[propertyName] = jtcsv;

    // Provide via app.provide for Composition API
    if (provideComposable) {
      app.provide('jtcsv', jtcsv);
    }

    // Also add to prototype for Options API compatibility
    if (!(propertyName in app.config.globalProperties)) {
      app.config.globalProperties[propertyName] = jtcsv;
    }
  }
};

/**
 * Composition API composable for using jtcsv
 * @returns JTCSV instance
 */
export function useJtcsv(): JtcsvVueInstance {
  const instance = inject('jtcsv') as JtcsvVueInstance;
  if (!instance) {
    throw new Error(
      'JTCSV plugin not installed. Make sure to call app.use(jtcsvVuePlugin) in your Vue app.'
    );
  }
  return instance;
}

/**
 * Composition API composable for async jtcsv operations
 * @returns JTCSV instance with guaranteed async methods
 */
export function useJtcsvAsync(): JtcsvVueInstance & {
  csvToJson: (csv: string, opts?: CsvToJsonOptions) => Promise<any>;
  jsonToCsv: (data: any, opts?: JsonToCsvOptions) => Promise<string>;
} {
  const jtcsv = useJtcsv();
  
  return {
    ...jtcsv,
    // Ensure async methods are available
    csvToJson: (jtcsv.csvToJsonAsync || jtcsv.csvToJson) as (csv: string, opts?: CsvToJsonOptions) => Promise<any>,
    jsonToCsv: (jtcsv.jsonToCsvAsync || jtcsv.jsonToCsv) as (data: any, opts?: JsonToCsvOptions) => Promise<string>,
  };
}

// Re-export core types for convenience
export type { CsvToJsonOptions, JsonToCsvOptions };

// Default export
export default jtcsvVuePlugin;