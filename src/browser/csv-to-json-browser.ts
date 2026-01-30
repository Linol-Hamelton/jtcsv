// Браузерная версия CSV to JSON конвертера
// Адаптирована для работы в браузере без Node.js API

import {
  ValidationError,
  ParsingError,
  LimitError,
  ConfigurationError,
  safeExecute
} from './errors-browser';

import type { CsvToJsonOptions } from '../types';

/**
 * Валидация опций парсинга
 * @private
 */
function validateCsvOptions(options: CsvToJsonOptions): boolean {
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
  
  // Validate autoDetect
  if (options?.autoDetect !== undefined && typeof options.autoDetect !== 'boolean') {
    throw new ConfigurationError('autoDetect must be a boolean');
  }
  
  // Validate candidates
  if (options?.candidates && !Array.isArray(options.candidates)) {
    throw new ConfigurationError('candidates must be an array');
  }
  
  // Validate maxRows
  if (options?.maxRows !== undefined && (typeof options.maxRows !== 'number' || options.maxRows <= 0)) {
    throw new ConfigurationError('maxRows must be a positive number');
  }

  if (options?.warnExtraFields !== undefined && typeof options.warnExtraFields !== 'boolean') {
    throw new ConfigurationError('warnExtraFields must be a boolean');
  }
  
  return true;
}

/**
 * Автоматическое определение разделителя
 * @private
 */
function autoDetectDelimiter(text: string, candidates: string[] = [',', ';', '\t', '|']): string {
  if (!text || typeof text !== 'string') {
    return ',';
  }
  
  const firstLine = text.split('\n')[0];
  if (!firstLine) {
    return ',';
  }
  
  let bestCandidate = ',';
  let bestCount = 0;
  
  for (const candidate of candidates) {
    const count = (firstLine.match(new RegExp(candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count > bestCount) {
      bestCount = count;
      bestCandidate = candidate;
    }
  }
  
  return bestCandidate;
}

/**
 * Парсинг CSV строки в массив объектов
 * 
 * @param csvText - CSV текст для парсинга
 * @param options - Опции парсинга
 * @returns Массив объектов
 */
export function csvToJson(csvText: string, options: CsvToJsonOptions = {}): any[] {
  return safeExecute(() => {
    validateCsvOptions(options);
    
    if (typeof csvText !== 'string') {
      throw new ValidationError('CSV text must be a string');
    }
    
    if (csvText.trim() === '') {
      return [];
    }
    
    // Определение разделителя
    const delimiter = options.delimiter || 
      (options.autoDetect !== false ? autoDetectDelimiter(csvText, options.candidates) : ',');
    
    // Разделение на строки
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return [];
    }
    
    // Парсинг заголовков
    const headers = lines[0].split(delimiter).map(h => h.trim());
    
    // Ограничение количества строк
    const maxRows = options.maxRows || Infinity;
    const dataRows = lines.slice(1, Math.min(lines.length, maxRows + 1));
    
    // Парсинг данных
    const result = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const line = dataRows[i];
      const values = line.split(delimiter);
      const row: Record<string, any> = {};
      
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const value = j < values.length ? values[j].trim() : '';
        
        // Попытка парсинга чисел
        if (/^-?\d+(\.\d+)?$/.test(value)) {
          row[header] = parseFloat(value);
        } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          row[header] = value.toLowerCase() === 'true';
        } else {
          row[header] = value;
        }
      }
      
      result.push(row);
    }
    
    return result;
  });
}

/**
 * Асинхронная версия csvToJson
 */
export async function csvToJsonAsync(csvText: string, options: CsvToJsonOptions = {}): Promise<any[]> {
  return csvToJson(csvText, options);
}

/**
 * Создает итератор для потокового парсинга CSV
 * 
 * @param input - CSV текст, File или Blob
 * @param options - Опции парсинга
 * @returns AsyncGenerator
 */
export async function* csvToJsonIterator(input: string | File | Blob, options: CsvToJsonOptions = {}): AsyncGenerator<any> {
  validateCsvOptions(options);
  
  let csvText: string;
  
  if (typeof input === 'string') {
    csvText = input;
  } else if (input instanceof File || input instanceof Blob) {
    csvText = await input.text();
  } else {
    throw new ValidationError('Input must be string, File or Blob');
  }
  
  if (csvText.trim() === '') {
    return;
  }
  
  // Определение разделителя
  const delimiter = options.delimiter || 
    (options.autoDetect !== false ? autoDetectDelimiter(csvText, options.candidates) : ',');
  
  // Разделение на строки
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) {
    return;
  }
  
  // Парсинг заголовков
  const headers = lines[0].split(delimiter).map(h => h.trim());
  
  // Ограничение количества строк
  const maxRows = options.maxRows || Infinity;
  const dataRows = lines.slice(1, Math.min(lines.length, maxRows + 1));
  
  // Возврат данных по одной строке
  for (let i = 0; i < dataRows.length; i++) {
    const line = dataRows[i];
    const values = line.split(delimiter);
    const row: Record<string, any> = {};
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = j < values.length ? values[j].trim() : '';
      
      // Попытка парсинга чисел
      if (/^-?\d+(\.\d+)?$/.test(value)) {
        row[header] = parseFloat(value);
      } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        row[header] = value.toLowerCase() === 'true';
      } else {
        row[header] = value;
      }
    }
    
    yield row;
  }
}

/**
 * Асинхронная версия csvToJsonIterator (псевдоним)
 */
export const csvToJsonIteratorAsync = csvToJsonIterator;

/**
 * Парсинг CSV с обработкой ошибок
 * 
 * @param csvText - CSV текст
 * @param options - Опции парсинга
 * @returns Результат парсинга или null при ошибке
 */
export function parseCsvSafe(csvText: string, options: CsvToJsonOptions = {}): any[] | null {
  try {
    return csvToJson(csvText, options);
  } catch (error) {
    console.error('CSV parsing error:', error);
    return null;
  }
}

/**
 * Асинхронная версия parseCsvSafe
 */
export async function parseCsvSafeAsync(csvText: string, options: CsvToJsonOptions = {}): Promise<any[] | null> {
  try {
    return await csvToJsonAsync(csvText, options);
  } catch (error) {
    console.error('CSV parsing error:', error);
    return null;
  }
}

// Экспорт для Node.js совместимости
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    csvToJson,
    csvToJsonAsync,
    csvToJsonIterator,
    csvToJsonIteratorAsync,
    parseCsvSafe,
    parseCsvSafeAsync,
    autoDetectDelimiter
  };
}
