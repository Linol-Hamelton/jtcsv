/**
 * Transform Hooks System
 * Система хуков для трансформации данных перед/после конвертации
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import { ValidationError } from '../errors';

export interface HookContext {
  [key: string]: any;
}

export type HookFunction<T = any, R = any> = (data: T, context?: HookContext) => R;
export type PerRowHookFunction<T = any, R = any> = (row: T, index: number, context?: HookContext) => R;
export type AsyncHookFunction<T = any, R = any> = (data: T, context?: HookContext) => Promise<R>;
export type AsyncPerRowHookFunction<T = any, R = any> = (row: T, index: number, context?: HookContext) => Promise<R>;

export interface TransformHooksOptions {
  hooks?: {
    beforeConvert?: Array<HookFunction | AsyncHookFunction>;
    afterConvert?: Array<HookFunction | AsyncHookFunction>;
    perRow?: Array<PerRowHookFunction | AsyncPerRowHookFunction>;
  };
}

export class TransformHooks {
  private hooks: {
    beforeConvert: Array<HookFunction | AsyncHookFunction>;
    afterConvert: Array<HookFunction | AsyncHookFunction>;
    perRow: Array<PerRowHookFunction | AsyncPerRowHookFunction>;
  };

  constructor(options?: TransformHooksOptions) {
    this.hooks = {
      beforeConvert: options?.hooks?.beforeConvert || [],
      afterConvert: options?.hooks?.afterConvert || [],
      perRow: options?.hooks?.perRow || []
    };
  }

  /**
   * Регистрирует хук beforeConvert
   * @param hook - Функция хука
   * @returns this для цепочки вызовов
   */
  beforeConvert(hook: HookFunction | AsyncHookFunction): this {
    if (typeof hook !== 'function') {
      throw new ValidationError('beforeConvert hook must be a function');
    }
    this.hooks.beforeConvert.push(hook);
    return this;
  }

  /**
   * Регистрирует хук afterConvert
   * @param hook - Функция хука
   * @returns this для цепочки вызовов
   */
  afterConvert(hook: HookFunction | AsyncHookFunction): this {
    if (typeof hook !== 'function') {
      throw new ValidationError('afterConvert hook must be a function');
    }
    this.hooks.afterConvert.push(hook);
    return this;
  }

  /**
   * Регистрирует per-row хук
   * @param hook - Функция хука
   * @returns this для цепочки вызовов
   */
  perRow(hook: PerRowHookFunction | AsyncPerRowHookFunction): this {
    if (typeof hook !== 'function') {
      throw new ValidationError('perRow hook must be a function');
    }
    this.hooks.perRow.push(hook);
    return this;
  }

  /**
   * Применяет beforeConvert хуки
   * @param data - Входные данные
   * @param context - Контекст выполнения
   * @returns Трансформированные данные
   */
  applyBeforeConvert<T = any, R = any>(data: T, context: HookContext = {}): R {
    let result: any = data;
    for (const hook of this.hooks.beforeConvert) {
      result = hook(result, context);
    }
    return result as R;
  }

  /**
   * Применяет beforeConvert хуки асинхронно
   * @param data - Входные данные
   * @param context - Контекст выполнения
   * @returns Promise с трансформированными данными
   */
  async applyBeforeConvertAsync<T = any, R = any>(data: T, context: HookContext = {}): Promise<R> {
    let result: any = data;
    for (const hook of this.hooks.beforeConvert) {
      if (this.isAsyncFunction(hook)) {
        result = await (hook as AsyncHookFunction)(result, context);
      } else {
        result = (hook as HookFunction)(result, context);
      }
    }
    return result as R;
  }

  /**
   * Применяет afterConvert хуки
   * @param data - Выходные данные
   * @param context - Контекст выполнения
   * @returns Трансформированные данные
   */
  applyAfterConvert<T = any, R = any>(data: T, context: HookContext = {}): R {
    let result: any = data;
    for (const hook of this.hooks.afterConvert) {
      result = hook(result, context);
    }
    return result as R;
  }

  /**
   * Применяет afterConvert хуки асинхронно
   * @param data - Выходные данные
   * @param context - Контекст выполнения
   * @returns Promise с трансформированными данными
   */
  async applyAfterConvertAsync<T = any, R = any>(data: T, context: HookContext = {}): Promise<R> {
    let result: any = data;
    for (const hook of this.hooks.afterConvert) {
      if (this.isAsyncFunction(hook)) {
        result = await (hook as AsyncHookFunction)(result, context);
      } else {
        result = (hook as HookFunction)(result, context);
      }
    }
    return result as R;
  }

  /**
   * Применяет per-row хуки
   * @param row - Строка данных
   * @param index - Индекс строки
   * @param context - Контекст выполнения
   * @returns Трансформированная строка
   */
  applyPerRow<T = any, R = any>(row: T, index: number, context: HookContext = {}): R {
    let result: any = row;
    for (const hook of this.hooks.perRow) {
      result = hook(result, index, context);
    }
    return result as R;
  }

  /**
   * Применяет per-row хуки асинхронно
   * @param row - Строка данных
   * @param index - Индекс строки
   * @param context - Контекст выполнения
   * @returns Promise с трансформированной строкой
   */
  async applyPerRowAsync<T = any, R = any>(row: T, index: number, context: HookContext = {}): Promise<R> {
    let result: any = row;
    for (const hook of this.hooks.perRow) {
      if (this.isAsyncFunction(hook)) {
        result = await (hook as AsyncPerRowHookFunction)(result, index, context);
      } else {
        result = (hook as PerRowHookFunction)(result, index, context);
      }
    }
    return result as R;
  }

  /**
   * Применяет все хуки к массиву данных
   * @param data - Массив данных
   * @param context - Контекст выполнения
   * @returns Трансформированный массив
   */
  applyAll<T = any, R = any>(data: T[], context: HookContext = {}): R[] {
    if (!Array.isArray(data)) {
      throw new ValidationError('Data must be an array for applyAll');
    }

    // Применяем beforeConvert хуки
    let processedData: any[] = this.applyBeforeConvert(data, context);

    // Применяем per-row хуки к каждой строке
    if (this.hooks.perRow.length > 0) {
      processedData = processedData.map((row: any, index: number) => 
        this.applyPerRow(row, index, context)
      );
    }

    // Применяем afterConvert хуки
    return this.applyAfterConvert(processedData, context) as R[];
  }

  /**
   * Применяет все хуки к массиву данных асинхронно
   * @param data - Массив данных
   * @param context - Контекст выполнения
   * @returns Promise с трансформированным массивом
   */
  async applyAllAsync<T = any, R = any>(data: T[], context: HookContext = {}): Promise<R[]> {
    if (!Array.isArray(data)) {
      throw new ValidationError('Data must be an array for applyAll');
    }

    // Применяем beforeConvert хуки асинхронно
    let processedData = await this.applyBeforeConvertAsync(data, context);

    // Применяем per-row хуки асинхронно к каждой строке
    if (this.hooks.perRow.length > 0) {
      const processedRows: any[] = [];
      for (let i = 0; i < processedData.length; i++) {
        const processedRow = await this.applyPerRowAsync(processedData[i], i, context);
        processedRows.push(processedRow);
      }
      processedData = processedRows;
    }

    // Применяем afterConvert хуки асинхронно
    return await this.applyAfterConvertAsync(processedData, context) as R[];
  }

  /**
   * Создает копию системы хуков
   * @returns Новая копия
   */
  clone(): TransformHooks {
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
  clear(): void {
    this.hooks = {
      beforeConvert: [],
      afterConvert: [],
      perRow: []
    };
  }

  /**
   * Возвращает статистику по хукам
   * @returns Статистика
   */
  getStats(): { beforeConvert: number; afterConvert: number; perRow: number; total: number } {
    return {
      beforeConvert: this.hooks.beforeConvert.length,
      afterConvert: this.hooks.afterConvert.length,
      perRow: this.hooks.perRow.length,
      total: this.hooks.beforeConvert.length + 
             this.hooks.afterConvert.length + 
             this.hooks.perRow.length
    };
  }

  /**
   * Проверяет, является ли функция асинхронной
   * @private
   */
  private isAsyncFunction(fn: any): boolean {
    return fn.constructor.name === 'AsyncFunction' || 
           (typeof fn === 'function' && fn.constructor === (async () => {}).constructor);
  }
}

/**
 * Предопределенные хуки
 */
export const predefinedHooks = {
  /**
   * Хук для фильтрации данных
   * @param predicate - Функция-предикат
   * @returns Хук фильтрации
   */
  filter<T>(predicate: (item: T, index: number) => boolean): HookFunction<T[], T[]> {
    return (data: T[]) => {
      if (Array.isArray(data)) {
        return data.filter(predicate);
      }
      return data;
    };
  },

  /**
   * Асинхронный хук для фильтрации данных
   * @param predicate - Асинхронная функция-предикат
   * @returns Асинхронный хук фильтрации
   */
  filterAsync<T>(predicate: (item: T, index: number) => Promise<boolean>): AsyncHookFunction<T[], T[]> {
    return async (data: T[]) => {
      if (Array.isArray(data)) {
        const filtered: T[] = [];
        for (let i = 0; i < data.length; i++) {
          if (await predicate(data[i], i)) {
            filtered.push(data[i]);
          }
        }
        return filtered;
      }
      return data;
    };
  },

  /**
   * Хук для маппинга данных
   * @param mapper - Функция-маппер
   * @returns Хук маппинга
   */
  map<T, R>(mapper: (item: T, index: number) => R): HookFunction<T[], R[]> {
    return (data: T[]) => {
      if (Array.isArray(data)) {
        return data.map(mapper);
      }
      return data as any;
    };
  },

  /**
   * Асинхронный хук для маппинга данных
   * @param mapper - Асинхронная функция-маппер
   * @returns Асинхронный хук маппинга
   */
  mapAsync<T, R>(mapper: (item: T, index: number) => Promise<R>): AsyncHookFunction<T[], R[]> {
    return async (data: T[]) => {
      if (Array.isArray(data)) {
        const mapped: R[] = [];
        for (let i = 0; i < data.length; i++) {
          mapped.push(await mapper(data[i], i));
        }
        return mapped;
      }
      return data as any;
    };
  },

  /**
   * Хук для сортировки данных
   * @param compareFn - Функция сравнения
   * @returns Хук сортировки
   */
  sort<T>(compareFn?: (a: T, b: T) => number): HookFunction<T[], T[]> {
    return (data: T[]) => {
      if (Array.isArray(data)) {
        return [...data].sort(compareFn);
      }
      return data;
    };
  },

  /**
   * Хук для ограничения количества записей
   * @param limit - Максимальное количество записей
   * @returns Хук ограничения
   */
  limit<T>(limit: number): HookFunction<T[], T[]> {
    return (data: T[]) => {
      if (Array.isArray(data)) {
        return data.slice(0, limit);
      }
      return data;
    };
  },

  /**
   * Хук для добавления метаданных
   * @param metadata - Метаданные для добавления
   * @returns Хук добавления метаданных
   */
  addMetadata<T extends Record<string, any>>(metadata: Record<string, any>): HookFunction<T[], Array<T & { _metadata: any }>> {
    return (data: T[], context?: HookContext) => {
      if (Array.isArray(data)) {
        return data.map(item => ({
          ...item,
          _metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            context
          }
        })) as Array<T & { _metadata: any }>;
      }
      return data as any;
    };
  },

  /**
   * Хук для преобразования ключей
   * @param keyTransformer - Функция преобразования ключей
   * @returns Хук преобразования ключей
   */
  transformKeys<T extends Record<string, any>>(keyTransformer: (key: string) => string): HookFunction<T[], Array<Record<string, any>>> {
    return (data: T[]) => {
      if (Array.isArray(data)) {
        return data.map(item => {
          const transformed: Record<string, any> = {};
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
   * @param valueTransformer - Функция преобразования значений
   * @returns Хук преобразования значений
   */
  transformValues<T extends Record<string, any>>(valueTransformer: (value: any, key: string) => any): HookFunction<T[], Array<Record<string, any>>> {
    return (data: T[]) => {
      if (Array.isArray(data)) {
        return data.map(item => {
          const transformed: Record<string, any> = {};
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
   * @param validator - Функция валидации
   * @param onError - Обработчик ошибки
   * @returns Хук валидации
   */
  validate<T>(validator: (item: T, index: number) => boolean, onError: (errors: any[]) => void = console.error): HookFunction<T[], T[]> {
    return (data: T[]) => {
      if (Array.isArray(data)) {
        const validData: T[] = [];
        const errors: any[] = [];

        data.forEach((item, index) => {
          try {
            const isValid = validator(item, index);
            if (isValid) {
              validData.push(item);
            } else {
              errors.push({ index, item, reason: 'Validation failed' });
            }
          } catch (error: any) {
            errors.push({ index, item, error: error.message });
          }
        });

        if (errors.length > 0) {
          onError(errors);
        }

        return validData;
      }
      return data;
    };
  },

  /**
   * Асинхронный хук для валидации данных
   * @param validator - Асинхронная функция валидации
   * @param onError - Обработчик ошибки
   * @returns Асинхронный хук валидации
   */
  validateAsync<T>(validator: (item: T, index: number) => Promise<boolean>, onError: (errors: any[]) => void = console.error): AsyncHookFunction<T[], T[]> {
    return async (data: T[]) => {
      if (Array.isArray(data)) {
        const validData: T[] = [];
        const errors: any[] = [];

        for (let i = 0; i < data.length; i++) {
          try {
            const isValid = await validator(data[i], i);
            if (isValid) {
              validData.push(data[i]);
            } else {
              errors.push({ index: i, item: data[i], reason: 'Validation failed' });
            }
          } catch (error: any) {
            errors.push({ index: i, item: data[i], error: error.message });
          }
        }

        if (errors.length > 0) {
          onError(errors);
        }

        return validData;
      }
      return data;
    };
  },

  /**
   * Хук для дедупликации данных
   * @param keySelector - Функция выбора ключа
   * @returns Хук дедупликации
   */
  deduplicate<T>(keySelector: (item: T) => string = JSON.stringify): HookFunction<T[], T[]> {
    return (data: T[]) => {
      if (Array.isArray(data)) {
        const seen = new Set<string>();
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
  },

  /**
   * Асинхронный хук для дедупликации данных
   * @param keySelector - Асинхронная функция выбора ключа
   * @returns Асинхронный хук дедупликации
   */
  deduplicateAsync<T>(keySelector: (item: T) => Promise<string> = async (item) => JSON.stringify(item)): AsyncHookFunction<T[], T[]> {
    return async (data: T[]) => {
      if (Array.isArray(data)) {
        const seen = new Set<string>();
        const filtered: T[] = [];
        
        for (const item of data) {
          const key = await keySelector(item);
          if (!seen.has(key)) {
            seen.add(key);
            filtered.push(item);
          }
        }
        
        return filtered;
      }
      return data;
    };
  }
};
