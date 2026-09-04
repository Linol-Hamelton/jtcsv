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
import { createValueNormalizer } from '../core/value-normalizer';

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
 * Автоматическое определение разделителя.
 *
 * Часть публичного API `jtcsv/browser` (см. browser.d.ts) — ранее
 * значилась только в CommonJS-блоке `module.exports` внизу файла, из-за
 * чего ESM-сборка её не видела.
 */
export function autoDetectDelimiter(text: string, candidates: string[] = [',', ';', '\t', '|']): string {
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
 * Токенизатор CSV по RFC 4180: режет текст на записи из «сырых» полей.
 *
 * Раньше здесь было `text.split('\n')` + `line.split(delimiter)` — без
 * какого-либо понятия о кавычках. Поле, содержащее разделитель, перевод
 * строки или экранированную кавычку, молча разрывалось на части, и ошибку
 * никто не поднимал. Целый слой эвристик (`repairShiftedRows`,
 * `normalizeQuotesInField`, плюс жёстко зашитое правило про user-agent и
 * hex-цвет под конкретную фикстуру) существовал только чтобы это
 * замаскировать — корректная токенизация делает их ненужными.
 *
 * Внутри закавыченного поля разделитель, CR, LF и `""` (литеральная
 * кавычка) — это данные. Пустые записи пропускаются, как в Node-парсере.
 *
 * @throws ParsingError если закавыченное поле не закрыто.
 */
function tokenizeCsv(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  // Запись считается начатой, только когда реально что-то появилось —
  // символ, кавычка или разделитель. Благодаря этому пустые строки
  // схлопываются сами собой.
  let started = false;

  const endRecord = (): void => {
    if (!started) {
      return;
    }
    record.push(field);
    records.push(record);
    record = [];
    field = '';
    started = false;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char !== '"') {
        field += char;
      } else if (text[i + 1] === '"') {
        // "" внутри кавычек — это одна литеральная кавычка.
        field += '"';
        i++;
      } else {
        inQuotes = false;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      started = true;
    } else if (char === delimiter) {
      record.push(field);
      field = '';
      started = true;
    } else if (char === '\n') {
      endRecord();
    } else if (char === '\r') {
      // И CRLF, и одиночный CR завершают запись.
      if (text[i + 1] === '\n') {
        i++;
      }
      endRecord();
    } else {
      field += char;
      started = true;
    }
  }

  if (inQuotes) {
    throw new ParsingError('Unclosed quotes in CSV');
  }

  endRecord();
  return records;
}

/**
 * Приводит одно токенизированное поле к тому же значению, что выдаёт
 * Node-парсер: пробелы по краям срезаются, пустое поле (закавыченное или
 * нет) становится `null`, а числовые строки конвертируются только при
 * включённом `parseNumbers`.
 *
 * Раньше браузерный парсер безусловно приводил и числа, и булевы значения,
 * полностью игнорируя `parseNumbers`, — один и тот же CSV давал разные
 * типы в Node и в браузере.
 */
// Field coercion lives in src/core/value-normalizer so that both runtimes
// apply the same rule. The local version here ignored `trim`, never
// implemented `parseBooleans`, matched a narrower set of numbers, and left the
// preventCsvInjection apostrophe in place, so the browser disagreed with Node
// on six kinds of value.

/**
 * Собирает объекты строк из токенизированных записей по тем же правилам
 * формы, что и Node: поля сверх количества заголовков отбрасываются, а
 * заголовки, которым в короткой записи не хватило поля, попадают в объект
 * со значением undefined.
 */
function recordsToRows(
  records: string[][],
  options: CsvToJsonOptions
): Record<string, any>[] {
  if (records.length === 0) {
    return [];
  }

  const headers = records[0].map((header) => header.trim());
  const dataRecords = records.slice(1);
  const parseNumbers = options.parseNumbers === true;

  if (options.maxRows !== undefined && dataRecords.length > options.maxRows) {
    throw new LimitError(
      `CSV size exceeds maximum limit of ${options.maxRows} rows`,
      options.maxRows,
      dataRecords.length
    );
  }

  const normalizeValue = createValueNormalizer(
    options.trim !== false,
    parseNumbers,
    options.parseBooleans === true
  );

  const rows: Record<string, any>[] = [];
  for (const record of dataRecords) {
    const row: Record<string, any> = {};
    for (let i = 0; i < headers.length; i++) {
      // A header with no field in this record still gets its key, holding
      // undefined — the shape Node produces. Omitting the key instead made the
      // two runtimes return different shapes for the same short row, and
      // Jest's toEqual ignores undefined properties, so the parity suite could
      // not see the difference.
      row[headers[i]] = normalizeValue(record[i]);
    }
    rows.push(row);
  }

  return rows;
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
    
    return recordsToRows(tokenizeCsv(csvText, delimiter), options);
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
  
  for (const row of recordsToRows(tokenizeCsv(csvText, delimiter), options)) {
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
