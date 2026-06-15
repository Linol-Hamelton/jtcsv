/**
 * jtcsv-vue — Vue 3 plugin, composables, and v-csv-upload directive
 * for the jtcsv CSV/JSON toolkit. CommonJS hand-mirror of index.ts.
 *
 * Imports from `jtcsv/browser` so File / Blob / FileReader APIs work in
 * the browser at runtime.
 */

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const vue = require('vue');
const jtcsvBrowser = require('jtcsv/browser');

const {
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
} = jtcsvBrowser;

const jtcsvKey = Symbol.for('jtcsv');

function buildInstance(opts) {
  const { async = true } = opts || {};
  const instance = {
    csvToJson: (csv, o) => csvToJson(csv, o),
    jsonToCsv: (data, o) => jsonToCsv(data, o),
  };
  if (async) {
    instance.csvToJsonAsync = (csv, o) => csvToJsonAsync(csv, o);
    instance.jsonToCsvAsync = (data, o) => jsonToCsvAsync(data, o);
  }
  return instance;
}

const csvUploadDirective = {
  mounted(el, binding) {
    const handler = async (event) => {
      const target = event.target;
      const file = target && target.files && target.files[0];
      if (!file) return;
      const { onLoad, onError, options } = binding.value || {};
      try {
        const data = await parseCsvFile(file, options || {});
        if (onLoad) onLoad(data, file);
      } catch (err) {
        if (onError) onError(err, file);
      }
    };
    el.__jtcsvCsvUploadHandler = handler;
    el.addEventListener('change', handler);
  },
  unmounted(el) {
    const handler = el.__jtcsvCsvUploadHandler;
    if (handler) {
      el.removeEventListener('change', handler);
      delete el.__jtcsvCsvUploadHandler;
    }
  },
};

function createJtcsvPlugin(options) {
  const opts = options || {};
  const propertyName = opts.propertyName || '$jtcsv';
  const provideComposable = opts.provideComposable !== false;
  const instance = buildInstance(opts);
  return {
    install(app) {
      app.provide(jtcsvKey, instance);
      if (provideComposable) {
        app.provide('jtcsv', instance);
      }
      app.config.globalProperties[propertyName] = instance;
      app.directive('csv-upload', csvUploadDirective);
    },
  };
}

function useJtcsv() {
  const instance = vue.inject(jtcsvKey, undefined) || vue.inject('jtcsv');
  if (!instance) {
    throw new Error(
      'jtcsv-vue: plugin not installed. Call app.use(createJtcsvPlugin()) in your Vue app entry point.'
    );
  }
  return instance;
}

function useJtcsvAsync() {
  const jtcsv = useJtcsv();
  const csvToJsonImpl =
    jtcsv.csvToJsonAsync || ((csv, o) => Promise.resolve(jtcsv.csvToJson(csv, o)));
  const jsonToCsvImpl =
    jtcsv.jsonToCsvAsync || ((data, o) => Promise.resolve(jtcsv.jsonToCsv(data, o)));
  return {
    csvToJson: csvToJsonImpl,
    jsonToCsv: jsonToCsvImpl,
    csvToJsonAsync: csvToJsonImpl,
    jsonToCsvAsync: jsonToCsvImpl,
  };
}

function useCsvUpload(opts) {
  const o = opts || {};
  const parseOptions = o.parseOptions;
  const onParsed = o.onParsed;
  const onError = o.onError;
  const isParsing = vue.ref(false);
  const error = vue.ref(null);
  const isDragging = vue.ref(false);

  const handleFiles = async (files) => {
    const fileList = files ? Array.from(files) : [];
    const file = fileList[0];
    if (!file) return null;
    isParsing.value = true;
    error.value = null;
    try {
      const data = await parseCsvFile(file, parseOptions || {});
      if (onParsed) onParsed(data, file);
      return data;
    } catch (err) {
      error.value = err;
      if (onError) onError(err, file);
      return null;
    } finally {
      isParsing.value = false;
    }
  };

  const onDragOver = (event) => {
    event.preventDefault();
    isDragging.value = true;
  };
  const onDragLeave = (_event) => {
    isDragging.value = false;
  };
  const onDrop = async (event) => {
    event.preventDefault();
    isDragging.value = false;
    const files = event.dataTransfer ? event.dataTransfer.files : null;
    return handleFiles(files);
  };

  return { isParsing, error, isDragging, handleFiles, onDragOver, onDragLeave, onDrop };
}

function useCsvDownload() {
  return {
    downloadCsv: (data, filename, options) => {
      downloadAsCsv(data, filename || 'export.csv', options || {});
    },
  };
}

exports.createJtcsvPlugin = createJtcsvPlugin;
exports.jtcsvKey = jtcsvKey;
exports.csvUploadDirective = csvUploadDirective;
exports.useJtcsv = useJtcsv;
exports.useJtcsvAsync = useJtcsvAsync;
exports.useCsvUpload = useCsvUpload;
exports.useCsvDownload = useCsvDownload;
exports.ValidationError = ValidationError;
exports.ParsingError = ParsingError;
exports.SecurityError = SecurityError;
exports.FileSystemError = FileSystemError;
exports.LimitError = LimitError;
exports.ConfigurationError = ConfigurationError;
exports.ERROR_CODES = ERROR_CODES;
exports.default = createJtcsvPlugin();
