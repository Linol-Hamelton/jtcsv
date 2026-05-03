/**
 * Nuxt plugin for jtcsv
 * Provides jtcsv integration for Nuxt applications
 * @module plugins/nuxt
 */

import type { CsvToJsonOptions, JsonToCsvOptions } from '../../src/types';

/**
 * Nuxt plugin options
 */
export interface NuxtPluginOptions {
  /** Whether to enable async functions (default: true) */
  async?: boolean;
  /** Whether to enable worker support (default: false) */
  workers?: boolean;
}

/**
 * Nuxt plugin implementation
 * This is a simplified version that works with Nuxt 3
 */
export default defineNuxtPlugin((nuxtApp: any, options: NuxtPluginOptions = {}) => {
  const { async = true, workers = false } = options;
  
  // Import jtcsv functions
  const jtcsv = {
    // Core functions
    csvToJson: (csv: string, opts?: CsvToJsonOptions) => {
      // This would be replaced with actual import in runtime
      return require('jtcsv').csvToJson(csv, opts);
    },
    jsonToCsv: (data: any, opts?: JsonToCsvOptions) => {
      return require('jtcsv').jsonToCsv(data, opts);
    },
    
    // Async versions if enabled
    ...(async ? {
      csvToJsonAsync: async (csv: string, opts?: CsvToJsonOptions) => {
        const { csvToJson } = require('jtcsv');
        return csvToJson(csv, opts);
      },
      jsonToCsvAsync: async (data: any, opts?: JsonToCsvOptions) => {
        const { jsonToCsv } = require('jtcsv');
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

  // Provide jtcsv to Nuxt app
  nuxtApp.provide('jtcsv', jtcsv);
  nuxtApp.provide('useJtcsv', () => jtcsv);
});

/**
 * Nuxt composable for using jtcsv
 */
export function useJtcsv() {
  const nuxtApp = useNuxtApp();
  return nuxtApp.$jtcsv;
}

/**
 * Nuxt composable for async jtcsv operations
 */
export function useJtcsvAsync() {
  const nuxtApp = useNuxtApp();
  const jtcsv = nuxtApp.$jtcsv as any;
  
  return {
    ...jtcsv,
    // Ensure async methods are available
    csvToJson: (jtcsv.csvToJsonAsync || jtcsv.csvToJson) as (csv: string, opts?: CsvToJsonOptions) => any,
    jsonToCsv: (jtcsv.jsonToCsvAsync || jtcsv.jsonToCsv) as (data: any, opts?: JsonToCsvOptions) => string,
  };
}

// Helper functions for Nuxt module compatibility
function defineNuxtPlugin(fn: any) {
  return fn;
}

function useNuxtApp() {
  // This would be provided by Nuxt runtime
  return { $jtcsv: {} as any };
}