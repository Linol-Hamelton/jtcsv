/**
 * Transform Hooks System
 * Система хуков для трансформации данных перед/после конвертации
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

const { ValidationError } = require('../../errors');

class TransformHooks {
  constructor() {
    this.hooks = {
      beforeConvert: [],
      afterConvert: [],
      perRow: []
    };
  }

  /**
   * Регистрирует хук beforeConvert
   * @param {Function} hook - Функция хука
   * @returns {TransformHooks} this для цепочки вызовов
   */
  beforeConvert(hook) {
    if (typeof hook !== 'function') {
      throw new ValidationError('beforeConvert hook must be a function');
    }
    this.hooks.beforeConvert.push(hook);
    return this;
  }

  /**
   * Регистрирует хук afterConvert
   * @param {Function} hook - Функция хука
   * @returns {TransformHooks} this для цепочки вызовов
   */
  afterConvert(hook) {
    if (typeof hook !== 'function') {
      throw new ValidationError('afterConvert hook must be a function');
    }
    this.hooks.afterConvert.push(hook);
    return this;
  }

  /**
   * Регистрирует per-row хук
   * @param {Function} hook - Функция хука
   * @returns {TransformHooks} this для цепочки вызовов
   */
  perRow(hook) {
    if (typeof hook !== 'function') {
      throw new ValidationError('perRow hook must be a function');
    }
    this.hooks.perRow.push(hook);
    return this;
  }

  /**
   * Применяет beforeConvert хуки
   * @param {any} data - Входные данные
   * @param {Object} context - Контекст выполнения
   * @returns {any} Трансформированные данные
   */
  applyBeforeConvert(data, context = {}) {
    let result = data;
    for (const hook of this.hooks.beforeConvert) {
      result = hook(result, context);
    }
    return result;
  }

  /**
   * Применяет afterConvert хуки
   * @param {any} data - Выходные данные
   * @param {Object} context - Контекст выполнения
   * @returns {any} Трансформированные данные
   */
  applyAfterConvert(data, context = {}) {
    let result = data;
    for (const hook of this.hooks.afterConvert) {
      result = hook(result, context);
    }
    return result;
  }

  /**
   * Применяет per-row хуки
   * @param {any} row - Строка данных
   * @param {number} index - Индекс строки
   * @param {Object} context - Контекст выполнения
   * @returns {any} Трансформированная строка
   */
  applyPerRow(row, index, context = {}) {
    let result = row;
    for (const hook of this.hooks.perRow) {
      result = hook(result, index, context);
    }
    return result;
  }

  /**
   * Применяет все хуки к массиву данных
   * @param {Array} data - Массив данных
   * @param {Object} context - Контекст выполнения
   * @returns {Array} Трансформированный массив
   */
  applyAll(data, context = {}) {
    if (!Array.isArray(data)) {
      throw new ValidationError('Data must be an array for applyAll');
    }

    // Применяем beforeConvert хуки
    let processedData = this.applyBeforeConvert(data, context);

    // Применяем per-row хуки к каждой строке
    if (this.hooks.perRow.length > 0) {
      processedData = processedData.map((row, index) => 
        this.applyPerRow(row, index, context)
      );
    }

    // Применяем afterConvert хуки
    return this.applyAfterConvert(processedData, context);
  }

  /**
   * Создает копию системы хуков
   * @returns {TransformHooks} Новая копия
   */
  clone() {
    const cloned = new TransformHooks();
    cloned.hooks = {
      beforeConvert: [...this.hooks.beforeConvert],
      afterConvert: [...this.hooks.afterConvert],
      perRow: [...this.hooks.perRow]
    };
    return cloned;
  }

  /**
   * Очищает все хуки
   */
  clear() {
    this.hooks = {
      beforeConvert: [],
      afterConvert: [],
      perRow: []
    };
  }

  /**
   * Возвращает статистику по хукам
   * @returns {Object} Статистика
   */
  getStats() {
    return {
      beforeConvert: this.hooks.beforeConvert.length,
      afterConvert: this.hooks.afterConvert.length,
      perRow: this.hooks.perRow.length,
      total: this.hooks.beforeConvert.length + 
             this.hooks.afterConvert.length + 
             this.hooks.perRow.length
    };
  }
}

/**
 * Предопределенные хуки
 */
const predefinedHooks = {
  /**
   * Хук для фильтрации данных
   * @param {Function} predicate - Функция-предикат
   * @returns {Function} Хук фильтрации
   */
  filter(predicate) {
    return (data) => {
      if (Array.isArray(data)) {
        return data.filter(predicate);
      }
      return data;
    };
  },

  /**
   * Хук для маппинга данных
   * @param {Function} mapper - Функция-маппер
   * @returns {Function} Хук маппинга
   */
  map(mapper) {
    return (data) => {
      if (Array.isArray(data)) {
        return data.map(mapper);
      }
      return data;
    };
  },

  /**
   * Хук для сортировки данных
   * @param {Function} compareFn - Функция сравнения
   * @returns {Function} Хук сортировки
   */
  sort(compareFn) {
    return (data) => {
      if (Array.isArray(data)) {
        return [...data].sort(compareFn);
      }
      return data;
    };
  },

  /**
   * Хук для ограничения количества записей
   * @param {number} limit - Максимальное количество записей
   * @returns {Function} Хук ограничения
   */
  limit(limit) {
    return (data) => {
      if (Array.isArray(data)) {
        return data.slice(0, limit);
      }
      return data;
    };
  },

  /**
   * Хук для добавления метаданных
   * @param {Object} metadata - Метаданные для добавления
   * @returns {Function} Хук добавления метаданных
   */
  addMetadata(metadata) {
    return (data, context) => {
      if (Array.isArray(data)) {
        return data.map(item => ({
          ...item,
          _metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            context
          }
        }));
      }
      return data;
    };
  },

  /**
   * Хук для преобразования ключей
   * @param {Function} keyTransformer - Функция преобразования ключей
   * @returns {Function} Хук преобразования ключей
   */
  transformKeys(keyTransformer) {
    return (data) => {
      if (Array.isArray(data)) {
        return data.map(item => {
          const transformed = {};
          for (const [key, value] of Object.entries(item)) {
            transformed[keyTransformer(key)] = value;
          }
          return transformed;
        });
      }
      return data;
    };
  },

  /**
   * Хук для преобразования значений
   * @param {Function} valueTransformer - Функция преобразования значений
   * @returns {Function} Хук преобразования значений
   */
  transformValues(valueTransformer) {
    return (data) => {
      if (Array.isArray(data)) {
        return data.map(item => {
          const transformed = {};
          for (const [key, value] of Object.entries(item)) {
            transformed[key] = valueTransformer(value, key);
          }
          return transformed;
        });
      }
      return data;
    };
  },

  /**
   * Хук для валидации данных
   * @param {Function} validator - Функция валидации
   * @param {Function} onError - Обработчик ошибки
   * @returns {Function} Хук валидации
   */
  validate(validator, onError = console.error) {
    return (data) => {
      if (Array.isArray(data)) {
        const validData = [];
        const errors = [];

        data.forEach((item, index) => {
          try {
            const isValid = validator(item, index);
            if (isValid) {
              validData.push(item);
            } else {
              errors.push({ index, item, reason: 'Validation failed' });
            }
          } catch (error) {
            errors.push({ index, item, error: error.message });
          }
        });

        if (errors.length > 0) {
          onError('Validation errors:', errors);
        }

        return validData;
      }
      return data;
    };
  },

  /**
   * Хук для дедупликации данных
   * @param {Function} keySelector - Функция выбора ключа
   * @returns {Function} Хук дедупликации
   */
  deduplicate(keySelector = JSON.stringify) {
    return (data) => {
      if (Array.isArray(data)) {
        const seen = new Set();
        return data.filter(item => {
          const key = keySelector(item);
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      }
      return data;
    };
  }
};

module.exports = {
  TransformHooks,
  predefinedHooks
};