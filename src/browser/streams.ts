import {
  ValidationError,
  ConfigurationError,
  LimitError
} from './errors-browser';
import { csvToJsonIterator } from './csv-to-json-browser';

import type { CsvToJsonOptions, JsonToCsvOptions } from '../types';

const DEFAULT_MAX_CHUNK_SIZE = 64 * 1024;
const PHONE_KEYS = new Set(['phone', 'phonenumber', 'phone_number', 'tel', 'telephone']);

function isReadableStream(value: any): value is ReadableStream {
  return value && typeof value.getReader === 'function';
}

function isAsyncIterable(value: any): value is AsyncIterable<any> {
  return value && typeof value[Symbol.asyncIterator] === 'function';
}

function isIterable(value: any): value is Iterable<any> {
  return value && typeof value[Symbol.iterator] === 'function';
}

function createReadableStreamFromIterator<T>(iterator: AsyncIterator<T>): ReadableStream<T> {
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      if (iterator.return) {
        iterator.return();
      }
    }
  });
}

function detectInputFormat(input: any, options: any): 'json' | 'ndjson' | 'csv' | 'unknown' {
  if (options && options.inputFormat) {
    return options.inputFormat;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') {
      return 'unknown';
    }

    // Проверка на NDJSON (каждая строка - валидный JSON)
    if (trimmed.includes('\n')) {
      const lines = trimmed.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        try {
          JSON.parse(lines[0]);
          return 'ndjson';
        } catch {
          // Не NDJSON
        }
      }
    }

    // Проверка на JSON
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) || (parsed && typeof parsed === 'object')) {
        return 'json';
      }
    } catch {
      // Не JSON
    }

    // Проверка на CSV
    if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('\t')) {
      return 'csv';
    }
  }

  return 'unknown';
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
  if (key && PHONE_KEYS.has(String(key).toLowerCase())) {
    return normalizePhoneValue(base);
  }
  return base;
}

async function* jsonToCsvChunkIterator(input: any, options: JsonToCsvOptions = {}): AsyncGenerator<string> {
  const format = detectInputFormat(input, options);
  
  if (format === 'csv') {
    throw new ValidationError('Input appears to be CSV, not JSON');
  }

  // Вспомогательная функция для создания асинхронного итератора
  function toAsyncIterator<T>(iterable: Iterable<T> | AsyncIterable<T>): AsyncIterator<T> {
    if (isAsyncIterable(iterable)) {
      return iterable[Symbol.asyncIterator]();
    }
    
    if (isIterable(iterable)) {
      const syncIterator = iterable[Symbol.iterator]();
      return {
        next: () => Promise.resolve(syncIterator.next()),
        return: syncIterator.return ? () => Promise.resolve(syncIterator.return!()) : undefined,
        throw: syncIterator.throw ? (error: any) => Promise.resolve(syncIterator.throw!(error)) : undefined
      };
    }
    
    throw new ValidationError('Input is not iterable');
  }

  let iterator: AsyncIterator<any>;
  
  if (isAsyncIterable(input) || isIterable(input)) {
    iterator = toAsyncIterator(input);
  } else if (typeof input === 'string') {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      iterator = toAsyncIterator(parsed);
    } else {
      iterator = toAsyncIterator([parsed]);
    }
  } else if (Array.isArray(input)) {
    iterator = toAsyncIterator(input);
  } else {
    iterator = toAsyncIterator([input]);
  }

  const delimiter = options.delimiter || ';';
  const includeHeaders = options.includeHeaders !== false;
  const preventInjection = options.preventCsvInjection !== false;
  const normalizeQuotes = options.normalizeQuotes !== false;
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
  
  let isFirstChunk = true;
  let headers: string[] = [];
  
  while (true) {
    const { value, done } = await iterator.next();
    if (done) break;

    const item = value;
    
    if (isFirstChunk) {
      // Извлечение заголовков из первого элемента
      headers = Object.keys(item);
      
      if (includeHeaders) {
        const headerLine = headers.map(header => {
          const escaped = header.includes('"') ? `"${header.replace(/"/g, '""')}"` : header;
          return preventInjection && isPotentialFormula(escaped) ? `'${escaped}` : escaped;
        }).join(delimiter);
        
        yield headerLine + '\n';
      }
      
      isFirstChunk = false;
    }
    
    const row = headers.map(header => {
      const value = item[header];
      const normalized = normalizeValueForCsv(value, header, normalizeQuotes);
      const strValue = normalized === null || normalized === undefined ? '' : String(normalized);
      
      if (strValue.includes('"') || strValue.includes('\n') || strValue.includes('\r') || strValue.includes(delimiter)) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      
      if (preventInjection && isPotentialFormula(strValue)) {
        return `'${strValue}`;
      }
      
      return strValue;
    }).join(delimiter);
    
    yield row + '\n';
  }
}

async function* jsonToNdjsonChunkIterator(input: any, options: any = {}): AsyncGenerator<string> {
  const format = detectInputFormat(input, options);
  
  // Вспомогательная функция для создания асинхронного итератора
  function toAsyncIterator<T>(iterable: Iterable<T> | AsyncIterable<T>): AsyncIterator<T> {
    if (isAsyncIterable(iterable)) {
      return iterable[Symbol.asyncIterator]();
    }
    
    if (isIterable(iterable)) {
      const syncIterator = iterable[Symbol.iterator]();
      return {
        next: () => Promise.resolve(syncIterator.next()),
        return: syncIterator.return ? () => Promise.resolve(syncIterator.return!()) : undefined,
        throw: syncIterator.throw ? (error: any) => Promise.resolve(syncIterator.throw!(error)) : undefined
      };
    }
    
    throw new ValidationError('Input is not iterable');
  }

  let iterator: AsyncIterator<any>;
  
  if (isAsyncIterable(input) || isIterable(input)) {
    iterator = toAsyncIterator(input);
  } else if (typeof input === 'string') {
    if (format === 'ndjson') {
      const lines = input.split('\n').filter(line => line.trim() !== '');
      iterator = toAsyncIterator(lines);
    } else {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        iterator = toAsyncIterator(parsed);
      } else {
        iterator = toAsyncIterator([parsed]);
      }
    }
  } else if (Array.isArray(input)) {
    iterator = toAsyncIterator(input);
  } else {
    iterator = toAsyncIterator([input]);
  }

  while (true) {
    const { value, done } = await iterator.next();
    if (done) break;

    let jsonStr: string;
    
    if (typeof value === 'string') {
      try {
        // Проверяем, является ли строка валидным JSON
        JSON.parse(value);
        jsonStr = value;
      } catch {
        // Если нет, сериализуем как JSON
        jsonStr = JSON.stringify(value);
      }
    } else {
      jsonStr = JSON.stringify(value);
    }
    
    yield jsonStr + '\n';
  }
}

async function* csvToJsonChunkIterator(input: any, options: CsvToJsonOptions = {}): AsyncGenerator<any> {
  if (typeof input === 'string') {
    // Используем csvToJsonIterator из csv-to-json-browser
    yield* csvToJsonIterator(input, options);
  } else if (input instanceof File || input instanceof Blob) {
    const text = await input.text();
    yield* csvToJsonIterator(text, options);
  } else if (isReadableStream(input)) {
    const reader = input.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Обработка буфера по строкам
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        // TODO: Реализовать парсинг CSV из чанков
        // Пока просто возвращаем сырые строки
        for (const line of lines) {
          if (line.trim()) {
            yield { raw: line };
          }
        }
      }
      
      // Обработка остатка буфера
      if (buffer.trim()) {
        yield { raw: buffer };
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    throw new ValidationError('Unsupported input type for CSV streaming');
  }
}

export function jsonToCsvStream(input: any, options: JsonToCsvOptions = {}): ReadableStream<string> {
  const iterator = jsonToCsvChunkIterator(input, options);
  return createReadableStreamFromIterator(iterator);
}

export function jsonToNdjsonStream(input: any, options: any = {}): ReadableStream<string> {
  const iterator = jsonToNdjsonChunkIterator(input, options);
  return createReadableStreamFromIterator(iterator);
}

export function csvToJsonStream(input: any, options: CsvToJsonOptions = {}): ReadableStream<any> {
  const iterator = csvToJsonChunkIterator(input, options);
  return createReadableStreamFromIterator(iterator);
}

/**
 * Асинхронная версия jsonToCsvStream
 */
export async function jsonToCsvStreamAsync(input: any, options: JsonToCsvOptions = {}): Promise<ReadableStream<string>> {
  return jsonToCsvStream(input, options);
}

/**
 * Асинхронная версия jsonToNdjsonStream
 */
export async function jsonToNdjsonStreamAsync(input: any, options: any = {}): Promise<ReadableStream<string>> {
  return jsonToNdjsonStream(input, options);
}

/**
 * Асинхронная версия csvToJsonStream
 */
export async function csvToJsonStreamAsync(input: any, options: CsvToJsonOptions = {}): Promise<ReadableStream<any>> {
  return csvToJsonStream(input, options);
}

// Экспорт для Node.js совместимости
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    jsonToCsvStream,
    jsonToCsvStreamAsync,
    jsonToNdjsonStream,
    jsonToNdjsonStreamAsync,
    csvToJsonStream,
    csvToJsonStreamAsync,
    createReadableStreamFromIterator
  };
}
