/**
 * JTCSV Validator
 * Валидация CSV/JSON данных с Zod-подобным API
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

class JtcsvValidator {
  constructor() {
    this.schema = {};
    this.rules = [];
    this.customValidators = [];
    this.transformers = [];
  }

  /**
   * Определяет схему валидации для поля
   * 
   * @param {string} field - Имя поля
   * @param {Object} rule - Правило валидации
   * @returns {JtcsvValidator} this для chaining
   * 
   * @example
   * validator
   *   .field('name', { type: 'string', required: true, min: 1, max: 100 })
   *   .field('email', { type: 'string', required: true, pattern: /^[^@]+@[^@]+\.[^@]+$/ })
   *   .field('age', { type: 'number', required: true, min: 0, max: 150 })
   */
  field(field, rule) {
    this.schema[field] = this._normalizeRule(rule);
    return this;
  }

  /**
   * Определяет несколько полей сразу
   * 
   * @param {Object} schema - Схема валидации
   * @returns {JtcsvValidator} this для chaining
   * 
   * @example
   * validator.schema({
   *   name: { type: 'string', required: true },
   *   email: { type: 'string', required: true },
   *   age: { type: 'number', min: 0 }
   * });
   */
  schema(schema) {
    Object.entries(schema).forEach(([field, rule]) => {
      this.field(field, rule);
    });
    return this;
  }

  /**
   * Добавляет кастомное правило валидации
   * 
   * @param {string} name - Имя правила
   * @param {Function} validator - Функция валидации
   * @returns {JtcsvValidator} this для chaining
   * 
   * @example
   * validator.custom('uniqueEmail', (value, row, index) => {
   *   // Проверка уникальности email
   * });
   */
  custom(name, validator) {
    this.customValidators.push({ name, validator });
    return this;
  }

  /**
   * Добавляет правило для всей строки
   * 
   * @param {string} name - Имя правила
   * @param {Function} validator - Функция валидации
   * @returns {JtcsvValidator} this для chaining
   * 
   * @example
   * validator.row('hasRequiredFields', (row) => {
   *   return row.name && row.email;
   * });
   */
  row(name, validator) {
    this.rules.push({ name, validator, type: 'row' });
    return this;
  }

  /**
   * Добавляет трансформацию для поля
   * 
   * @param {string} field - Имя поля
   * @param {Function} transformer - Функция трансформации
   * @returns {JtcsvValidator} this для chaining
   * 
   * @example
   * validator.transform('email', (value) => value.toLowerCase().trim())
   *   .transform('name', (value) => value.trim());
   */
  transform(field, transformer) {
    this.transformers.push({ field, transformer });
    return this;
  }

  /**
   * Валидирует данные
   * 
   * @param {Array} data - Данные для валидации
   * @param {Object} options - Опции валидации
   * @returns {Object} Результат валидации
   * 
   * @example
   * const result = validator.validate(data);
   * if (result.valid) {
   *   console.log('Данные валидны');
   * } else {
   *   console.log('Ошибки:', result.errors);
   * }
   */
  validate(data, options = {}) {
    const {
      stopOnFirstError = false,
      includeWarnings = true,
      transform = true
    } = options;

    if (!Array.isArray(data)) {
      return {
        valid: false,
        errors: [{ type: 'INVALID_DATA', message: 'Data must be an array' }],
        warnings: [],
        summary: {
          totalRows: 0,
          validRows: 0,
          errorCount: 1,
          warningCount: 0
        }
      };
    }

    const errors = [];
    const warnings = [];
    const validRows = new Set();
    let transformedData = [...data];

    // Применяем трансформации если нужно
    if (transform && this.transformers.length > 0) {
      transformedData = transformedData.map((row, index) => {
        const transformed = { ...row };
        this.transformers.forEach(({ field, transformer }) => {
          if (field in transformed) {
            transformed[field] = transformer(transformed[field], row, index);
          }
        });
        return transformed;
      });
    }

    // Валидируем каждую строку
    for (let i = 0; i < transformedData.length; i++) {
      const row = transformedData[i];
      const rowErrors = [];
      const rowWarnings = [];
      let rowValid = true;

      // Валидация полей по схеме
      for (const [field, rule] of Object.entries(this.schema)) {
        const value = row[field];
        const fieldErrors = this._validateField(field, value, rule, row, i);

        if (fieldErrors.length > 0) {
          rowErrors.push(...fieldErrors);
          rowValid = false;
          
          if (stopOnFirstError) {
            break;
          }
        }
      }

      // Кастомные валидаторы полей
      if (rowValid) {
        for (const { name, validator } of this.customValidators) {
          try {
            const result = validator(row, i);
            if (result !== true) {
              rowErrors.push({
                row: i + 1,
                type: 'CUSTOM_VALIDATION',
                field: name,
                message: typeof result === 'string' ? result : `Failed custom validation: ${name}`,
                value: row
              });
              rowValid = false;
              
              if (stopOnFirstError) {
                break;
              }
            }
          } catch (error) {
            rowErrors.push({
              row: i + 1,
              type: 'VALIDATION_ERROR',
              field: name,
              message: `Validation error: ${error.message}`,
              value: row
            });
            rowValid = false;
          }
        }
      }

      // Валидация всей строки
      if (rowValid) {
        for (const { name, validator } of this.rules) {
          try {
            const result = validator(row, i);
            if (result !== true) {
              rowErrors.push({
                row: i + 1,
                type: 'ROW_VALIDATION',
                rule: name,
                message: typeof result === 'string' ? result : `Failed row validation: ${name}`,
                value: row
              });
              rowValid = false;
              break;
            }
          } catch (error) {
            rowErrors.push({
              row: i + 1,
              type: 'ROW_VALIDATION_ERROR',
              rule: name,
              message: `Row validation error: ${error.message}`,
              value: row
            });
            rowValid = false;
            break;
          }
        }
      }

      // Предупреждения
      if (includeWarnings) {
        const fieldWarnings = this._checkWarnings(row, i);
        if (fieldWarnings.length > 0) {
          rowWarnings.push(...fieldWarnings);
        }
      }

      if (rowValid) {
        validRows.add(i);
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      }

      if (rowWarnings.length > 0) {
        warnings.push(...rowWarnings);
      }

      if (stopOnFirstError && errors.length > 0) {
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: transformedData,
      summary: {
        totalRows: data.length,
        validRows: validRows.size,
        errorCount: errors.length,
        warningCount: warnings.length,
        errorRate: data.length > 0 ? (errors.length / data.length) * 100 : 0
      }
    };
  }

  /**
   * Фильтрует и возвращает только валидные строки
   * 
   * @param {Array} data - Данные для фильтрации
   * @returns {Array} Валидные строки
   */
  filterValid(data) {
    const { valid, errors, data: validatedData } = this.validate(data, { transform: false });
    
    if (valid) {
      return validatedData;
    }

    const invalidRows = new Set(errors.map(e => e.row - 1));
    return validatedData.filter((_, index) => !invalidRows.has(index));
  }

  /**
   * Возвращает только ошибки валидации
   * 
   * @param {Array} data - Данные для проверки
   * @returns {Array} Ошибки валидации
   */
  getErrors(data) {
    const { errors } = this.validate(data, { transform: false });
    return errors;
  }

  /**
   * Создает отчет о валидации
   * 
   * @param {Array} data - Данные для проверки
   * @returns {Object} Отчет о валидации
   */
  report(data) {
    const result = this.validate(data);
    
    const errorTypes = {};
    const fieldErrors = {};
    
    result.errors.forEach(error => {
      // Группировка по типу ошибки
      errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
      
      // Группировка по полю
      if (error.field) {
        fieldErrors[error.field] = (fieldErrors[error.field] || 0) + 1;
      }
    });

    return {
      ...result,
      analysis: {
        errorTypes,
        fieldErrors,
        mostCommonError: Object.entries(errorTypes).sort((a, b) => b[1] - a[1])[0],
        mostProblematicField: Object.entries(fieldErrors).sort((a, b) => b[1] - a[1])[0]
      },
      recommendations: this._generateRecommendations(result)
    };
  }

  /**
   * Сбрасывает схему валидации
   */
  reset() {
    this.schema = {};
    this.rules = [];
    this.customValidators = [];
    this.transformers = [];
    return this;
  }

  /**
   * Нормализует правило валидации
   */
  _normalizeRule(rule) {
    const normalized = { ...rule };
    
    // Преобразуем type в массив если нужно
    if (normalized.type && !Array.isArray(normalized.type)) {
      normalized.type = [normalized.type];
    }
    
    return normalized;
  }

  /**
   * Валидирует одно поле
   */
  _validateField(field, value, rule, row, rowIndex) {
    const errors = [];
    
    // Проверка required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({
        row: rowIndex + 1,
        type: 'REQUIRED',
        field,
        message: `Field "${field}" is required`,
        value
      });
      return errors;
    }

    // Если значение не required и пустое, пропускаем остальные проверки
    if (value === undefined || value === null || value === '') {
      return errors;
    }

    // Проверка типа
    if (rule.type) {
      const types = Array.isArray(rule.type) ? rule.type : [rule.type];
      let typeValid = false;
      
      for (const type of types) {
        if (this._checkType(value, type)) {
          typeValid = true;
          break;
        }
      }
      
      if (!typeValid) {
        errors.push({
          row: rowIndex + 1,
          type: 'TYPE',
          field,
          message: `Field "${field}" must be of type ${types.join(' or ')}`,
          value,
          expected: types
        });
      }
    }

    // Проверка минимальной длины/значения
    if (rule.min !== undefined) {
      if (typeof value === 'string' && value.length < rule.min) {
        errors.push({
          row: rowIndex + 1,
          type: 'MIN_LENGTH',
          field,
          message: `Field "${field}" must be at least ${rule.min} characters`,
          value,
          min: rule.min
        });
      } else if (typeof value === 'number' && value < rule.min) {
        errors.push({
          row: rowIndex + 1,
          type: 'MIN_VALUE',
          field,
          message: `Field "${field}" must be at least ${rule.min}`,
          value,
          min: rule.min
        });
      }
    }

    // Проверка максимальной длины/значения
    if (rule.max !== undefined) {
      if (typeof value === 'string' && value.length > rule.max) {
        errors.push({
          row: rowIndex + 1,
          type: 'MAX_LENGTH',
          field,
          message: `Field "${field}" must be at most ${rule.max} characters`,
          value,
          max: rule.max
        });
      } else if (typeof value === 'number' && value > rule.max) {
        errors.push({
          row: rowIndex + 1,
          type: 'MAX_VALUE',
          field,
          message: `Field "${field}" must be at most ${rule.max}`,
          value,
          max: rule.max
        });
      }
    }

    // Проверка паттерна (регулярное выражение)
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        errors.push({
          row: rowIndex + 1,
          type: 'PATTERN',
          field,
          message: `Field "${field}" must match pattern`,
          value,
          pattern: rule.pattern.toString()
        });
      }
    }

    // Проверка на допустимые значения
    if (rule.enum && Array.isArray(rule.enum)) {
      if (!rule.enum.includes(value)) {
        errors.push({
          row: rowIndex + 1,
          type: 'ENUM',
          field,
          message: `Field "${field}" must be one of: ${rule.enum.join(', ')}`,
          value,
          allowed: rule.enum
        });
      }
    }

    // Кастомная валидация
    if (rule.validate && typeof rule.validate === 'function') {
      try {
        const result = rule.validate(value, row, rowIndex);
        if (result !== true) {
          errors.push({
            row: rowIndex + 1,
            type: 'CUSTOM',
            field,
            message: typeof result === 'string' ? result : `Field "${field}" failed custom validation`,
            value
          });
        }
      } catch (error) {
        errors.push({
          row: rowIndex + 1,
          type: 'VALIDATION_ERROR',
          field,
          message: `Validation error for field "${field}": ${error.message}`,
          value
        });
      }
    }

    return errors;
  }

  /**
   * Проверяет тип значения
   */
  _checkType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'integer':
        return Number.isInteger(value);
      case 'float':
        return typeof value === 'number' && !Number.isInteger(value);
      case 'date':
        return value instanceof Date && !isNaN(value);
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * Проверяет предупреждения
   */
  _checkWarnings(row, rowIndex) {
    const warnings = [];
    
    // Предупреждение о пустых полях в required полях
    Object.entries(this.schema).forEach(([field, rule]) => {
      if (!rule.required && (row[field] === undefined || row[field] === null || row[field] === '')) {
        warnings.push({
          row: rowIndex + 1,
          type: 'WARNING',
          field,
          message: `Field "${field}" is empty (optional field)`,
          value: row[field]
        });
      }
    });

    return warnings;
  }

  /**
   * Генерирует рекомендации на основе ошибок
   */
  _generateRecommendations(result) {
    const recommendations = [];
    
    if (result.summary.errorRate > 50) {
      recommendations.push('Большой процент ошибок. Проверьте структуру данных.');
    }
    
    const requiredErrors = result.errors.filter(e => e.type === 'REQUIRED');
    if (requiredErrors.length > 0) {
      recommendations.push(`Обязательные поля отсутствуют: ${[...new Set(requiredErrors.map(e => e.field))].join(', ')}`);
    }
    
    const typeErrors = result.errors.filter(e => e.type === 'TYPE');
    if (typeErrors.length > 0) {
      recommendations.push('Обнаружены ошибки типов данных. Проверьте формат полей.');
    }
    
    return recommendations;
  }

    /**
   * Создает валидатор из JSON схемы
   * 
   * @param {Object} jsonSchema - JSON схема
   * @returns {JtcsvValidator} Новый валидатор
   * 
   * @example
   * const schema = {
   *   fields: {
   *     name: { type: 'string', required: true },
   *     email: { type: 'string', required: true }
   *   },
   *   rules: [...]
   * };
   * const validator = JtcsvValidator.fromJSON(schema);
   */
  static fromJSON(jsonSchema) {
    const validator = new JtcsvValidator();
    
    if (jsonSchema.fields) {
      validator.schema(jsonSchema.fields);
    }
    
    if (jsonSchema.rules) {
      jsonSchema.rules.forEach(rule => {
        if (rule.type === 'custom') {
          validator.custom(rule.name, rule.validator);
        } else if (rule.type === 'row') {
          validator.row(rule.name, rule.validator);
        }
      });
    }
    
    if (jsonSchema.transformers) {
      jsonSchema.transformers.forEach(({ field, transformer }) => {
        validator.transform(field, transformer);
      });
    }
    
    return validator;
  }

  /**
   * Экспортирует схему в JSON
   * 
   * @returns {Object} JSON схема
   */
  toJSON() {
    return {
      fields: this.schema,
      rules: [
        ...this.customValidators.map(({ name, validator }) => ({
          type: 'custom',
          name,
          validator: validator.toString()
        })),
        ...this.rules.map(({ name, validator }) => ({
          type: 'row',
          name,
          validator: validator.toString()
        }))
      ],
      transformers: this.transformers.map(({ field, transformer }) => ({
        field,
        transformer: transformer.toString()
      }))
    };
  }

  /**
   * Валидирует CSV строку
   * 
   * @param {string} csv - CSV данные
   * @param {Object} options - Опции парсинга
   * @returns {Object} Результат валидации
   */
  async validateCsv(csv, options = {}) {
    const { csvToJson } = require('../../../index.js');
    
    try {
      const json = await csvToJson(csv, options.csvOptions || {});
      return this.validate(json, options.validationOptions || {});
    } catch (error) {
      return {
        valid: false,
        errors: [{
          type: 'CSV_PARSE_ERROR',
          message: `Failed to parse CSV: ${error.message}`,
          data: csv.substring(0, 100) + '...'
        }],
        warnings: [],
        summary: {
          totalRows: 0,
          validRows: 0,
          errorCount: 1,
          warningCount: 0
        }
      };
    }
  }

  /**
   * Валидирует JSON строку
   * 
   * @param {string} jsonString - JSON строка
   * @param {Object} options - Опции валидации
   * @returns {Object} Результат валидации
   */
  validateJsonString(jsonString, options = {}) {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) {
        throw new Error('JSON must be an array');
      }
      return this.validate(data, options);
    } catch (error) {
      return {
        valid: false,
        errors: [{
          type: 'JSON_PARSE_ERROR',
          message: `Failed to parse JSON: ${error.message}`,
          data: jsonString.substring(0, 100) + '...'
        }],
        warnings: [],
        summary: {
          totalRows: 0,
          validRows: 0,
          errorCount: 1,
          warningCount: 0
        }
      };
    }
  }

  /**
   * Создает middleware для Express
   * 
   * @param {Object} options - Опции middleware
   * @returns {Function} Express middleware
   */
  static expressMiddleware(options = {}) {
    const validator = options.validator || new JtcsvValidator();
    
    return async (req, res, next) => {
      if (!req.body) {
        return next();
      }

      try {
        let data;
        
        if (Array.isArray(req.body)) {
          data = req.body;
        } else if (typeof req.body === 'object') {
          data = [req.body];
        } else {
          return next();
        }

        const result = validator.validate(data, options.validationOptions || {});
        
        req.validation = result;
        
        if (!result.valid && options.failOnError !== false) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            validation: result
          });
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Создает плагин для JTCSV
   * 
   * @returns {Object} Плагин для JTCSV
   */
  static createJtcsvPlugin() {
    return {
      name: 'jtcsv-validator',
      version: '1.0.0',
      description: 'Валидация данных для JTCSV',
      hooks: {
        'before:csvToJson': (csv, context) => {
          if (context.options.validate) {
            const validator = context.options.validator || new JtcsvValidator();
            const result = validator.validateCsv(csv, {
              csvOptions: context.options,
              validationOptions: context.options.validationOptions
            });
            
            if (!result.valid) {
              throw new Error(`CSV validation failed: ${JSON.stringify(result.errors.slice(0, 3))}`);
            }
            
            context.metadata.validation = result;
          }
          return csv;
        },
        
        'before:jsonToCsv': (json, context) => {
          if (context.options.validate) {
            const validator = context.options.validator || new JtcsvValidator();
            const result = validator.validate(json, context.options.validationOptions);
            
            if (!result.valid) {
              throw new Error(`JSON validation failed: ${JSON.stringify(result.errors.slice(0, 3))}`);
            }
            
            context.metadata.validation = result;
          }
          return json;
        }
      }
    };
  }
}

// Предопределенные схемы валидации
JtcsvValidator.schemas = {
  /**
   * Схема для пользовательских данных
   */
  user: () => new JtcsvValidator()
    .field('id', { type: 'integer', required: true, min: 1 })
    .field('name', { type: 'string', required: true, min: 1, max: 100 })
    .field('email', { 
      type: 'string', 
      required: true, 
      pattern: /^[^@]+@[^@]+\.[^@]+$/ 
    })
    .field('age', { type: 'integer', min: 0, max: 150 })
    .field('active', { type: 'boolean' })
    .transform('email', (value) => value.toLowerCase().trim())
    .transform('name', (value) => value.trim()),
  
  /**
   * Схема для продуктов
   */
  product: () => new JtcsvValidator()
    .field('sku', { type: 'string', required: true, min: 3, max: 50 })
    .field('name', { type: 'string', required: true, min: 1, max: 200 })
    .field('price', { type: 'number', required: true, min: 0 })
    .field('quantity', { type: 'integer', required: true, min: 0 })
    .field('category', { 
      type: 'string', 
      enum: ['electronics', 'clothing', 'books', 'food', 'other'] 
    }),
  
  /**
   * Схема для заказов
   */
  order: () => new JtcsvValidator()
    .field('orderId', { type: 'string', required: true })
    .field('customerId', { type: 'string', required: true })
    .field('amount', { type: 'number', required: true, min: 0 })
    .field('currency', { type: 'string', required: true, enum: ['USD', 'EUR', 'GBP', 'JPY'] })
    .field('status', { 
      type: 'string', 
      required: true, 
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] 
    })
    .field('createdAt', { type: 'date', required: true })
    .row('validAmount', (row) => {
      if (row.currency === 'JPY' && row.amount % 1 !== 0) {
        return 'JPY amounts must be whole numbers';
      }
      return true;
    })
};

// Экспортируем класс
module.exports = JtcsvValidator;

// Экспортируем утилиты
module.exports.createValidator = (schema) => {
  const validator = new JtcsvValidator();
  if (schema) {
    validator.schema(schema);
  }
  return validator;
};

module.exports.validateCsv = async (csv, schema, options = {}) => {
  const validator = new JtcsvValidator();
  if (schema) {
    validator.schema(schema);
  }
  return validator.validateCsv(csv, options);
};

module.exports.validateJson = (json, schema, options = {}) => {
  const validator = new JtcsvValidator();
  if (schema) {
    validator.schema(schema);
  }
  return validator.validate(json, options);
};

// Экспортируем предопределенные схемы
module.exports.schemas = JtcsvValidator.schemas;

// Экспортируем middleware
module.exports.expressMiddleware = JtcsvValidator.expressMiddleware;

// Экспортируем плагин
module.exports.jtcsvPlugin = JtcsvValidator.createJtcsvPlugin();