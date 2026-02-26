/**
 * Vue 3 plugin for jtcsv
 * Provides jtcsv integration for Vue applications
 * @module plugins/vue
 */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const vue = require('vue');

/**
 * Vue plugin options
 */
const VuePluginOptions = {};

/**
 * JTCSV instance exposed to Vue
 */
const JtcsvVueInstance = {};

/**
 * Vue plugin implementation
 */
const jtcsvVuePlugin = {
  install(app, options = {}) {
    const {
      async = true,
      workers = false,
      propertyName = '$jtcsv',
      provideComposable = true
    } = options;

    // Import jtcsv functions dynamically to avoid bundling issues
    const jtcsv = {
      // Core functions
      csvToJson: (csv, opts) => {
        const { csvToJson } = require('jtcsv');
        return csvToJson(csv, opts);
      },
      jsonToCsv: (data, opts) => {
        const { jsonToCsv } = require('jtcsv');
        return jsonToCsv(data, opts);
      },
      
      // Async versions if enabled
      ...(async ? {
        csvToJsonAsync: async (csv, opts) => {
          const { csvToJson } = require('jtcsv');
          return csvToJson(csv, opts);
        },
        jsonToCsvAsync: async (data, opts) => {
          const { jsonToCsv } = require('jtcsv');
          return jsonToCsv(data, opts);
        }
      } : {}),
      
      // Worker support if enabled
      ...(workers ? {
        createWorkerPool: (size) => {
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
function useJtcsv() {
  const instance = vue.inject('jtcsv');
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
function useJtcsvAsync() {
  const jtcsv = useJtcsv();
  
  return {
    ...jtcsv,
    // Ensure async methods are available
    csvToJson: (jtcsv.csvToJsonAsync || jtcsv.csvToJson),
    jsonToCsv: (jtcsv.jsonToCsvAsync || jtcsv.jsonToCsv),
  };
}

// CSV Upload directive
const csvUpload = {
  mounted(el, binding) {
    const { onLoad, onError, options } = binding.value || {};
    
    el.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await readFileAsText(file);
        const { csvToJson } = require('jtcsv');
        const data = csvToJson(text, options || {});
        
        if (onLoad) {
          onLoad(data, file);
        }
      } catch (error) {
        if (onError) {
          onError(error, file);
        }
      }
    });
  }
};

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Exports
exports.default = jtcsvVuePlugin;
exports.useJtcsv = useJtcsv;
exports.useJtcsvAsync = useJtcsvAsync;
exports.csvUpload = csvUpload;
exports.VuePluginOptions = VuePluginOptions;
exports.JtcsvVueInstance = JtcsvVueInstance;
