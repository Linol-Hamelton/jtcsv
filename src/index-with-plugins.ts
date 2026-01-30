/**
 * JTCSV с поддержкой плагинов
 * Расширяемая версия основного API с plugin system
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

import { PluginManager } from './core/plugin-system';
import FastPathEngine from './engines/fast-path-engine';
import NdjsonParser from './formats/ndjson-parser';

// Импортируем основные функции
import { jsonToCsv as coreJsonToCsv } from '../json-to-csv';
import { csvToJson as coreCsvToJson, csvToJsonIterator as coreCsvToJsonIterator } from '../csv-to-json';
import { saveAsCsv as coreSaveAsCsv } from '../json-to-csv';
import { readCsvAsJson as coreReadCsvAsJson } from '../csv-to-json';

import type { CsvToJsonOptions, JsonToCsvOptions, SaveAsCsvOptions } from './types';

export interface JtcsvWithPluginsOptions {
  enableFastPath?: boolean;
  enablePlugins?: boolean;
  [key: string]: any;
}

export interface PluginHookContext {
  operation: string;
  options?: any;
  metadata?: Record<string, any>;
}

export class JtcsvWithPlugins {
  private pluginManager: PluginManager;
  private fastPathEngine: FastPathEngine;
  private options: JtcsvWithPluginsOptions;

  constructor(options: JtcsvWithPluginsOptions = {}) {
    this.pluginManager = new PluginManager();
    this.fastPathEngine = new FastPathEngine();
    this.options = {
      enableFastPath: true,
      enablePlugins: true,
      ...options
    };

    // Регистрируем встроенные плагины
    this._registerBuiltinPlugins();
  }

  /**
   * Регистрирует встроенные плагины
   */
  private _registerBuiltinPlugins(): void {
    // Fast Path Engine плагин
    this.pluginManager.use('fast-path-engine', {
      name: 'Fast Path Engine',
      version: '1.0.0',
      description: 'Оптимизированный парсер CSV с автоматическим выбором стратегии',
      hooks: {
        'before:csvToJson': (csv: string, context: PluginHookContext) => {
          if (this.options.enableFastPath && context.options?.useFastPath !== false) {
            // Используем fast path engine для анализа
            const sample = csv.substring(0, Math.min(1000, csv.length));
            const structure = this.fastPathEngine.analyzeStructure(sample, context.options);
            
            context.metadata = context.metadata || {};
            context.metadata.fastPathStructure = structure;
            if (process.env.NODE_ENV === 'development') {
              console.log(`🚀 Используется ${structure.recommendedEngine} парсер`);
            }
          }
          return csv;
        },
        'after:csvToJson': (result: any[], context: PluginHookContext) => {
          if (context.metadata?.fastPathStructure) {
            context.metadata.fastPathStats = this.fastPathEngine.getStats();
          }
          return result;
        }
      }
    });

    // NDJSON плагин
    this.pluginManager.use('ndjson-support', {
      name: 'NDJSON Support',
      version: '1.0.0',
      description: 'Поддержка Newline Delimited JSON формата',
      hooks: {
        'before:parse': (input: any, context: PluginHookContext) => {
          if (context.options?.format === 'ndjson') {
            // Парсим NDJSON
            return NdjsonParser.fromNdjson(input as string, context.options);
          }
          return input;
        },
        'after:serialize': (output: any, context: PluginHookContext) => {
          if (context.options?.format === 'ndjson') {
            // Сериализуем в NDJSON
            return NdjsonParser.toNdjson(output, context.options);
          }
          return output;
        }
      }
    });

    // Валидация данных плагин
    this.pluginManager.use('data-validation', {
      name: 'Data Validation',
      version: '1.0.0',
      description: 'Валидация входных и выходных данных',
      hooks: {
        'validation': (data: any, context: PluginHookContext) => {
          if (!data) {
            throw new Error('Данные не могут быть пустыми');
          }
          
          if (context.operation === 'jsonToCsv' && !Array.isArray(data)) {
            throw new Error('Для конвертации в CSV данные должны быть массивом');
          }
          
          return data;
        }
      },
      middlewares: [
        async (ctx: any, next: () => Promise<void>) => {
          // Валидация перед выполнением
          await this.pluginManager.executeHooks('validation', ctx.input, ctx);
          await next();
          // Валидация после выполнения
          await this.pluginManager.executeHooks('validation', ctx.result, ctx);
        }
      ]
    });

    // Логирование плагин
    this.pluginManager.use('logging', {
      name: 'Logging',
      version: '1.0.0',
      description: 'Логирование операций',
      hooks: {
        'before:csvToJson': (csv: string, context: PluginHookContext) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`📥 Начало csvToJson, размер: ${csv.length} байт`);
          }
          return csv;
        },
        'after:csvToJson': (result: any[], context: PluginHookContext) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`📤 Завершение csvToJson, результат: ${result.length} записей`);
          }
          return result;
        },
        'before:jsonToCsv': (json: any[], context: PluginHookContext) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`📥 Начало jsonToCsv, записей: ${json.length}`);
          }
          return json;
        },
        'after:jsonToCsv': (csv: string, context: PluginHookContext) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`📤 Завершение jsonToCsv, размер: ${csv.length} байт`);
          }
          return csv;
        }
      }
    });
  }

  /**
   * Конвертирует CSV в JSON с поддержкой плагинов
   * @param csv - CSV данные
   * @param options - Опции парсинга
   * @returns JSON данные
   */
  async csvToJson(csv: string, options: CsvToJsonOptions = {}): Promise<any[]> {
    if (!this.options.enablePlugins) {
      return coreCsvToJson(csv, options);
    }

    return this.pluginManager.executeWithPlugins(
      'csvToJson',
      csv,
      options,
      (input: string, opts: CsvToJsonOptions) => {
        if (this.options.enableFastPath && opts?.useFastPath !== false) {
          return coreCsvToJson(input, { ...opts, useFastPath: true });
        }

        return coreCsvToJson(input, opts);
      }
    );
  }

  /**
   * Convert CSV to JSON rows as async iterator with plugin hooks.
   * @param csv - CSV input
   * @param options - Conversion options
   * @returns Async iterator of rows
   */
  async *csvToJsonIterator(csv: string, options: CsvToJsonOptions = {}): AsyncGenerator<any, void, unknown> {
    if (!this.options.enablePlugins) {
      for await (const row of coreCsvToJsonIterator(csv, options)) {
        yield row;
      }
      return;
    }

    const iterator = await this.pluginManager.executeWithPlugins(
      'csvToJson',
      csv,
      options,
      (input: string, opts: CsvToJsonOptions) => {
        if (this.options.enableFastPath && opts?.useFastPath !== false) {
          return coreCsvToJsonIterator(input, { ...opts, useFastPath: true });
        }

        return coreCsvToJsonIterator(input, opts);
      }
    );

    for await (const row of iterator) {
      yield row;
    }
  }

  /**
   * Конвертирует JSON в CSV с поддержкой плагинов
   * @param json - JSON данные
   * @param options - Опции сериализации
   * @returns CSV данные
   */
  async jsonToCsv(json: any[], options: JsonToCsvOptions = {}): Promise<string> {
    if (!this.options.enablePlugins) {
      return coreJsonToCsv(json, options);
    }

    return this.pluginManager.executeWithPlugins(
      'jsonToCsv',
      json,
      options,
      coreJsonToCsv
    );
  }

  /**
   * Сохраняет JSON как CSV файл
   * @param data - JSON данные
   * @param filePath - Путь к файлу
   * @param options - Опции
   * @returns Promise<void>
   */
  async saveAsCsv(data: any[], filePath: string, options: SaveAsCsvOptions = {}): Promise<void> {
    if (!this.options.enablePlugins) {
      coreSaveAsCsv(data, filePath, options);
      return;
    }

    const csv = await this.jsonToCsv(data, options);
    
    // Используем плагины для сохранения
    await this.pluginManager.executeWithPlugins(
      'saveAsCsv',
      { data: csv, filePath },
      options,
      async (input: { data: string; filePath: string }) => {
        const fs = await import('fs/promises');
        await fs.writeFile(input.filePath, input.data, 'utf8');
        return input.filePath;
      }
    );
  }

  /**
   * Читает CSV файл и конвертирует в JSON
   * @param filePath - Путь к файлу
   * @param options - Опции
   * @returns JSON данные
   */
  async readCsvAsJson(filePath: string, options: CsvToJsonOptions = {}): Promise<any[]> {
    if (!this.options.enablePlugins) {
      return coreReadCsvAsJson(filePath, options);
    }

    // Читаем файл
    const fs = await import('fs/promises');
    const csv = await fs.readFile(filePath, 'utf8');
    
    // Конвертируем с использованием плагинов
    return this.csvToJson(csv, options);
  }

  /**
   * Парсит NDJSON данные
   * @param input - NDJSON данные
   * @param options - Опции
   * @returns JSON данные
   */
  async parseNdjson(input: string | ReadableStream, options: any = {}): Promise<any[]> {
    if (typeof input === 'string') {
      return NdjsonParser.fromNdjson(input, options);
    }
    
    // Для потоков
    const result: any[] = [];
    for await (const obj of NdjsonParser.parseStream(input, options)) {
      result.push(obj);
    }
    return result;
  }

  /**
   * Конвертирует JSON в NDJSON
   * @param data - JSON данные
   * @param options - Опции
   * @returns NDJSON строка
   */
  toNdjson(data: any[], options: any = {}): string {
    return NdjsonParser.toNdjson(data, options);
  }

  /**
   * Регистрирует плагин
   * @param name - Имя плагина
   * @param plugin - Конфигурация плагина
   * @returns this для chaining
   */
  use(name: string, plugin: any): this {
    this.pluginManager.use(name, plugin);
    return this;
  }

  /**
   * Возвращает менеджер плагинов
   * @returns PluginManager
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Возвращает fast path engine
   * @returns FastPathEngine
   */
  getFastPathEngine(): FastPathEngine {
    return this.fastPathEngine;
  }

  /**
   * Возвращает список плагинов
   * @returns Array
   */
  listPlugins(): any[] {
    return this.pluginManager.listPlugins();
  }

  /**
   * Возвращает статистику
   * @returns Object
   */
  getStats(): any {
    return {
      plugins: this.pluginManager.getStats(),
      fastPath: this.fastPathEngine.getStats(),
      options: this.options
    };
  }

  /**
   * Настраивает опции
   * @param newOptions - Новые опции
   */
  configure(newOptions: JtcsvWithPluginsOptions): this {
    this.options = { ...this.options, ...newOptions };
    return this;
  }

  /**
   * Создает экземпляр с настройками по умолчанию
   * @param options - Опции
   * @returns JtcsvWithPlugins
   */
  static create(options: JtcsvWithPluginsOptions = {}): JtcsvWithPlugins {
    return new JtcsvWithPlugins(options);
  }
}

// Экспортируем основной класс
export default JtcsvWithPlugins;

// Экспортируем утилиты
export { PluginManager, FastPathEngine, NdjsonParser };

// Экспортируем фабричный метод
export const create = JtcsvWithPlugins.create;
