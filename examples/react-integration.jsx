/**
 * React Integration Example for jtcsv
 *
 * This file demonstrates how to use jtcsv in React applications
 * for CSV import/export functionality.
 *
 * To use: npm install jtcsv react react-dom
 */

import React, { useState, useCallback, useMemo } from 'react';
import { csvToJson, jsonToCsv, ValidationError, ParsingError } from 'jtcsv';

// =============================================================================
// Example 1: CSV Import Component
// =============================================================================

export function CsvImporter({ onImport, columns, parseOptions = {} }) {
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const data = csvToJson(text, {
        hasHeaders: true,
        trim: true,
        parseNumbers: true,
        parseBooleans: true,
        ...parseOptions
      });

      // Show preview of first 5 rows
      setPreview({
        total: data.length,
        sample: data.slice(0, 5),
        columns: data.length > 0 ? Object.keys(data[0]) : []
      });

      // Call onImport with full data
      if (onImport) {
        onImport(data);
      }
    } catch (err) {
      if (err instanceof ParsingError) {
        setError(`Parsing error at line ${err.lineNumber}: ${err.message}`);
      } else if (err instanceof ValidationError) {
        setError(`Validation error: ${err.message}`);
      } else {
        setError(`Error: ${err.message}`);
      }
      setPreview(null);
    } finally {
      setIsProcessing(false);
    }
  }, [onImport, parseOptions]);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return (
    <div className="csv-importer">
      <div className="upload-area">
        <input
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleFileSelect}
          disabled={isProcessing}
        />
        {isProcessing && <span>Processing...</span>}
      </div>

      {error && (
        <div className="error-message" style={{ color: 'red' }}>
          {error}
        </div>
      )}

      {preview && (
        <div className="preview">
          <h4>Preview ({preview.total} rows total)</h4>
          <p>Columns: {preview.columns.join(', ')}</p>
          <table>
            <thead>
              <tr>
                {preview.columns.map(col => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.sample.map((row, i) => (
                <tr key={i}>
                  {preview.columns.map(col => (
                    <td key={col}>{String(row[col])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={clearPreview}>Clear</button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Example 2: CSV Export Component
// =============================================================================

export function CsvExporter({ data, filename = 'export.csv', options = {} }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(() => {
    setIsExporting(true);

    try {
      const csv = jsonToCsv(data, {
        delimiter: ',',
        includeHeaders: true,
        preventCsvInjection: true,
        ...options
      });

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [data, filename, options]);

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || !data || data.length === 0}
    >
      {isExporting ? 'Exporting...' : `Export CSV (${data?.length || 0} rows)`}
    </button>
  );
}

// =============================================================================
// Example 3: Custom Hook for CSV Operations
// =============================================================================

export function useCsv(initialData = []) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const importCsv = useCallback(async (csvString, options = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const parsed = csvToJson(csvString, {
        hasHeaders: true,
        trim: true,
        ...options
      });
      setData(parsed);
      return parsed;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportCsv = useCallback((options = {}) => {
    try {
      return jsonToCsv(data, {
        delimiter: ',',
        includeHeaders: true,
        ...options
      });
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [data]);

  const importFromFile = useCallback(async (file, options = {}) => {
    const text = await file.text();
    return importCsv(text, options);
  }, [importCsv]);

  const downloadCsv = useCallback((filename = 'data.csv', options = {}) => {
    const csv = exportCsv(options);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, [exportCsv]);

  const clearData = useCallback(() => {
    setData([]);
    setError(null);
  }, []);

  return {
    data,
    setData,
    error,
    isLoading,
    importCsv,
    exportCsv,
    importFromFile,
    downloadCsv,
    clearData
  };
}

// =============================================================================
// Example 4: Data Table with CSV Support
// =============================================================================

export function DataTableWithCsv({
  initialData = [],
  columns,
  editable = false,
  onDataChange
}) {
  const {
    data,
    setData,
    importFromFile,
    downloadCsv,
    isLoading,
    error
  } = useCsv(initialData);

  const handleFileChange = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const imported = await importFromFile(file, {
          parseNumbers: true,
          parseBooleans: true
        });
        if (onDataChange) onDataChange(imported);
      } catch (err) {
        // Error is handled by useCsv hook
      }
    }
  }, [importFromFile, onDataChange]);

  const handleCellEdit = useCallback((rowIndex, column, value) => {
    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [column]: value };
    setData(newData);
    if (onDataChange) onDataChange(newData);
  }, [data, setData, onDataChange]);

  const handleAddRow = useCallback(() => {
    const emptyRow = columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {});
    const newData = [...data, emptyRow];
    setData(newData);
    if (onDataChange) onDataChange(newData);
  }, [data, columns, setData, onDataChange]);

  const handleDeleteRow = useCallback((rowIndex) => {
    const newData = data.filter((_, i) => i !== rowIndex);
    setData(newData);
    if (onDataChange) onDataChange(newData);
  }, [data, setData, onDataChange]);

  const displayColumns = columns || (data.length > 0 ? Object.keys(data[0]) : []);

  return (
    <div className="data-table">
      <div className="toolbar">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <button onClick={() => downloadCsv('export.csv')}>
          Export CSV
        </button>
        {editable && (
          <button onClick={handleAddRow}>Add Row</button>
        )}
      </div>

      {error && (
        <div className="error" style={{ color: 'red' }}>
          {error.message}
        </div>
      )}

      {isLoading && <div>Loading...</div>}

      <table>
        <thead>
          <tr>
            {displayColumns.map(col => (
              <th key={col}>{col}</th>
            ))}
            {editable && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {displayColumns.map(col => (
                <td key={col}>
                  {editable ? (
                    <input
                      value={row[col] ?? ''}
                      onChange={(e) => handleCellEdit(rowIndex, col, e.target.value)}
                    />
                  ) : (
                    String(row[col] ?? '')
                  )}
                </td>
              ))}
              {editable && (
                <td>
                  <button onClick={() => handleDeleteRow(rowIndex)}>Delete</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// Example 5: CSV Converter Tool Component
// =============================================================================

export function CsvConverterTool() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [mode, setMode] = useState('csv-to-json'); // or 'json-to-csv'
  const [error, setError] = useState(null);
  const [options, setOptions] = useState({
    delimiter: ',',
    parseNumbers: true,
    parseBooleans: true,
    prettyPrint: true
  });

  const convert = useCallback(() => {
    setError(null);

    try {
      if (mode === 'csv-to-json') {
        const data = csvToJson(inputText, {
          delimiter: options.delimiter,
          parseNumbers: options.parseNumbers,
          parseBooleans: options.parseBooleans
        });
        setOutputText(
          options.prettyPrint
            ? JSON.stringify(data, null, 2)
            : JSON.stringify(data)
        );
      } else {
        const data = JSON.parse(inputText);
        const csv = jsonToCsv(data, {
          delimiter: options.delimiter
        });
        setOutputText(csv);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [inputText, mode, options]);

  return (
    <div className="csv-converter">
      <div className="mode-selector">
        <label>
          <input
            type="radio"
            value="csv-to-json"
            checked={mode === 'csv-to-json'}
            onChange={() => setMode('csv-to-json')}
          />
          CSV to JSON
        </label>
        <label>
          <input
            type="radio"
            value="json-to-csv"
            checked={mode === 'json-to-csv'}
            onChange={() => setMode('json-to-csv')}
          />
          JSON to CSV
        </label>
      </div>

      <div className="options">
        <label>
          Delimiter:
          <select
            value={options.delimiter}
            onChange={(e) => setOptions({ ...options, delimiter: e.target.value })}
          >
            <option value=",">Comma (,)</option>
            <option value=";">Semicolon (;)</option>
            <option value="\t">Tab</option>
            <option value="|">Pipe (|)</option>
          </select>
        </label>

        {mode === 'csv-to-json' && (
          <>
            <label>
              <input
                type="checkbox"
                checked={options.parseNumbers}
                onChange={(e) => setOptions({ ...options, parseNumbers: e.target.checked })}
              />
              Parse Numbers
            </label>
            <label>
              <input
                type="checkbox"
                checked={options.parseBooleans}
                onChange={(e) => setOptions({ ...options, parseBooleans: e.target.checked })}
              />
              Parse Booleans
            </label>
            <label>
              <input
                type="checkbox"
                checked={options.prettyPrint}
                onChange={(e) => setOptions({ ...options, prettyPrint: e.target.checked })}
              />
              Pretty Print
            </label>
          </>
        )}
      </div>

      <div className="converter-panels">
        <div className="input-panel">
          <h4>Input ({mode === 'csv-to-json' ? 'CSV' : 'JSON'})</h4>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={mode === 'csv-to-json'
              ? 'Paste CSV here...\nname,age\nJohn,30'
              : 'Paste JSON array here...\n[{"name":"John","age":30}]'
            }
            rows={10}
          />
        </div>

        <div className="convert-button">
          <button onClick={convert}>Convert →</button>
        </div>

        <div className="output-panel">
          <h4>Output ({mode === 'csv-to-json' ? 'JSON' : 'CSV'})</h4>
          <textarea
            value={outputText}
            readOnly
            rows={10}
          />
        </div>
      </div>

      {error && (
        <div className="error" style={{ color: 'red' }}>
          Error: {error}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Example 6: Async Data Loader with CSV Support
// =============================================================================

export function useAsyncCsvLoader(url) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (parseOptions = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const csvText = await response.text();
      const parsed = csvToJson(csvText, {
        hasHeaders: true,
        trim: true,
        ...parseOptions
      });
      setData(parsed);
      return parsed;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  return { data, isLoading, error, load };
}

// Example usage component
export function RemoteCsvLoader({ url }) {
  const { data, isLoading, error, load } = useAsyncCsvLoader(url);

  React.useEffect(() => {
    load({ parseNumbers: true });
  }, [load]);

  if (isLoading) return <div>Loading CSV from {url}...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h4>Loaded {data.length} rows</h4>
      <pre>{JSON.stringify(data.slice(0, 5), null, 2)}</pre>
    </div>
  );
}

// =============================================================================
// Example 7: Complete App Example
// =============================================================================

export function CsvManagerApp() {
  const [activeTab, setActiveTab] = useState('import');
  const [data, setData] = useState([]);

  return (
    <div className="csv-manager-app">
      <h1>CSV Manager</h1>

      <div className="tabs">
        <button
          className={activeTab === 'import' ? 'active' : ''}
          onClick={() => setActiveTab('import')}
        >
          Import
        </button>
        <button
          className={activeTab === 'edit' ? 'active' : ''}
          onClick={() => setActiveTab('edit')}
        >
          Edit
        </button>
        <button
          className={activeTab === 'export' ? 'active' : ''}
          onClick={() => setActiveTab('export')}
        >
          Export
        </button>
        <button
          className={activeTab === 'convert' ? 'active' : ''}
          onClick={() => setActiveTab('convert')}
        >
          Convert
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'import' && (
          <CsvImporter
            onImport={(imported) => {
              setData(imported);
              setActiveTab('edit');
            }}
            parseOptions={{ parseNumbers: true, parseBooleans: true }}
          />
        )}

        {activeTab === 'edit' && (
          <DataTableWithCsv
            initialData={data}
            editable={true}
            onDataChange={setData}
          />
        )}

        {activeTab === 'export' && (
          <div>
            <h3>Export Options</h3>
            <CsvExporter
              data={data}
              filename="export.csv"
              options={{ delimiter: ',' }}
            />
          </div>
        )}

        {activeTab === 'convert' && (
          <CsvConverterTool />
        )}
      </div>
    </div>
  );
}

// Default export
export default CsvManagerApp;
