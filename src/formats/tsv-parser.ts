/**
 * TSV (Tab-Separated Values) парсер
 * Специализированная поддержка TSV формата
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

import fs from "fs";
import path from "path";
import { csvToJson } from "../../csv-to-json";
import { jsonToCsv } from "../../json-to-csv";
import { ValidationError, SecurityError, FileSystemError } from "../../errors";
import { createJsonToCsvStream } from "../../stream-json-to-csv";
import { createCsvToJsonStream } from "../../stream-csv-to-json";

function validateTsvFilePath(filePath: string): string {
  if (typeof filePath !== 'string' || filePath.trim() === '') {
    throw new ValidationError('File path must be a non-empty string');
  }

  if (!filePath.toLowerCase().endsWith('.tsv')) {
    throw new ValidationError('File must have .tsv extension');
  }

  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.includes('..') ||
      /\\\.\.\\|\/\.\.\//.test(filePath) ||
      filePath.startsWith('..') ||
      filePath.includes('/..')) {
    throw new SecurityError('Directory traversal detected in file path');
  }

  return path.resolve(filePath);
}

class TsvParser {
  /**
   * Конвертирует массив объектов в TSV строку
   * @param {Array} data - Массив объектов
   * @param {Object} options - Опции форматирования
   * @returns {string} TSV строка
   * 
   * @example
   * const data = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }];
   * const tsv = TsvParser.jsonToTsv(data);
   * // Результат: "id\tname\n1\tJohn\n2\tJane"
   */
  static jsonToTsv(data: unknown[], options: Record<string, unknown> = {}) {
    const defaultOptions = {
      delimiter: '\t',
      includeHeaders: true,
      ...options
    };
    
    return jsonToCsv(data, defaultOptions);
  }

  /**
   * Конвертирует TSV строку в массив объектов
   * @param {string} tsvString - TSV строка
   * @param {Object} options - Опции парсинга
   * @returns {Array} Массив объектов
   * 
   * @example
   * const tsv = "id\tname\n1\tJohn\n2\tJane";
   * const data = TsvParser.tsvToJson(tsv);
   * // Результат: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
   */
  static tsvToJson(tsvString: string, options: Record<string, unknown> = {}) {
    const defaultOptions = {
      delimiter: '\t',
      autoDetect: false,
      hasHeaders: true,
      ...options
    };
    
    return csvToJson(tsvString, defaultOptions);
  }

  /**
   * Автоматически определяет является ли строка TSV
   * @param {string} sample - Образец данных
   * @returns {boolean} True если это TSV
   */
  static isTsv(sample: string): boolean {
    if (!sample || typeof sample !== 'string') {
      return false;
    }

    const lines = sample.split('\n').slice(0, 10);
    let tabCount = 0;
    let commaCount = 0;
    let semicolonCount = 0;

    for (const line of lines) {
      if (line.trim() === '') {
        continue;
      }
      
      // Считаем разделители
      tabCount += (line.match(/\t/g) || []).length;
      commaCount += (line.match(/,/g) || []).length;
      semicolonCount += (line.match(/;/g) || []).length;
    }

    // Если табуляций больше чем других разделителей, считаем это TSV
    return tabCount > commaCount && tabCount > semicolonCount;
  }

  /**
   * Создает TransformStream для конвертации JSON в TSV
   * @param {Object} options - Опции конвертации
   * @returns {TransformStream} Transform stream
   */
  static createJsonToTsvStream(options = {}) {
    return createJsonToCsvStream({
      delimiter: '\t',
      ...options
    });
  }

  /**
   * Создает TransformStream для конвертации TSV в JSON
   * @param {Object} options - Опции конвертации
   * @returns {TransformStream} Transform stream
   */
  static createTsvToJsonStream(options = {}) {
    return createCsvToJsonStream({
      delimiter: '\t',
      autoDetect: false,
      ...options
    });
  }

  /**
   * Читает TSV файл и конвертирует в JSON
   * @param {string} filePath - Путь к TSV файлу
   * @param {Object} options - Опции парсинга
   * @returns {Promise<Array>} Promise с массивом объектов
   */
  static async readTsvAsJson(filePath: string, options: Record<string, unknown> = {}) {
    const safePath = validateTsvFilePath(filePath);

    try {
      const tsvContent = await fs.promises.readFile(safePath, 'utf8');
      return csvToJson(tsvContent, {
        delimiter: '\t',
        autoDetect: false,
        ...options
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof SecurityError) {
        throw error;
      }
      const e = error as NodeJS.ErrnoException;
      if (e?.code === 'ENOENT') {
        throw new FileSystemError(`File not found: ${safePath}`, e);
      }
      if (e?.code === 'EACCES') {
        throw new FileSystemError(`Permission denied: ${safePath}`, e);
      }
      if (e?.code === 'EISDIR') {
        throw new FileSystemError(`Path is a directory: ${safePath}`, e);
      }
      throw new FileSystemError(`Failed to read TSV file: ${e?.message ?? String(error)}`, e);
    }
  }

  /**
   * Синхронно читает TSV файл и конвертирует в JSON
   * @param {string} filePath - Путь к TSV файлу
   * @param {Object} options - Опции парсинга
   * @returns {Array} Массив объектов
   */
  static readTsvAsJsonSync(filePath: string, options: Record<string, unknown> = {}) {
    const safePath = validateTsvFilePath(filePath);

    try {
      const tsvContent = fs.readFileSync(safePath, 'utf8');
      return csvToJson(tsvContent, {
        delimiter: '\t',
        autoDetect: false,
        ...options
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof SecurityError) {
        throw error;
      }
      const e = error as NodeJS.ErrnoException;
      if (e?.code === 'ENOENT') {
        throw new FileSystemError(`File not found: ${safePath}`, e);
      }
      if (e?.code === 'EACCES') {
        throw new FileSystemError(`Permission denied: ${safePath}`, e);
      }
      if (e?.code === 'EISDIR') {
        throw new FileSystemError(`Path is a directory: ${safePath}`, e);
      }
      throw new FileSystemError(`Failed to read TSV file: ${e?.message ?? String(error)}`, e);
    }
  }

  /**
   * Сохраняет массив объектов как TSV файл
   * @param {Array} data - Массив объектов
   * @param {string} filePath - Путь для сохранения
   * @param {Object} options - Опции сохранения
   * @returns {Promise<void>}
   */
  static async saveAsTsv(data: unknown[], filePath: string, options: Record<string, unknown> = {}) {
    const safePath = validateTsvFilePath(filePath);
    const tsvContent = this.jsonToTsv(data, options);
    const dir = path.dirname(safePath);

    try {
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(safePath, tsvContent, 'utf8');
      return safePath;
    } catch (error) {
      const e = error as NodeJS.ErrnoException;
      if (e?.code === 'ENOENT') {
        throw new FileSystemError(`Directory does not exist: ${dir}`, e);
      }
      if (e?.code === 'EACCES') {
        throw new FileSystemError(`Permission denied: ${safePath}`, e);
      }
      if (e?.code === 'ENOSPC') {
        throw new FileSystemError(`No space left on device: ${safePath}`, e);
      }
      throw new FileSystemError(`Failed to save TSV file: ${e?.message ?? String(error)}`, e);
    }
  }

  /**
   * Синхронно сохраняет массив объектов как TSV файл
   * @param {Array} data - Массив объектов
   * @param {string} filePath - Путь для сохранения
   * @param {Object} options - Опции сохранения
   */  static saveAsTsvSync(data: unknown[], filePath: string, options: Record<string, unknown> = {}) {
    const safePath = validateTsvFilePath(filePath);
    const tsvContent = this.jsonToTsv(data, options);

    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    fs.writeFileSync(safePath, tsvContent, 'utf8');
  }

  /**
   * Валидирует TSV строку
   * @param {string} tsvString - TSV строка для валидации
   * @param {Object} options - Опции валидации
   * @returns {Object} Результат валидации
   */
  static validateTsv(tsvString: string, options: any = {}) {
    const { requireConsistentColumns = true } = options;
    
    if (!tsvString || typeof tsvString !== 'string') {
      return {
        valid: false,
        error: 'Input must be a non-empty string',
        details: { inputType: typeof tsvString }
      };
    }

    const lines = tsvString.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return {
        valid: false,
        error: 'No data found in TSV',
        details: { lineCount: 0 }
      };
    }

    const columnCounts = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.split('\t');
      columnCounts.push(columns.length);

      // Проверяем наличие пустых полей (если требуется)
      if (options.disallowEmptyFields) {
        const emptyFields = columns.filter(field => field.trim() === '');
        if (emptyFields.length > 0) {
          errors.push({
            line: i + 1,
            error: `Found ${emptyFields.length} empty field(s)`,
            fields: emptyFields.map((_, idx) => idx + 1)
          });
        }
      }
    }

    // Проверяем консистентность колонки
    if (requireConsistentColumns && columnCounts.length > 1) {
      const firstCount = columnCounts[0];
      const inconsistentLines = [];
      
      for (let i = 1; i < columnCounts.length; i++) {
        if (columnCounts[i] !== firstCount) {
          inconsistentLines.push({
            line: i + 1,
            expected: firstCount,
            actual: columnCounts[i]
          });
        }
      }

      if (inconsistentLines.length > 0) {
        errors.push({
          error: 'Inconsistent column count',
          details: inconsistentLines
        });
      }
    }

    /* istanbul ignore next */
    const totalColumns = columnCounts[0] || 0;

    return {
      valid: errors.length === 0,
      stats: {
        totalLines: lines.length,
        totalColumns,
        minColumns: Math.min(...columnCounts),
        maxColumns: Math.max(...columnCounts),
        consistentColumns: new Set(columnCounts).size === 1
      },
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

export default TsvParser;

// Named exports for direct CJS require() compatibility (rollup-safe)
export const jsonToTsv = TsvParser.jsonToTsv.bind(TsvParser);
export const tsvToJson = TsvParser.tsvToJson.bind(TsvParser);
export const isTsv = TsvParser.isTsv.bind(TsvParser);
export const createJsonToTsvStream = TsvParser.createJsonToTsvStream.bind(TsvParser);
export const createTsvToJsonStream = TsvParser.createTsvToJsonStream.bind(TsvParser);
export const readTsvAsJson = TsvParser.readTsvAsJson.bind(TsvParser);
export const readTsvAsJsonSync = TsvParser.readTsvAsJsonSync.bind(TsvParser);
export const saveAsTsv = TsvParser.saveAsTsv.bind(TsvParser);
export const saveAsTsvSync = TsvParser.saveAsTsvSync.bind(TsvParser);
export const validateTsv = TsvParser.validateTsv.bind(TsvParser);
