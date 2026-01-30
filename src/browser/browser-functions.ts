// Браузерные специфичные функции для jtcsv
// Функции, которые работают только в браузере

import { jsonToCsv } from './json-to-csv-browser';
import { csvToJson, csvToJsonIterator } from './csv-to-json-browser';
import { 
  csvToJsonStream as createCsvToJsonStream, 
  jsonToCsvStream as createJsonToCsvStream, 
  jsonToNdjsonStream as createJsonToNdjsonStream 
} from './streams';
import { ValidationError } from './errors-browser';

import type { JsonToCsvOptions, CsvToJsonOptions } from '../types';

/**
 * Скачивает JSON данные как CSV файл
 * 
 * @param data - Массив объектов для конвертации
 * @param filename - Имя файла для скачивания (по умолчанию 'data.csv')
 * @param options - Опции для jsonToCsv
 * 
 * @example
 * const data = [
 *   { id: 1, name: 'John' },
 *   { id: 2, name: 'Jane' }
 * ];
 * downloadAsCsv(data, 'users.csv', { delimiter: ',' });
 */
export function downloadAsCsv(
  data: any[],
  filename: string = 'data.csv',
  options: JsonToCsvOptions = {}
): void {
  // Проверка что мы в браузере
  if (typeof window === 'undefined') {
    throw new ValidationError('downloadAsCsv() работает только в браузере. Используйте saveAsCsv() в Node.js');
  }
  
  // Валидация имени файла
  if (typeof filename !== 'string' || filename.trim() === '') {
    throw new ValidationError('Filename must be a non-empty string');
  }
  
  // Добавление расширения .csv если его нет
  if (!filename.toLowerCase().endsWith('.csv')) {
    filename += '.csv';
  }
  
  // Конвертация в CSV
  const csv = jsonToCsv(data, options);
  
  // Создание Blob
  const blob = new Blob([csv], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  // Создание ссылки для скачивания
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Освобождение URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Асинхронная версия downloadAsCsv
 */
export async function downloadAsCsvAsync(
  data: any[],
  filename: string = 'data.csv',
  options: JsonToCsvOptions = {}
): Promise<void> {
  return downloadAsCsv(data, filename, options);
}

/**
 * Парсит CSV файл из input[type="file"]
 * 
 * @param file - File объект из input
 * @param options - Опции для csvToJson
 * @returns Promise с распарсенными данными
 */
export async function parseCsvFile(
  file: File,
  options: CsvToJsonOptions = {}
): Promise<any[]> {
  if (!(file instanceof File)) {
    throw new ValidationError('parseCsvFile() ожидает объект File');
  }
  
  // Чтение файла как текст
  const text = await file.text();
  
  // Парсинг CSV
  return csvToJson(text, options);
}

/**
 * Парсит CSV файл потоково
 * 
 * @param file - File объект
 * @param options - Опции для потокового парсинга
 * @returns AsyncIterator с данными
 */
export function parseCsvFileStream(
  file: File,
  options: CsvToJsonOptions = {}
): AsyncIterator<any> {
  if (!(file instanceof File)) {
    throw new ValidationError('parseCsvFileStream() ожидает объект File');
  }
  
  // Используем csvToJsonIterator из импортированного модуля
  return csvToJsonIterator(file, options);
}

/**
 * Создает поток для конвертации JSON в CSV
 * 
 * @param options - Опции для jsonToCsv
 * @returns ReadableStream
 */
export function jsonToCsvStream(options: JsonToCsvOptions = {}): ReadableStream {
  return createJsonToCsvStream(options);
}

/**
 * Создает поток для конвертации JSON в NDJSON
 * 
 * @param options - Опции для конвертации
 * @returns ReadableStream
 */
export function jsonToNdjsonStream(options: any = {}): ReadableStream {
  return createJsonToNdjsonStream(options);
}

/**
 * Создает поток для парсинга CSV в JSON
 * 
 * @param options - Опции для csvToJson
 * @returns ReadableStream
 */
export function csvToJsonStream(options: CsvToJsonOptions = {}): ReadableStream {
  return createCsvToJsonStream(options);
}

/**
 * Загружает CSV файл по URL
 * 
 * @param url - URL CSV файла
 * @param options - Опции для csvToJson
 * @returns Promise с распарсенными данными
 */
export async function loadCsvFromUrl(
  url: string,
  options: CsvToJsonOptions = {}
): Promise<any[]> {
  if (typeof window === 'undefined') {
    throw new ValidationError('loadCsvFromUrl() работает только в браузере');
  }
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new ValidationError(`Failed to load CSV from URL: ${response.status} ${response.statusText}`);
  }
  
  const text = await response.text();
  return csvToJson(text, options);
}

/**
 * Асинхронная версия loadCsvFromUrl
 */
export async function loadCsvFromUrlAsync(
  url: string,
  options: CsvToJsonOptions = {}
): Promise<any[]> {
  return loadCsvFromUrl(url, options);
}

/**
 * Экспортирует данные в CSV и открывает в новой вкладке
 * 
 * @param data - Данные для экспорта
 * @param options - Опции для jsonToCsv
 */
export function openCsvInNewTab(
  data: any[],
  options: JsonToCsvOptions = {}
): void {
  if (typeof window === 'undefined') {
    throw new ValidationError('openCsvInNewTab() работает только в браузере');
  }
  
  const csv = jsonToCsv(data, options);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  window.open(url, '_blank');
  
  // Освобождение URL через некоторое время
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Асинхронная версия openCsvInNewTab
 */
export async function openCsvInNewTabAsync(
  data: any[],
  options: JsonToCsvOptions = {}
): Promise<void> {
  return openCsvInNewTab(data, options);
}

/**
 * Копирует CSV в буфер обмена
 * 
 * @param data - Данные для копирования
 * @param options - Опции для jsonToCsv
 * @returns Promise с результатом копирования
 */
export async function copyCsvToClipboard(
  data: any[],
  options: JsonToCsvOptions = {}
): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.clipboard) {
    throw new ValidationError('copyCsvToClipboard() требует поддержки Clipboard API');
  }
  
  const csv = jsonToCsv(data, options);
  
  try {
    await navigator.clipboard.writeText(csv);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Сохраняет CSV в localStorage
 * 
 * @param key - Ключ для сохранения
 * @param data - Данные для сохранения
 * @param options - Опции для jsonToCsv
 */
export function saveCsvToLocalStorage(
  key: string,
  data: any[],
  options: JsonToCsvOptions = {}
): void {
  if (typeof window === 'undefined' || !localStorage) {
    throw new ValidationError('saveCsvToLocalStorage() требует localStorage');
  }
  
  const csv = jsonToCsv(data, options);
  localStorage.setItem(key, csv);
}

/**
 * Загружает CSV из localStorage
 * 
 * @param key - Ключ для загрузки
 * @param options - Опции для csvToJson
 * @returns Распарсенные данные или null
 */
export function loadCsvFromLocalStorage(
  key: string,
  options: CsvToJsonOptions = {}
): any[] | null {
  if (typeof window === 'undefined' || !localStorage) {
    throw new ValidationError('loadCsvFromLocalStorage() требует localStorage');
  }
  
  const csv = localStorage.getItem(key);
  
  if (!csv) {
    return null;
  }
  
  return csvToJson(csv, options);
}

/**
 * Асинхронная версия loadCsvFromLocalStorage
 */
export async function loadCsvFromLocalStorageAsync(
  key: string,
  options: CsvToJsonOptions = {}
): Promise<any[] | null> {
  return loadCsvFromLocalStorage(key, options);
}

/**
 * Создает CSV файл из JSON данных (альтернатива downloadAsCsv)
 * Возвращает Blob вместо автоматического скачивания
 * 
 * @param data - Массив объектов
 * @param options - Опции для jsonToCsv
 * @returns CSV Blob
 */
export function createCsvBlob(
  data: any[],
  options: JsonToCsvOptions = {}
): Blob {
  const csv = jsonToCsv(data, options);
  return new Blob([csv], { 
    type: 'text/csv;charset=utf-8;' 
  });
}

/**
 * Асинхронная версия createCsvBlob
 */
export async function createCsvBlobAsync(
  data: any[],
  options: JsonToCsvOptions = {}
): Promise<Blob> {
  return createCsvBlob(data, options);
}

/**
 * Парсит CSV строку из Blob
 * 
 * @param blob - CSV Blob
 * @param options - Опции для csvToJson
 * @returns Promise с JSON данными
 */
export async function parseCsvBlob(
  blob: Blob,
  options: CsvToJsonOptions = {}
): Promise<any[]> {
  if (!(blob instanceof Blob)) {
    throw new ValidationError('Input must be a Blob object');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function (event: ProgressEvent<FileReader>) {
      try {
        const csvText = event.target?.result as string;
        const json = csvToJson(csvText, options);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = function () {
      reject(new ValidationError('Ошибка чтения Blob'));
    };
    
    reader.readAsText(blob, 'UTF-8');
  });
}

/**
 * Асинхронная версия parseCsvBlob
 */
export async function parseCsvBlobAsync(
  blob: Blob,
  options: CsvToJsonOptions = {}
): Promise<any[]> {
  return parseCsvBlob(blob, options);
}

// Экспорт для Node.js совместимости
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    downloadAsCsv,
    downloadAsCsvAsync,
    parseCsvFile,
    parseCsvFileStream,
    createCsvBlob,
    createCsvBlobAsync,
    parseCsvBlob,
    parseCsvBlobAsync,
    jsonToCsvStream,
    jsonToNdjsonStream,
    csvToJsonStream,
    loadCsvFromUrl,
    loadCsvFromUrlAsync,
    openCsvInNewTab,
    openCsvInNewTabAsync,
    copyCsvToClipboard,
    saveCsvToLocalStorage,
    loadCsvFromLocalStorage,
    loadCsvFromLocalStorageAsync
  };
}

