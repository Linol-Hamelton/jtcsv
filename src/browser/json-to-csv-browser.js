// Браузерная версия JSON to CSV конвертера
// Адаптирована для работы в браузере без Node.js API

import {
  ValidationError,
  SecurityError,
  ConfigurationError,
  LimitError,
  safeExecute
} from './errors-browser.js';

/**
 * Валидация входных данных и опций
 * @private
 */
function validateInput(data, options) {
  // Validate data
  if (!Array.isArray(data)) {
    throw new ValidationError('Input data must be an array');
  }
  
  // Validate options
  if (options && typeof options !== 'object') {
    throw new ConfigurationError('Options must be an object');
  }
  
  // Validate delimiter
  if (options?.delimiter && typeof options.delimiter !== 'string') {
    throw new ConfigurationError('Delimiter must be a string');
  }
  
  if (options?.delimiter && options.delimiter.length !== 1) {
    throw new ConfigurationError('Delimiter must be a single character');
  }
  
  // Validate renameMap
  if (options?.renameMap && typeof options.renameMap !== 'object') {
    throw new ConfigurationError('renameMap must be an object');
  }
  
  // Validate maxRecords
  if (options && options.maxRecords !== undefined) {
    if (typeof options.maxRecords !== 'number' || options.maxRecords <= 0) {
      throw new ConfigurationError('maxRecords must be a positive number');
    }
  }
  
  // Validate preventCsvInjection
  if (options?.preventCsvInjection !== undefined && typeof options.preventCsvInjection !== 'boolean') {
    throw new ConfigurationError('preventCsvInjection must be a boolean');
  }
  
  // Validate rfc4180Compliant
  if (options?.rfc4180Compliant !== undefined && typeof options.rfc4180Compliant !== 'boolean') {
    throw new ConfigurationError('rfc4180Compliant must be a boolean');
  }
  
  return true;
}

/**
 * Конвертирует JSON данные в CSV формат
 * 
 * @param {Array<Object>} data - Массив объектов для конвертации в CSV
 * @param {Object} [options] - Опции конфигурации
 * @param {string} [options.delimiter=';'] - CSV разделитель
 * @param {boolean} [options.includeHeaders=true] - Включать ли заголовки
 * @param {Object} [options.renameMap={}] - Маппинг переименования заголовков
 * @param {Object} [options.template={}] - Шаблон для порядка колонок
 * @param {number} [options.maxRecords] - Максимальное количество записей
 * @param {boolean} [options.preventCsvInjection=true] - Защита от CSV инъекций
 * @param {boolean} [options.rfc4180Compliant=true] - Соответствие RFC 4180
 * @returns {string} CSV строка
 */
export function jsonToCsv(data, options = {}) {
  return safeExecute(() => {
    // Валидация входных данных
    validateInput(data, options);
    
    const opts = options && typeof options === 'object' ? options : {};
    
    const {
      delimiter = ';',
      includeHeaders = true,
      renameMap = {},
      template = {},
      maxRecords,
      preventCsvInjection = true,
      rfc4180Compliant = true
    } = opts;

    // Обработка пустых данных
    if (data.length === 0) {
      return '';
    }

    // Предупреждение для больших наборов данных
    if (data.length > 1000000 && !maxRecords && process.env.NODE_ENV !== 'production') {
      console.warn(
        '⚠️ Warning: Processing >1M records in memory may be slow.\n' +
        '💡 Consider processing data in batches or using Web Workers for large files.\n' +
        '📊 Current size: ' + data.length.toLocaleString() + ' records'
      );
    }

    // Применение ограничения по количеству записей
    if (maxRecords && data.length > maxRecords) {
      throw new LimitError(
        `Data size exceeds maximum limit of ${maxRecords} records`,
        maxRecords,
        data.length
      );
    }

    // Получение всех уникальных ключей
    const allKeys = new Set();
    data.forEach((item) => {
      if (!item || typeof item !== 'object') {
        return;
      }
      Object.keys(item).forEach(key => allKeys.add(key));
    });
    
    const originalKeys = Array.from(allKeys);
    
    // Применение rename map для создания заголовков
    const headers = originalKeys.map(key => renameMap[key] || key);
    
    // Создание обратного маппинга
    const reverseRenameMap = {};
    originalKeys.forEach((key, index) => {
      reverseRenameMap[headers[index]] = key;
    });

    // Применение порядка из шаблона
    let finalHeaders = headers;
    if (Object.keys(template).length > 0) {
      const templateHeaders = Object.keys(template).map(key => renameMap[key] || key);
      const extraHeaders = headers.filter(h => !templateHeaders.includes(h));
      finalHeaders = [...templateHeaders, ...extraHeaders];
    }

    /**
     * Экранирование значения для CSV с защитой от инъекций
     * @private
     */
    const escapeValue = (value) => {
      if (value === null || value === undefined || value === '') {
        return '';
      }
      
      const stringValue = String(value);
      
      // Защита от CSV инъекций
      let escapedValue = stringValue;
      if (preventCsvInjection && /^[=+\-@]/.test(stringValue)) {
        escapedValue = "'" + stringValue;
      }
      
      // Соответствие RFC 4180
      const needsQuoting = rfc4180Compliant 
        ? (escapedValue.includes(delimiter) ||
           escapedValue.includes('"') ||
           escapedValue.includes('\n') ||
           escapedValue.includes('\r'))
        : (escapedValue.includes(delimiter) ||
           escapedValue.includes('"') ||
           escapedValue.includes('\n') ||
           escapedValue.includes('\r'));
      
      if (needsQuoting) {
        return `"${escapedValue.replace(/"/g, '""')}"`;
      }
      
      return escapedValue;
    };

    // Построение CSV строк
    const rows = [];
    
    // Добавление заголовков
    if (includeHeaders && finalHeaders.length > 0) {
      rows.push(finalHeaders.join(delimiter));
    }
    
    // Добавление данных
    for (const item of data) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      
      const row = finalHeaders.map(header => {
        const originalKey = reverseRenameMap[header] || header;
        const value = item[originalKey];
        return escapeValue(value);
      }).join(delimiter);
      
      rows.push(row);
    }
    
    // Разделители строк согласно RFC 4180
    const lineEnding = rfc4180Compliant ? '\r\n' : '\n';
    return rows.join(lineEnding);
  }, 'PARSE_FAILED', { function: 'jsonToCsv' });
}

/**
 * Глубокое разворачивание вложенных объектов и массивов
 * 
 * @param {*} value - Значение для разворачивания
 * @param {number} [depth=0] - Текущая глубина рекурсии
 * @param {number} [maxDepth=5] - Максимальная глубина рекурсии
 * @param {Set} [visited=new Set()] - Посещенные объекты для обнаружения циклических ссылок
 * @returns {string} Развернутое строковое значение
 */
export function deepUnwrap(value, depth = 0, maxDepth = 5, visited = new Set()) {
  // Проверка глубины
  if (depth >= maxDepth) {
    return '[Too Deep]';
  }
  if (value === null || value === undefined) {
    return '';
  }
  
  // Обработка циклических ссылок
  if (typeof value === 'object') {
    if (visited.has(value)) {
      return '[Circular Reference]';
    }
    visited.add(value);
  }
  
  // Обработка массивов
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '';
    }
    const unwrappedItems = value.map(item => 
      deepUnwrap(item, depth + 1, maxDepth, visited)
    ).filter(item => item !== '');
    return unwrappedItems.join(', ');
  }
  
  // Обработка объектов
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return '';
    }
    
    if (depth + 1 >= maxDepth) {
      return '[Too Deep]';
    }
    
    // Сериализация сложных объектов
    try {
      return JSON.stringify(value);
    } catch (error) {
      if (error.message.includes('circular') || error.message.includes('Converting circular')) {
        return '[Circular Reference]';
      }
      return '[Unstringifiable Object]';
    }
  }
  
  // Примитивные значения
  return String(value);
}

/**
 * Предобработка JSON данных путем глубокого разворачивания вложенных структур
 * 
 * @param {Array<Object>} data - Массив объектов для предобработки
 * @returns {Array<Object>} Предобработанные данные с развернутыми значениями
 */
export function preprocessData(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  
  return data.map(item => {
    if (!item || typeof item !== 'object') {
      return {};
    }
    
    const processed = {};
    
    for (const key in item) {
      if (Object.prototype.hasOwnProperty.call(item, key)) {
        const value = item[key];
        if (value && typeof value === 'object') {
          processed[key] = deepUnwrap(value);
        } else {
          processed[key] = value;
        }
      }
    }
    
    return processed;
  });
}

// Экспорт для Node.js совместимости
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    jsonToCsv,
    preprocessData,
    deepUnwrap
  };
}