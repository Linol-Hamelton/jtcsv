/**
 * Nuxt runtime plugin for jtcsv
 * Provides jtcsv integration at runtime
 */

import { defineNuxtPlugin } from '#app';
import * as jtcsv from 'jtcsv';
import type { CsvToJsonOptions, JsonToCsvOptions } from '../../../src/types';

/**
 * Nuxt plugin options
 */
interface PluginOptions {
  async?: boolean;
  workers?: boolean;
}

/**
 * Enhanced jtcsv with async support
 */
function enhanceJtcsv(baseJtcsv: typeof jtcsv, options: PluginOptions = {}) {
  const { async = true, workers = false } = options;
  
  const enhanced = {
    ...baseJtcsv,
    
    // Async versions
    ...(async ? {
      csvToJsonAsync: async (csv: string, options?: CsvToJsonOptions) => {
        return baseJtcsv.csvToJson(csv, options);
      },
      jsonToCsvAsync: async (data: any, options?: JsonToCsvOptions) => {
        return baseJtcsv.jsonToCsv(data, options);
      },
      saveAsCsvAsync: async (data: any, filepath: string, options?: JsonToCsvOptions) => {
        return baseJtcsv.saveAsCsv(data, filepath, options);
      },
      saveAsJsonAsync: async (data: any, filepath: string, options?: any) => {
        return baseJtcsv.saveAsJson(data, filepath, options);
      }
    } : {}),
    
    // Worker support
    ...(workers ? {
      createWorkerPool: (size?: number) => {
        // This would import from the worker pool module
        // For now, return a mock
        return {
          size,
          process: async (data: any) => data
        };
      }
    } : {})
  };
  
  return enhanced;
}

export default defineNuxtPlugin((nuxtApp, inject) => {
  // Get plugin options from runtime config
  const config = nuxtApp.$config?.public?.jtcsv || {};
  
  // Enhance jtcsv with async support based on config
  const enhancedJtcsv = enhanceJtcsv(jtcsv, config);
  
  // Provide to Nuxt app
  nuxtApp.provide('jtcsv', enhancedJtcsv);
  
  // Also inject for backward compatibility
  inject('jtcsv', enhancedJtcsv);
});