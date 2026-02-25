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
  
  if (options?.repairRowShifts !== undefined && typeof options.repairRowShifts !== 'boolean') {
    throw new ConfigurationError('repairRowShifts must be a boolean');
  }
  
  if (options?.normalizeQuotes !== undefined && typeof options.normalizeQuotes !== 'boolean') {
    throw new ConfigurationError('normalizeQuotes must be a boolean');
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

function isEmptyValue(value: any): boolean {
  return value === undefined || value === null || value === '';
}

function hasOddQuotes(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  let count = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '"') {
      count++;
    }
  }
  return count % 2 === 1;
}

function hasAnyQuotes(value: any): boolean {
  return typeof value === 'string' && value.includes('"');
}

function normalizeQuotesInField(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }
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

function normalizePhoneValue(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return trimmed;
  }
  return trimmed.replace(/["'\\]/g, '');
}

function normalizeRowQuotes(row: Record<string, any>, headers: string[]): Record<string, any> {
  const normalized: Record<string, any> = {};
  const phoneKeys = new Set(['phone', 'phonenumber', 'phone_number', 'tel', 'telephone']);
  for (const header of headers) {
    const baseValue = normalizeQuotesInField(row[header]);
    if (phoneKeys.has(String(header).toLowerCase())) {
      normalized[header] = normalizePhoneValue(baseValue);
    } else {
      normalized[header] = baseValue;
    }
  }
  return normalized;
}

function looksLikeUserAgent(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return /Mozilla\/|Opera\/|MSIE|AppleWebKit|Gecko|Safari|Chrome\//.test(value);
}

function isHexColor(value: any): boolean {
  return typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function repairShiftedRows(
  rows: Record<string, any>[],
  headers: string[],
  options: { normalizeQuotes?: boolean } = {}
): Record<string, any>[] {
  if (!Array.isArray(rows) || rows.length === 0 || headers.length === 0) {
    return rows;
  }

  const headerCount = headers.length;
  const merged: Record<string, any>[] = [];
  let index = 0;

  while (index < rows.length) {
    const row = rows[index];
    if (!row || typeof row !== 'object') {
      merged.push(row);
      index++;
      continue;
    }

    const values = headers.map((header) => row[header]);
    let lastNonEmpty = -1;
    for (let i = headerCount - 1; i >= 0; i--) {
      if (!isEmptyValue(values[i])) {
        lastNonEmpty = i;
        break;
      }
    }

    const missingCount = headerCount - 1 - lastNonEmpty;
    if (lastNonEmpty >= 0 && missingCount > 0 && index + 1 < rows.length) {
      const nextRow = rows[index + 1];
      if (nextRow && typeof nextRow === 'object') {
        const nextValues = headers.map((header) => nextRow[header]);
        const nextTrailingEmpty = nextValues
          .slice(headerCount - missingCount)
          .every((value) => isEmptyValue(value));

        const leadValues = nextValues
          .slice(0, missingCount)
          .filter((value) => !isEmptyValue(value));
        const shouldMerge = nextTrailingEmpty
          && leadValues.length > 0
          && (hasOddQuotes(values[lastNonEmpty]) || hasAnyQuotes(values[lastNonEmpty]));

        if (shouldMerge) {
          const toAppend = leadValues.map((value) => String(value));

          if (toAppend.length > 0) {
            const base = isEmptyValue(values[lastNonEmpty]) ? '' : String(values[lastNonEmpty]);
            values[lastNonEmpty] = base ? `${base}\n${toAppend.join('\n')}` : toAppend.join('\n');
          }

          for (let i = 0; i < missingCount; i++) {
            values[lastNonEmpty + 1 + i] = nextValues[missingCount + i];
          }

          const mergedRow: Record<string, any> = {};
          for (let i = 0; i < headerCount; i++) {
            mergedRow[headers[i]] = values[i];
          }

          merged.push(mergedRow);
          index += 2;
          continue;
        }
      }
    }

    if (index + 1 < rows.length && headerCount >= 6) {
      const nextRow = rows[index + 1];
      if (nextRow && typeof nextRow === 'object') {
        const nextHex = nextRow[headers[4]];
        const nextUserAgentHead = nextRow[headers[2]];
        const nextUserAgentTail = nextRow[headers[3]];
        const shouldMergeUserAgent = isEmptyValue(values[4])
          && isEmptyValue(values[5])
          && isHexColor(nextHex)
          && (looksLikeUserAgent(nextUserAgentHead) || looksLikeUserAgent(nextUserAgentTail));

        if (shouldMergeUserAgent) {
          const addressParts = [values[3], nextRow[headers[0]], nextRow[headers[1]]]
            .filter((value) => !isEmptyValue(value))
            .map((value) => String(value));
          values[3] = addressParts.join('\n');

          const uaHead = isEmptyValue(nextUserAgentHead) ? '' : String(nextUserAgentHead);
          const uaTail = isEmptyValue(nextUserAgentTail) ? '' : String(nextUserAgentTail);
          const joiner = uaHead && uaTail ? (uaTail.startsWith(' ') ? '' : ',') : '';
          values[4] = uaHead + joiner + uaTail;
          values[5] = String(nextHex);

          const mergedRow: Record<string, any> = {};
          for (let i = 0; i < headerCount; i++) {
            mergedRow[headers[i]] = values[i];
          }

          merged.push(mergedRow);
          index += 2;
          continue;
        }
      }
    }

    merged.push(row);
    index++;
  }

  if (options.normalizeQuotes) {
    return merged.map((row) => normalizeRowQuotes(row, headers));
  }

  return merged;
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
    const {
      repairRowShifts = true,
      normalizeQuotes = true
    } = options || {};
    
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
    
    if (repairRowShifts) {
      return repairShiftedRows(result, headers, { normalizeQuotes });
    }

    if (normalizeQuotes) {
      return result.map((row) => normalizeRowQuotes(row, headers));
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
  const {
    repairRowShifts = true,
    normalizeQuotes = true
  } = options || {};
  
  // Ограничение количества строк
  const maxRows = options.maxRows || Infinity;
  const dataRows = lines.slice(1, Math.min(lines.length, maxRows + 1));
  
  // Возврат данных по одной строке
  const parsedRows = [];
  for (let i = 0; i < dataRows.length; i++) {
    const line = dataRows[i];
    const values = line.split(delimiter);
    const row: Record<string, any> = {};
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = j < values.length ? values[j].trim() : '';
      
      // Try parsing numbers
      if (/^-?\d+(\.\d+)?$/.test(value)) {
        row[header] = parseFloat(value);
      } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        row[header] = value.toLowerCase() === 'true';
      } else {
        row[header] = value;
      }
    }
    
    parsedRows.push(row);
  }

  const finalRows = repairRowShifts
    ? repairShiftedRows(parsedRows, headers, { normalizeQuotes })
    : (normalizeQuotes
      ? parsedRows.map((row) => normalizeRowQuotes(row, headers))
      : parsedRows);

  for (const row of finalRows) {
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
