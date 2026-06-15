/**
 * jtcsv-vue — Vue 3 plugin, composables, and v-csv-upload directive
 * for the jtcsv CSV/JSON toolkit.
 *
 * Imports from `jtcsv/browser` so File / Blob / FileReader APIs work in
 * the browser at runtime (this package targets browser-side Vue apps).
 *
 * @module jtcsv-vue
 */

import { inject, ref } from 'vue';
import type { App, Plugin, InjectionKey, Ref, Directive } from 'vue';
import {
  csvToJson,
  jsonToCsv,
  csvToJsonAsync,
  jsonToCsvAsync,
  parseCsvFile,
  downloadAsCsv,
  ValidationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
  ERROR_CODES,
} from 'jtcsv/browser';

/**
 * Options for csvToJson — kept loose so we don't bind to a specific
 * jtcsv minor release.
 */
export type CsvToJsonOptions = Record<string, any>;
/**
 * Options for jsonToCsv — kept loose so we don't bind to a specific
 * jtcsv minor release.
 */
export type JsonToCsvOptions = Record<string, any>;

/**
 * Vue plugin options.
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
 * JTCSV instance exposed to Vue.
 */
export interface JtcsvVueInstance {
  csvToJson: (csv: string, opts?: CsvToJsonOptions) => any;
  jsonToCsv: (data: any, opts?: JsonToCsvOptions) => string;
  csvToJsonAsync?: (csv: string, opts?: CsvToJsonOptions) => Promise<any>;
  jsonToCsvAsync?: (data: any, opts?: JsonToCsvOptions) => Promise<string>;
}

/**
 * Injection key for the JtcsvVueInstance. Symbol.for so that multiple
 * copies of this package (e.g. nested deps) resolve to the same key.
 */
export const jtcsvKey: InjectionKey<JtcsvVueInstance> =
  Symbol.for('jtcsv') as InjectionKey<JtcsvVueInstance>;

/**
 * Binding payload for the `v-csv-upload` directive.
 */
export interface CsvUploadDirectiveBinding {
  /** Callback when CSV parsed successfully */
  onLoad?: (data: any[], file: File) => void;
  /** Callback on error */
  onError?: (error: Error, file: File) => void;
  /** CSV parsing options */
  options?: CsvToJsonOptions;
}

/**
 * Builds a JtcsvVueInstance from the static jtcsv/browser imports.
 */
function buildInstance(opts: VuePluginOptions): JtcsvVueInstance {
  const { async = true } = opts;
  const instance: JtcsvVueInstance = {
    csvToJson: (csv: string, o?: CsvToJsonOptions) => csvToJson(csv, o),
    jsonToCsv: (data: any, o?: JsonToCsvOptions) => jsonToCsv(data, o),
  };
  if (async) {
    instance.csvToJsonAsync = (csv: string, o?: CsvToJsonOptions) =>
      csvToJsonAsync(csv, o);
    instance.jsonToCsvAsync = (data: any, o?: JsonToCsvOptions) =>
      jsonToCsvAsync(data, o);
  }
  return instance;
}

/**
 * The `v-csv-upload` directive — attaches a `change` listener to a file
 * input and pipes the selected file through `parseCsvFile`.
 */
export const csvUploadDirective: Directive<HTMLInputElement, CsvUploadDirectiveBinding> = {
  mounted(el, binding) {
    const handler = async (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      const file = target?.files?.[0];
      if (!file) return;
      const { onLoad, onError, options } = binding.value || {};
      try {
        const data = await parseCsvFile(file, options || {});
        if (onLoad) onLoad(data, file);
      } catch (err) {
        if (onError) onError(err as Error, file);
      }
    };
    // Store handler so unmounted can remove it.
    (el as any).__jtcsvCsvUploadHandler = handler;
    el.addEventListener('change', handler);
  },
  unmounted(el) {
    const handler = (el as any).__jtcsvCsvUploadHandler;
    if (handler) {
      el.removeEventListener('change', handler);
      delete (el as any).__jtcsvCsvUploadHandler;
    }
  },
};

/**
 * Create the jtcsv Vue plugin.
 *
 * @example
 *   import { createApp } from 'vue';
 *   import { createJtcsvPlugin } from 'jtcsv-vue';
 *
 *   const app = createApp(App);
 *   app.use(createJtcsvPlugin());
 *   app.mount('#app');
 */
export function createJtcsvPlugin(options: VuePluginOptions = {}): Plugin {
  const {
    propertyName = '$jtcsv',
    provideComposable = true,
  } = options;
  const instance = buildInstance(options);
  return {
    install(app: App) {
      // Provide via Symbol key (preferred Composition API form)
      app.provide(jtcsvKey, instance);
      // Provide via string key for legacy useJtcsv() lookups
      if (provideComposable) {
        app.provide('jtcsv', instance);
      }
      // Options API global property
      app.config.globalProperties[propertyName] = instance;
      // Register directive
      app.directive('csv-upload', csvUploadDirective);
    },
  };
}

/**
 * Composition API: get the JtcsvVueInstance provided by the plugin.
 * Throws a helpful error if the plugin wasn't installed.
 */
export function useJtcsv(): JtcsvVueInstance {
  // Try Symbol key first, then string key (back-compat).
  const instance = inject(jtcsvKey, undefined as any) ?? inject<JtcsvVueInstance>('jtcsv');
  if (!instance) {
    throw new Error(
      'jtcsv-vue: plugin not installed. Call app.use(createJtcsvPlugin()) in your Vue app entry point.'
    );
  }
  return instance as JtcsvVueInstance;
}

/**
 * Composition API: like useJtcsv() but guarantees the async variants
 * are exposed (falling back to sync wrapped in Promise.resolve).
 */
export function useJtcsvAsync(): {
  csvToJson: (csv: string, opts?: CsvToJsonOptions) => Promise<any>;
  jsonToCsv: (data: any, opts?: JsonToCsvOptions) => Promise<string>;
  csvToJsonAsync: (csv: string, opts?: CsvToJsonOptions) => Promise<any>;
  jsonToCsvAsync: (data: any, opts?: JsonToCsvOptions) => Promise<string>;
} {
  const jtcsv = useJtcsv();
  const csvToJsonImpl =
    jtcsv.csvToJsonAsync ||
    ((csv: string, o?: CsvToJsonOptions) => Promise.resolve(jtcsv.csvToJson(csv, o)));
  const jsonToCsvImpl =
    jtcsv.jsonToCsvAsync ||
    ((data: any, o?: JsonToCsvOptions) => Promise.resolve(jtcsv.jsonToCsv(data, o)));
  return {
    csvToJson: csvToJsonImpl,
    jsonToCsv: jsonToCsvImpl,
    csvToJsonAsync: csvToJsonImpl,
    jsonToCsvAsync: jsonToCsvImpl,
  };
}

/**
 * Options for the useCsvUpload composable.
 */
export interface UseCsvUploadOptions {
  /** Forwarded to parseCsvFile */
  parseOptions?: CsvToJsonOptions;
  /** Called with parsed rows on success */
  onParsed?: (data: any[], file: File) => void;
  /** Called with error on parse failure */
  onError?: (error: Error, file: File | null) => void;
}

/**
 * Return shape of useCsvUpload.
 */
export interface UseCsvUploadReturn {
  /** True while parsing is in-flight */
  isParsing: Ref<boolean>;
  /** Last error, if any */
  error: Ref<Error | null>;
  /** Drag-over state (true while a drag is hovering) */
  isDragging: Ref<boolean>;
  /** Parse the first file in a FileList */
  handleFiles: (files: FileList | File[] | null | undefined) => Promise<any[] | null>;
  /** dragover handler (preventDefault + sets isDragging true) */
  onDragOver: (event: DragEvent) => void;
  /** dragleave handler (sets isDragging false) */
  onDragLeave: (event: DragEvent) => void;
  /** drop handler (preventDefault + calls handleFiles) */
  onDrop: (event: DragEvent) => Promise<any[] | null>;
}

/**
 * Composable for file-input or drag-drop CSV upload. Wraps
 * `parseCsvFile` from `jtcsv/browser` with reactive state.
 */
export function useCsvUpload(opts: UseCsvUploadOptions = {}): UseCsvUploadReturn {
  const { parseOptions, onParsed, onError } = opts;
  const isParsing = ref(false);
  const error = ref<Error | null>(null);
  const isDragging = ref(false);

  const handleFiles = async (
    files: FileList | File[] | null | undefined,
  ): Promise<any[] | null> => {
    const fileList = files ? Array.from(files as any) : [];
    const file = fileList[0] as File | undefined;
    if (!file) return null;
    isParsing.value = true;
    error.value = null;
    try {
      const data = await parseCsvFile(file, parseOptions || {});
      if (onParsed) onParsed(data, file);
      return data;
    } catch (err) {
      const e = err as Error;
      error.value = e;
      if (onError) onError(e, file);
      return null;
    } finally {
      isParsing.value = false;
    }
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    isDragging.value = true;
  };
  const onDragLeave = (_event: DragEvent) => {
    isDragging.value = false;
  };
  const onDrop = async (event: DragEvent): Promise<any[] | null> => {
    event.preventDefault();
    isDragging.value = false;
    const files = event.dataTransfer?.files;
    return handleFiles(files);
  };

  return { isParsing, error, isDragging, handleFiles, onDragOver, onDragLeave, onDrop };
}

/**
 * Composable that returns a CSV download helper bound to `downloadAsCsv`
 * from `jtcsv/browser`.
 */
export function useCsvDownload(): {
  downloadCsv: (data: any[], filename?: string, options?: JsonToCsvOptions) => void;
} {
  return {
    downloadCsv: (data: any[], filename = 'export.csv', options?: JsonToCsvOptions) => {
      downloadAsCsv(data, filename, options || {});
    },
  };
}

// Re-export error classes from jtcsv/browser for convenient
// `catch (e) { if (e instanceof ValidationError) ... }` patterns.
export {
  ValidationError,
  ParsingError,
  SecurityError,
  FileSystemError,
  LimitError,
  ConfigurationError,
  ERROR_CODES,
};

// Default export: a Plugin object you can pass straight to app.use().
export default createJtcsvPlugin();
