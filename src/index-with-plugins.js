/**
 * JTCSV с поддержкой плагинов
 * Расширяемая версия основного API с plugin system
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

const PluginManager = require('./core/plugin-system');
const FastPathEngine = require('./engines/fast-path-engine');
const NdjsonParser = require('./formats/ndjson-parser');

// Импортируем основные функции
const coreJsonToCsv = require('../json-to-csv').jsonToCsv;
const coreCsvToJson = require('../csv-to-json').csvToJson;
const coreSaveAsCsv = require('../json-to-csv').saveAsCsv;
const coreReadCsvAsJson = require('../csv-to-json').readCsvAsJson;

class JtcsvWithPlugins {
  constructor(options = {}) {
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
  _registerBuiltinPlugins() {
    // Fast Path Engine плагин
    this.pluginManager.use('fast-path-engine', {
      name: 'Fast Path Engine',
      version: '1.0.0',
      description: 'Оптимизированный парсер CSV с автоматическим выбором стратегии',
      hooks: {
        'before:csvToJson': (csv, context) => {
          if (this.options.enableFastPath && context.options?.useFastPath !== false) {
            // Используем fast path engine для анализа
            const sample = csv.substring(0, Math.min(1000, csv.length));
            const structure = this.fastPathEngine.analyzeStructure(sample, context.options);
            
            context.metadata.fastPathStructure = structure;
            console.log(`🚀 Используется ${structure.recommendedEngine} парсер`);
          }
          return csv;
        },
        'after:csvToJson': (result, context) => {
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
        'before:parse': (input, context) => {
          if (context.options?.format === 'ndjson') {
            // Парсим NDJSON
            return NdjsonParser.fromNdjson(input, context.options);
          }
          return input;
        },
        'after:serialize': (output, context) => {
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
        'validation': (data, context) => {
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
        async (ctx, next) => {
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
        'before:csvToJson': (csv, context) => {
          console.log(`📥 Начало csvToJson, размер: ${csv.length} байт`);
          return csv;
        },
        'after:csvToJson': (result, context) => {
          console.log(`📤 Завершение csvToJson, результат: ${result.length} записей`);
          return result;
        },
        'before:jsonToCsv': (json, context) => {
          console.log(`📥 Начало jsonToCsv, записей: ${json.length}`);
          return json;
        },
        'after:jsonToCsv': (csv, context) => {
          console.log(`📤 Завершение jsonToCsv, размер: ${csv.length} байт`);
          return csv;
        }
      }
    });
  }

  /**
   * Конвертирует CSV в JSON с поддержкой плагинов
   * @param {string} csv - CSV данные
   * @param {Object} options - Опции парсинга
   * @returns {Promise<Array>} JSON данные
   */
  async csvToJson(csv, options = {}) {
    if (!this.options.enablePlugins) {
      return coreCsvToJson(csv, options);
    }

    return this.pluginManager.executeWithPlugins(
      'csvToJson',
      csv,
      options,
      (input, opts) => {
        if (this.options.enableFastPath && opts?.useFastPath !== false) {
          // Используем fast path engine
          const parsed = this.fastPathEngine.parse(input, opts);
          
          // Преобразуем в объекты
          const headers = parsed[0];
          return parsed.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });
        }
        
        // Используем стандартный парсер
        return coreCsvToJson(input, opts);
      }
    );
  }

  /**
   * Конвертирует JSON в CSV с поддержкой плагинов
   * @param {Array} json - JSON данные
   * @param {Object} options - Опции сериализации
   * @returns {Promise<string>} CSV данные
   */
  async jsonToCsv(json, options = {}) {
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
   * @param {Array} data - JSON данные
   * @param {string} filePath - Путь к файлу
   * @param {Object} options - Опции
   * @returns {Promise<void>}
   */
  async saveAsCsv(data, filePath, options = {}) {
    if (!this.options.enablePlugins) {
      return coreSaveAsCsv(data, filePath, options);
    }

    const csv = await this.jsonToCsv(data, options);
    
    // Используем плагины для сохранения
    return this.pluginManager.executeWithPlugins(
      'saveAsCsv',
      { data: csv, filePath },
      options,
      async (input) => {
        const fs = require('fs').promises;
        await fs.writeFile(input.filePath, input.data, 'utf8');
        return input.filePath;
      }
    );
  }

  /**
   * Читает CSV файл и конвертирует в JSON
   * @param {string} filePath - Путь к файлу
   * @param {Object} options - Опции
   * @returns {Promise<Array>} JSON данные
   */
  async readCsvAsJson(filePath, options = {}) {
    if (!this.options.enablePlugins) {
      return coreReadCsvAsJson(filePath, options);
    }

    // Читаем файл
    const fs = require('fs').promises;
    const csv = await fs.readFile(filePath, 'utf8');
    
    // Конвертируем с использованием плагинов
    return this.csvToJson(csv, options);
  }

  /**
   * Парсит NDJSON данные
   * @param {string|ReadableStream} input - NDJSON данные
   * @param {Object} options - Опции
   * @returns {Promise<Array>} JSON данные
   */
  async parseNdjson(input, options = {}) {
    if (typeof input === 'string') {
      return NdjsonParser.fromNdjson(input, options);
    }
    
    // Для потоков
    const result = [];
    for await (const obj of NdjsonParser.parseStream(input, options)) {
      result.push(obj);
    }
    return result;
  }

  /**
   * Конвертирует JSON в NDJSON
   * @param {Array} data - JSON данные
   * @param {Object} options - Опции
   * @returns {string} NDJSON строка
   */
  toNdjson(data, options = {}) {
    return NdjsonParser.toNdjson(data, options);
  }

  /**
   * Регистрирует плагин
   * @param {string} name - Имя плагина
   * @param {Object} plugin - Конфигурация плагина
   * @returns {JtcsvWithPlugins} this для chaining
   */
  use(name, plugin) {
    this.pluginManager.use(name, plugin);
    return this;
  }

  /**
   * Возвращает менеджер плагинов
   * @returns {PluginManager}
   */
  getPluginManager() {
    return this.pluginManager;
  }

  /**
   * Возвращает fast path engine
   * @returns {FastPathEngine}
   */
  getFastPathEngine() {
    return this.fastPathEngine;
  }

  /**
   * Возвращает список плагинов
   * @returns {Array}
   */
  listPlugins() {
    return this.pluginManager.listPlugins();
  }

  /**
   * Возвращает статистику
   * @returns {Object}
   */
  getStats() {
    return {
      plugins: this.pluginManager.getStats(),
      fastPath: this.fastPathEngine.getStats(),
      options: this.options
    };
  }

  /**
   * Настраивает опции
   * @param {Object} newOptions - Новые опции
   */
  configure(newOptions) {
    this.options = { ...this.options, ...newOptions };
    return this;
  }

  /**
   * Создает экземпляр с настройками по умолчанию
   * @param {Object} options - Опции
   * @returns {JtcsvWithPlugins}
   */
  static create(options = {}) {
    return new JtcsvWithPlugins(options);
  }
}

// Экспортируем основной класс
module.exports = JtcsvWithPlugins;

// Экспортируем утилиты
module.exports.PluginManager = PluginManager;
module.exports.FastPathEngine = FastPathEngine;
module.exports.NdjsonParser = NdjsonParser;

// Экспортируем фабричный метод
module.exports.create = JtcsvWithPlugins.create;