// Браузерная версия JSON to CSV конвертера
// Адаптирована для работы в браузере без Node.js API

import {
  ValidationError,
  ConfigurationError,
  LimitError,
  safeExecute
} from './errors-browser';

import type { JsonToCsvOptions } from '../types';

/**
 * Валидация входных данных и опций
 * @private
 */
function validateInput(data: any[], options: JsonToCsvOptions): boolean {
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

  if (options?.normalizeQuotes !== undefined && typeof options.normalizeQuotes !== 'boolean') {
    throw new ConfigurationError('normalizeQuotes must be a boolean');
  }
  
  return true;
}

/**
 * Экранирование CSV значений для предотвращения инъекций
 * @private
 */
function escapeCsvValue(value: string, preventInjection: boolean = true): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  const isPotentialFormula = (input: string): boolean => {
    let idx = 0;
    while (idx < input.length) {
      const code = input.charCodeAt(idx);
      if (code === 32 || code === 9 || code === 10 || code === 13 || code === 0xfeff) {
        idx++;
        continue;
      }
      break;
    }
    if (idx < input.length && (input[idx] === '"' || input[idx] === "'")) {
      idx++;
      while (idx < input.length) {
        const code = input.charCodeAt(idx);
        if (code === 32 || code === 9) {
          idx++;
          continue;
        }
        break;
      }
    }
    if (idx >= input.length) {
      return false;
    }
    const char = input[idx];
    return char === '=' || char === '+' || char === '-' || char === '@';
  };
  
  // Экранирование формул для предотвращения CSV инъекций
  if (preventInjection && isPotentialFormula(str)) {
    return "'" + str;
  }
  
  // Экранирование кавычек и переносов строк
  if (str.includes('"') || str.includes('\n') || str.includes('\r') || str.includes(',')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  
  return str;
}

function normalizeQuotesInField(value: string): string {
  // Не нормализуем кавычки в JSON-строках - это ломает структуру JSON
  // Проверяем, выглядит ли значение как JSON (объект или массив)
  if ((value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))) {
    return value; // Возвращаем как есть для JSON
  }
  
  let normalized = value.replace(/"{2,}/g, '"');
  // Убираем правило, которое ломает JSON: не заменяем "," на ","
  // normalized = normalized.replace(/"\s*,\s*"/g, ',');
  normalized = normalized.replace(/"\n/g, '\n').replace(/\n"/g, '\n');
  if (normalized.length >= 2 && normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }
  return normalized;
}

function normalizePhoneValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    return trimmed;
  }
  return trimmed.replace(/["'\\]/g, '');
}

function normalizeValueForCsv(value: any, key: string | undefined, normalizeQuotes: boolean): any {
  if (!normalizeQuotes || typeof value !== 'string') {
    return value;
  }
  const base = normalizeQuotesInField(value);
  if (!key) {
    return base;
  }
  const phoneKeys = new Set(['phone', 'phonenumber', 'phone_number', 'tel', 'telephone']);
  if (phoneKeys.has(String(key).toLowerCase())) {
    return normalizePhoneValue(base);
  }
  return base;
}

/**
 * Извлечение всех уникальных ключей из массива объектов
 * @private
 */
function extractAllKeys(data: any[]): string[] {
  const keys = new Set<string>();
  
  for (const item of data) {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(key => keys.add(key));
    }
  }
  
  return Array.from(keys);
}

/**
 * Конвертация массива объектов в CSV строку
 * 
 * @param data - Массив объектов для конвертации
 * @param options - Опции конвертации
 * @returns CSV строка
 */
export function jsonToCsv(data: any[], options: JsonToCsvOptions = {}): string {
  return safeExecute(() => {
    validateInput(data, options);
    
    if (data.length === 0) {
      return '';
    }
    
    // Настройки по умолчанию
    const delimiter = options.delimiter || ';';
    const includeHeaders = options.includeHeaders !== false;
    const maxRecords = options.maxRecords || data.length;
    const preventInjection = options.preventCsvInjection !== false;
    const rfc4180Compliant = options.rfc4180Compliant !== false;
    const normalizeQuotes = options.normalizeQuotes !== false;
    
    // Ограничение количества записей
    const limitedData = data.slice(0, maxRecords);
    
    // Извлечение всех ключей
    const allKeys = extractAllKeys(limitedData);
    
    // Применение renameMap если есть
    const renameMap = options.renameMap || {};
    const finalKeys = allKeys.map(key => renameMap[key] || key);
    
    // Создание CSV строки
    const lines: string[] = [];
    
    // Заголовки
    if (includeHeaders) {
      const headerLine = finalKeys.map(key => escapeCsvValue(key, preventInjection)).join(delimiter);
      lines.push(headerLine);
    }
    
    // Данные
    for (const item of limitedData) {
      const rowValues = allKeys.map(key => {
        const value = item?.[key];
        const normalized = normalizeValueForCsv(value, key, normalizeQuotes);
        return escapeCsvValue(normalized, preventInjection);
      });
      
      lines.push(rowValues.join(delimiter));
    }
    
    // RFC 4180 compliance: CRLF line endings
    if (rfc4180Compliant) {
      return lines.join('\r\n');
    }
    
    return lines.join('\n');
  });
}

/**
 * Асинхронная версия jsonToCsv
 */
export async function jsonToCsvAsync(data: any[], options: JsonToCsvOptions = {}): Promise<string> {
  return jsonToCsv(data, options);
}

/**
 * Создает итератор для потоковой конвертации JSON в CSV
 * 
 * @param data - Массив объектов или async итератор
 * @param options - Опции конвертации
 * @returns AsyncIterator с CSV чанками
 */
export async function* jsonToCsvIterator(data: any[] | AsyncIterable<any>, options: JsonToCsvOptions = {}): AsyncGenerator<string> {
  validateInput(Array.isArray(data) ? data : [], options);
  
  const delimiter = options.delimiter || ';';
  const includeHeaders = options.includeHeaders !== false;
  const preventInjection = options.preventCsvInjection !== false;
  const rfc4180Compliant = options.rfc4180Compliant !== false;
  const normalizeQuotes = options.normalizeQuotes !== false;
  
  let isFirstChunk = true;
  let allKeys: string[] = [];
  let renameMap: Record<string, string> = {};
  
  // Если данные - массив, обрабатываем как массив
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return;
    }
    
    allKeys = extractAllKeys(data);
    renameMap = options.renameMap || {};
    const finalKeys = allKeys.map(key => renameMap[key] || key);
    
    // Заголовки
    if (includeHeaders) {
      const headerLine = finalKeys.map(key => escapeCsvValue(key, preventInjection)).join(delimiter);
      yield headerLine + (rfc4180Compliant ? '\r\n' : '\n');
    }
    
    // Данные
    for (const item of data) {
      const rowValues = allKeys.map(key => {
        const value = item?.[key];
        const normalized = normalizeValueForCsv(value, key, normalizeQuotes);
        return escapeCsvValue(normalized, preventInjection);
      });
      
      yield rowValues.join(delimiter) + (rfc4180Compliant ? '\r\n' : '\n');
    }
  } else {
    // Для async итератора нужна другая логика
    throw new ValidationError('Async iterators not yet implemented in browser version');
  }
}

/**
 * Асинхронная версия jsonToCsvIterator (псевдоним)
 */
export const jsonToCsvIteratorAsync = jsonToCsvIterator;

/**
 * Безопасная конвертация с обработкой ошибок
 * 
 * @param data - Массив объектов
 * @param options - Опции конвертации
 * @returns CSV строка или null при ошибке
 */
export function jsonToCsvSafe(data: any[], options: JsonToCsvOptions = {}): string | null {
  try {
    return jsonToCsv(data, options);
  } catch (error) {
    console.error('JSON to CSV conversion error:', error);
    return null;
  }
}

/**
 * Асинхронная версия jsonToCsvSafe
 */
export async function jsonToCsvSafeAsync(data: any[], options: JsonToCsvOptions = {}): Promise<string | null> {
  try {
    return await jsonToCsvAsync(data, options);
  } catch (error) {
    console.error('JSON to CSV conversion error:', error);
    return null;
  }
}

// Экспорт для Node.js совместимости
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    jsonToCsv,
    jsonToCsvAsync,
    jsonToCsvIterator,
    jsonToCsvIteratorAsync,
    jsonToCsvSafe,
    jsonToCsvSafeAsync
  };
}
