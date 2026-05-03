import { writable, derived } from 'svelte/store';
import { csvToJson, jsonToCsv } from 'jtcsv';

/**
 * Creates a CSV store that synchronizes between CSV string and JSON array
 * @param {string} initialCsv - Initial CSV string
 * @param {Object} options - Conversion options
 * @returns {Object} Store with methods
 */
export function createCsvStore(initialCsv = '', options = {}) {
  const json = csvToJson(initialCsv, options);
  const csv = writable(initialCsv);
  const data = writable(json);
  const error = writable(null);

  const updateFromCsv = (newCsv, newOptions = {}) => {
    try {
      const newJson = csvToJson(newCsv, { ...options, ...newOptions });
      csv.set(newCsv);
      data.set(newJson);
      error.set(null);
    } catch (err) {
      error.set(err.message);
    }
  };

  const updateFromJson = (newJson, newOptions = {}) => {
    try {
      const newCsv = jsonToCsv(newJson, { ...options, ...newOptions });
      csv.set(newCsv);
      data.set(newJson);
      error.set(null);
    } catch (err) {
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
 * Svelte action for CSV file upload
 * @param {HTMLElement} node - Input element
 * @param {Object} options - Configuration options
 */
export function csvUpload(node, options = {}) {
  if (node.tagName !== 'INPUT' || node.type !== 'file') {
    throw new Error('csvUpload action can only be used on file input elements');
  }

  const handleChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const onLoad = options.onLoad || (() => {});
    const onError = options.onError || (() => {});
    const parseOptions = options.parseOptions || {};

    try {
      const text = await readFileAsText(file);
      const json = csvToJson(text, parseOptions);
      onLoad(json, file);
    } catch (error) {
      onError(error, file);
    }
  };

  node.addEventListener('change', handleChange);

  return {
    destroy() {
      node.removeEventListener('change', handleChange);
    },
    update(newOptions) {
      options = newOptions;
    }
  };
}

/**
 * Utility function to read file as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Download CSV file from JSON data
 * @param {Array} json - JSON data
 * @param {string} filename - Download filename
 * @param {Object} options - Conversion options
 */
export function downloadCsv(json, filename = 'data.csv', options = {}) {
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
 * @param {import('svelte/store').Readable<string>} csvStore - Store containing CSV string
 * @param {Object} options - Conversion options
 * @returns {import('svelte/store').Readable<Array>} Derived store with JSON data
 */
export function csvToJsonStore(csvStore, options = {}) {
  return derived(csvStore, ($csv, set) => {
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
 * @param {import('svelte/store').Readable<Array>} jsonStore - Store containing JSON array
 * @param {Object} options - Conversion options
 * @returns {import('svelte/store').Readable<string>} Derived store with CSV string
 */
export function jsonToCsvStore(jsonStore, options = {}) {
  return derived(jsonStore, ($json, set) => {
    try {
      const csv = jsonToCsv($json, options);
      set(csv);
    } catch (error) {
      set('');
    }
  }, '');
}

// Export jtcsv functions for convenience
export { csvToJson, jsonToCsv } from 'jtcsv';