// Браузерные специфичные функции для jtcsv
// Функции, которые работают только в браузере

import { jsonToCsv } from './json-to-csv-browser.js';
import { csvToJson, csvToJsonIterator } from './csv-to-json-browser.js';
import { ValidationError } from './errors-browser.js';

/**
 * Скачивает JSON данные как CSV файл
 * 
 * @param {Array<Object>} data - Массив объектов для конвертации
 * @param {string} [filename='data.csv'] - Имя файла для скачивания
 * @param {Object} [options] - Опции для jsonToCsv
 * @returns {void}
 * 
 * @example
 * const data = [
 *   { id: 1, name: 'John' },
 *   { id: 2, name: 'Jane' }
 * ];
 * downloadAsCsv(data, 'users.csv', { delimiter: ',' });
 */
export function downloadAsCsv(data, filename = 'data.csv', options = {}) {
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
  
  // Создание URL для Blob
  const url = URL.createObjectURL(blob);
  
  // Настройка ссылки
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Добавление в DOM и клик
  document.body.appendChild(link);
  link.click();
  
  // Очистка
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Парсит CSV файл из input[type="file"] в JSON
 * 
 * @param {File} file - File объект из input
 * @param {Object} [options] - Опции для csvToJson
 * @returns {Promise<Array<Object>>} Promise с JSON данными
 * 
 * @example
 * // HTML: <input type="file" id="csvFile" accept=".csv">
 * const fileInput = document.getElementById('csvFile');
 * const json = await parseCsvFile(fileInput.files[0], { delimiter: ',' });
 */
export async function parseCsvFile(file, options = {}) {
  // Проверка что мы в браузере
  if (typeof window === 'undefined') {
    throw new ValidationError('parseCsvFile() работает только в браузере. Используйте readCsvAsJson() в Node.js');
  }
  
  // Валидация файла
  if (!(file instanceof File)) {
    throw new ValidationError('Input must be a File object');
  }
  
  // Проверка расширения файла
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new ValidationError('File must have .csv extension');
  }
  
  // Проверка размера файла (предупреждение для больших файлов)
  const MAX_SIZE_WARNING = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_SIZE_WARNING && process.env.NODE_ENV !== 'production') {
    console.warn(
      `⚠️ Warning: Processing large file (${(file.size / 1024 / 1024).toFixed(2)}MB).\n` +
      '💡 Consider using Web Workers for better performance.\n' +
      '🔧 Tip: Use parseCSVWithWorker() for files > 10MB.'
    );
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function (event) {
      try {
        const csvText = event.target.result;
        const json = csvToJson(csvText, options);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = function () {
      reject(new ValidationError('Ошибка чтения файла'));
    };
    
    reader.onabort = function () {
      reject(new ValidationError('Чтение файла прервано'));
    };
    
    // Чтение как текст
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Stream CSV file as async iterator without full buffering.
 *
 * @param {File} file - File selected from input
 * @param {Object} [options] - csvToJson options
 * @returns {AsyncGenerator<Object>} Async iterator of rows
 */
export function parseCsvFileStream(file, options = {}) {
  if (typeof window === 'undefined') {
    throw new ValidationError('parseCsvFileStream() is browser-only. Use readCsvAsJson() in Node.js');
  }

  if (!(file instanceof File)) {
    throw new ValidationError('Input must be a File object');
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new ValidationError('File must have .csv extension');
  }

  return csvToJsonIterator(file, options);
}

/**
 * Создает CSV файл из JSON данных (альтернатива downloadAsCsv)
 * Возвращает Blob вместо автоматического скачивания
 * 
 * @param {Array<Object>} data - Массив объектов
 * @param {Object} [options] - Опции для jsonToCsv
 * @returns {Blob} CSV Blob
 */
export function createCsvBlob(data, options = {}) {
  const csv = jsonToCsv(data, options);
  return new Blob([csv], { 
    type: 'text/csv;charset=utf-8;' 
  });
}

/**
 * Парсит CSV строку из Blob
 * 
 * @param {Blob} blob - CSV Blob
 * @param {Object} [options] - Опции для csvToJson
 * @returns {Promise<Array<Object>>} Promise с JSON данными
 */
export async function parseCsvBlob(blob, options = {}) {
  if (!(blob instanceof Blob)) {
    throw new ValidationError('Input must be a Blob object');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function (event) {
      try {
        const csvText = event.target.result;
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

// Экспорт для Node.js совместимости
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    downloadAsCsv,
    parseCsvFile,
    parseCsvFileStream,
    createCsvBlob,
    parseCsvBlob
  };
}
