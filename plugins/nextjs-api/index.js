/**
 * Next.js интеграция для JTCSV
 * Утилиты и компоненты для использования JTCSV в Next.js приложениях
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

import { csvToJson, jsonToCsv } from 'jtcsv';

export { csvToJson, jsonToCsv };

/**
 * React hook для конвертации данных на клиенте
 * 
 * @param {Object} options - Опции конвертации
 * @returns {Object} Хук с функциями конвертации и состоянием
 * 
 * @example
 * // Использование в React компоненте
 * function ConverterComponent() {
 *   const { 
 *     convertCsvToJson, 
 *     convertJsonToCsv, 
 *     isLoading, 
 *     error, 
 *     result 
 *   } = useJtcsv();
 *   
 *   return (
 *     <div>
 *       <button onClick={() => convertCsvToJson('name,age\nJohn,30')}>
 *         Convert CSV to JSON
 *       </button>
 *       {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
 *     </div>
 *   );
 * }
 */
export function useJtcsv(options = {}) {
  const [state, setState] = React.useState({
    isLoading: false,
    error: null,
    result: null,
    stats: null
  });

  const convertCsvToJson = React.useCallback(async (csv, convertOptions = {}) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const startTime = Date.now();
      const result = await csvToJson(csv, { ...options, ...convertOptions });
      const processingTime = Date.now() - startTime;
      
      setState({
        isLoading: false,
        error: null,
        result,
        stats: {
          rows: result.length,
          processingTime,
          conversion: 'csv→json'
        }
      });
      
      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        result: null
      }));
      throw error;
    }
  }, [options]);

  const convertJsonToCsv = React.useCallback(async (json, convertOptions = {}) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const startTime = Date.now();
      const result = await jsonToCsv(json, { ...options, ...convertOptions });
      const processingTime = Date.now() - startTime;
      
      setState({
        isLoading: false,
        error: null,
        result,
        stats: {
          size: result.length,
          processingTime,
          conversion: 'json→csv'
        }
      });
      
      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        result: null
      }));
      throw error;
    }
  }, [options]);

  const reset = React.useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      result: null,
      stats: null
    });
  }, []);

  return {
    ...state,
    convertCsvToJson,
    convertJsonToCsv,
    reset
  };
}

/**
 * React компонент для загрузки и конвертации CSV файлов
 * 
 * @param {Object} props - Свойства компонента
 * @param {Function} props.onConvert - Callback при успешной конвертации
 * @param {Function} props.onError - Callback при ошибке
 * @param {Object} props.options - Опции конвертации
 * 
 * @example
 * // Использование компонента
 * function FileUploader() {
 *   const handleConvert = (result, stats) => {
 *     console.log('Converted:', result, stats);
 *   };
 *   
 *   return (
 *     <CsvFileUploader
 *       onConvert={handleConvert}
 *       options={{ delimiter: ',', parseNumbers: true }}
 *     />
 *   );
 * }
 */
export function CsvFileUploader({ onConvert, onError, options = {}, children }) {
  const fileInputRef = React.useRef(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const handleFileSelect = React.useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const startTime = Date.now();
      const result = await csvToJson(text, options);
      const processingTime = Date.now() - startTime;
      
      if (onConvert) {
        onConvert(result, {
          fileName: file.name,
          fileSize: file.size,
          rows: result.length,
          processingTime,
          conversion: 'csv→json'
        });
      }
    } catch (error) {
      if (onError) {
        onError(error, file);
      } else {
        console.error('Error converting CSV:', error);
      }
    } finally {
      setIsProcessing(false);
      // Сбрасываем input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onConvert, onError, options]);
  
  const handleClick = React.useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);
  
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      {children ? (
        React.cloneElement(children, { onClick: handleClick, disabled: isProcessing })
      ) : (
        <button 
          onClick={handleClick} 
          disabled={isProcessing}
          style={{
            padding: '10px 20px',
            background: isProcessing ? '#ccc' : '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isProcessing ? 'not-allowed' : 'pointer'
          }}
        >
          {isProcessing ? 'Processing...' : 'Upload CSV'}
        </button>
      )}
    </>
  );
}

/**
 * Утилита для скачивания CSV файла
 * 
 * @param {Array} data - JSON данные
 * @param {string} filename - Имя файла
 * @param {Object} options - Опции конвертации
 * 
 * @example
 * // Использование в браузере
 * const data = [{ name: 'John', age: 30 }];
 * downloadCsv(data, 'users.csv', { delimiter: ',' });
 */
export async function downloadCsv(data, filename = 'data.csv', options = {}) {
  const csv = await jsonToCsv(data, options);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Утилита для работы с API endpoint
 * 
 * @param {string} endpoint - URL API endpoint
 * @param {Object} options - Опции
 * 
 * @example
 * // Использование с Next.js API route
 * const api = createJtcsvApiClient('/api/convert');
 * 
 * // Конвертация CSV в JSON
 * const result = await api.csvToJson('name,age\nJohn,30');
 * 
 * // Конвертация JSON в CSV
 * const csv = await api.jsonToCsv([{ name: 'John', age: 30 }]);
 */
export function createJtcsvApiClient(endpoint = '/api/convert', options = {}) {
  const {
    headers = {},
    timeout = 30000,
    ...fetchOptions
  } = options;
  
  const request = async (path, data, method = 'POST') => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(`${endpoint}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(data),
        signal: controller.signal,
        ...fetchOptions
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}`
        }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/csv')) {
        return await response.text();
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
  
  return {
    csvToJson: (csv, options = {}) => 
      request('/csv-to-json', { csv, ...options }),
    
    jsonToCsv: (json, options = {}) => 
      request('/json-to-csv', { json, ...options }),
    
    convert: (data, options = {}) => 
      request('/auto', { data, ...options }),
    
    health: () => 
      fetch(`${endpoint}/health`).then(r => r.json())
  };
}

/**
 * Провайдер контекста для JTCSV
 * 
 * @example
 * // В _app.js
 * import { JtcsvProvider } from '@jtcsv/nextjs';
 * 
 * function MyApp({ Component, pageProps }) {
 *   return (
 *     <JtcsvProvider options={{ delimiter: ',' }}>
 *       <Component {...pageProps} />
 *     </JtcsvProvider>
 *   );
 * }
 * 
 * // В компоненте
 * import { useJtcsvContext } from '@jtcsv/nextjs';
 * 
 * function MyComponent() {
 *   const { convertCsvToJson } = useJtcsvContext();
 *   // ...
 * }
 */
const JtcsvContext = React.createContext(null);

export function JtcsvProvider({ children, options = {} }) {
  const value = React.useMemo(() => ({
    csvToJson: (csv, convertOptions = {}) => 
      csvToJson(csv, { ...options, ...convertOptions }),
    
    jsonToCsv: (json, convertOptions = {}) => 
      jsonToCsv(json, { ...options, ...convertOptions }),
    
    downloadCsv: (data, filename, convertOptions = {}) =>
      downloadCsv(data, filename, { ...options, ...convertOptions })
  }), [options]);
  
  return (
    <JtcsvContext.Provider value={value}>
      {children}
    </JtcsvContext.Provider>
  );
}

export function useJtcsvContext() {
  const context = React.useContext(JtcsvContext);
  
  if (!context) {
    throw new Error('useJtcsvContext must be used within JtcsvProvider');
  }
  
  return context;
}

// Экспортируем все из route.js
export * from './route';

