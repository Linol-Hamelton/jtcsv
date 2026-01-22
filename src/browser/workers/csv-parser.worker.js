// Web Worker для обработки CSV
// Работает в отдельном потоке, не блокируя основной

// Импорт функций парсинга (они будут bundled вместе с worker)
import { csvToJson } from '../csv-to-json-browser.js';
import { jsonToCsv } from '../json-to-csv-browser.js';

// Кеш для повторного использования результатов
const cache = new Map();
const CACHE_MAX_SIZE = 50;
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// Статистика worker
let stats = {
  tasksProcessed: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalProcessingTime: 0,
  averageProcessingTime: 0
};

/**
 * Генерация ключа кеша для CSV строки
 * @param {string} csv - CSV строка
 * @param {Object} options - Опции парсинга
 * @returns {string} Ключ кеша
 */
function generateCacheKey(csv, options) {
  // Простой хэш для CSV строки
  let hash = 0;
  for (let i = 0; i < csv.length; i++) {
    const char = csv.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Добавление опций в хэш
  const optionsStr = JSON.stringify(options);
  for (let i = 0; i < optionsStr.length; i++) {
    const char = optionsStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `csv-${hash.toString(36)}-${optionsStr.length}`;
}

/**
 * Очистка устаревших записей кеша
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
  
  // Ограничение размера кеша
  if (cache.size > CACHE_MAX_SIZE) {
    const oldestKey = Array.from(cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    cache.delete(oldestKey);
  }
}

/**
 * Парсинг CSV с кешированием и прогрессом
 * @param {string} csv - CSV строка
 * @param {Object} options - Опции парсинга
 * @param {Function} sendProgress - Функция отправки прогресса
 * @returns {Array<Object>} JSON данные
 */
function parseCSVWithProgress(csv, options, sendProgress) {
  const startTime = performance.now();
  
  // Проверка кеша
  const cacheKey = generateCacheKey(csv, options);
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    stats.cacheHits++;
    
    // Отправка мгновенного прогресса для кешированных данных
    if (sendProgress) {
      sendProgress({
        processed: cached.data.length,
        total: cached.data.length,
        percentage: 100,
        fromCache: true
      });
    }
    
    return cached.data;
  }
  
  stats.cacheMisses++;
  
  // Разделение на chunks для прогресса
  const CHUNK_SIZE = 10000; // строк в chunk
  const lines = csv.split('\n');
  const totalLines = lines.length;
  
  let result = [];
  let processedLines = 0;
  
  // Обработка по chunks
  for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
    const chunk = lines.slice(i, i + CHUNK_SIZE).join('\n');
    const chunkResult = csvToJson(chunk, options);
    result = result.concat(chunkResult);
    
    processedLines = Math.min(i + CHUNK_SIZE, totalLines);
    
    // Отправка прогресса
    if (sendProgress) {
      const percentage = (processedLines / totalLines) * 100;
      const elapsed = (performance.now() - startTime) / 1000;
      const speed = processedLines / elapsed;
      
      sendProgress({
        processed: processedLines,
        total: totalLines,
        percentage: percentage,
        speed: speed,
        elapsed: elapsed
      });
    }
    
    // Даем возможность обработать другие задачи
    if (i % (CHUNK_SIZE * 10) === 0) {
      // Небольшая пауза для неблокирующей обработки
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1);
    }
  }
  
  // Сохранение в кеш
  cache.set(cacheKey, {
    data: result,
    timestamp: Date.now(),
    size: csv.length
  });
  
  // Очистка кеша если нужно
  cleanupCache();
  
  // Обновление статистики
  const processingTime = performance.now() - startTime;
  stats.tasksProcessed++;
  stats.totalProcessingTime += processingTime;
  stats.averageProcessingTime = stats.totalProcessingTime / stats.tasksProcessed;
  
  return result;
}

/**
 * Конвертация JSON в CSV
 * @param {Array<Object>} jsonData - JSON данные
 * @param {Object} options - Опции конвертации
 * @returns {string} CSV строка
 */
function convertJSONToCSV(jsonData, options) {
  return jsonToCsv(jsonData, options);
}

/**
 * Валидация CSV строки
 * @param {string} csv - CSV строка
 * @param {Object} options - Опции валидации
 * @returns {Object} Результат валидации
 */
function validateCSV(csv, options) {
  const startTime = performance.now();
  
  try {
    // Быстрый парсинг для валидации
    const sampleSize = Math.min(1000, csv.split('\n').length);
    const sample = csv.split('\n').slice(0, sampleSize).join('\n');
    
    const result = csvToJson(sample, options);
    
    const processingTime = performance.now() - startTime;
    
    return {
      valid: true,
      sampleSize: result.length,
      estimatedTotalRows: csv.split('\n').length,
      processingTime: processingTime,
      estimatedFullProcessingTime: (processingTime / sampleSize) * csv.split('\n').length
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      processingTime: performance.now() - startTime
    };
  }
}

/**
 * Получение статистики worker
 * @returns {Object} Статистика
 */
function getStats() {
  return {
    ...stats,
    cacheSize: cache.size,
    cacheKeys: Array.from(cache.keys())
  };
}

/**
 * Очистка кеша worker
 */
function clearCache() {
  cache.clear();
  stats.cacheHits = 0;
  stats.cacheMisses = 0;
}

// Обработчик сообщений от основного потока
self.onmessage = function(event) {
  const { data } = event;
  
  switch (data.type) {
    case 'EXECUTE':
      handleExecute(data);
      break;
      
    case 'GET_STATS':
      self.postMessage({
        type: 'STATS',
        taskId: data.taskId,
        data: getStats()
      });
      break;
      
    case 'CLEAR_CACHE':
      clearCache();
      self.postMessage({
        type: 'CACHE_CLEARED',
        taskId: data.taskId
      });
      break;
      
    default:
      self.postMessage({
        type: 'ERROR',
        taskId: data.taskId,
        message: `Unknown command: ${data.type}`
      });
  }
};

/**
 * Обработка команды EXECUTE
 * @param {Object} commandData - Данные команды
 */
function handleExecute(commandData) {
  const { taskId, method, args = [], options = {} } = commandData;
  
  try {
    switch (method) {
      case 'parseCSV': {
        const [csv, parseOptions] = args;
        
        // Функция отправки прогресса
        const sendProgress = (progress) => {
          self.postMessage({
            type: 'PROGRESS',
            taskId,
            ...progress
          });
        };
        
        const result = parseCSVWithProgress(csv, { ...options, ...parseOptions }, sendProgress);
        
        self.postMessage({
          type: 'RESULT',
          taskId,
          data: result
        });
        break;
      }
        
      case 'jsonToCSV': {
        const [jsonData, csvOptions] = args;
        const result = convertJSONToCSV(jsonData, { ...options, ...csvOptions });
        
        self.postMessage({
          type: 'RESULT',
          taskId,
          data: result
        });
        break;
      }
        
      case 'validateCSV': {
        const [csv, validateOptions] = args;
        const result = validateCSV(csv, { ...options, ...validateOptions });
        
        self.postMessage({
          type: 'RESULT',
          taskId,
          data: result
        });
        break;
      }
        
      case 'autoDetectDelimiter': {
        const [csv] = args;
        // Простая реализация автоопределения
        const delimiters = [';', ',', '\t', '|'];
        let bestDelimiter = ';';
        let maxCount = 0;
        
        const firstLine = csv.split('\n')[0] || '';
        
        for (const delim of delimiters) {
          const count = (firstLine.match(new RegExp(`[${delim}]`, 'g')) || []).length;
          if (count > maxCount) {
            maxCount = count;
            bestDelimiter = delim;
          }
        }
        
        self.postMessage({
          type: 'RESULT',
          taskId,
          data: bestDelimiter
        });
        break;
      }
        
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      taskId,
      message: error.message,
      stack: error.stack
    });
  }
}

// Инициализация worker
self.postMessage({ type: 'READY' });

// Экспорт для тестирования
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseCSVWithProgress,
    convertJSONToCSV,
    validateCSV,
    getStats,
    clearCache
  };
}