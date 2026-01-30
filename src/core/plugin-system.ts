/**
 * Plugin System для JTCSV
 * Middleware-like архитектура с поддержкой hooks и плагинов
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

interface PluginStats {
  pluginLoads: number;
  hookExecutions: number;
  middlewareExecutions: number;
}

interface Plugin {
  name: string;
  version?: string;
  description?: string;
  hooks?: Record<string, Function>;
  middlewares?: Function[];
  init?: (manager: PluginManager) => void;
  destroy?: () => void;
}

type HookName = 
  | 'before:csvToJson'
  | 'after:csvToJson'
  | 'before:jsonToCsv'
  | 'after:jsonToCsv'
  | 'before:parse'
  | 'after:parse'
  | 'before:serialize'
  | 'after:serialize'
  | 'error'
  | 'validation'
  | 'transformation'
  | string;

export class PluginManager {
  private plugins: Map<string, Plugin>;
  private hooks: Map<HookName, Function[]>;
  private middlewares: Function[];
  private context: Record<string, any>;
  private stats: PluginStats;

  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.middlewares = [];
    this.context = {};
    this.stats = {
      pluginLoads: 0,
      hookExecutions: 0,
      middlewareExecutions: 0
    };

    // Регистрируем стандартные hooks
    this._registerDefaultHooks();
  }

  /**
   * Backwards-compatible alias for registerPlugin.
   */
  use(name: string, plugin: Plugin): void {
    this.registerPlugin(name, plugin);
  }

  /**
   * Регистрирует стандартные hooks
   */
  private _registerDefaultHooks(): void {
    const defaultHooks: HookName[] = [
      'before:csvToJson',
      'after:csvToJson',
      'before:jsonToCsv',
      'after:jsonToCsv',
      'before:parse',
      'after:parse',
      'before:serialize',
      'after:serialize',
      'error',
      'validation',
      'transformation'
    ];

    defaultHooks.forEach(hook => {
      this.hooks.set(hook, []);
    });
  }

  /**
   * Регистрирует плагин
   * @param name - Уникальное имя плагина
   * @param plugin - Объект плагина
   */
  registerPlugin(name: string, plugin: Plugin): void {
    if (this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" already registered`);
    }

    // Добавляем плагин
    this.plugins.set(name, plugin);
    this.stats.pluginLoads++;

    // Регистрируем hooks плагина
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
        this.registerHook(hookName as HookName, handler);
      });
    }

    // Регистрируем middleware плагина
    if (plugin.middlewares) {
      plugin.middlewares.forEach(middleware => {
        this.registerMiddleware(middleware);
      });
    }

    // Вызываем init если есть
    if (plugin.init) {
      plugin.init(this);
    }

    console.log(`✅ Plugin "${name}" registered successfully`);
  }

  /**
   * Регистрирует hook
   * @param hookName - Имя hook
   * @param handler - Функция обработчик
   */
  registerHook(hookName: HookName, handler: Function): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    const handlers = this.hooks.get(hookName)!;
    handlers.push(handler);
  }

  /**
   * Регистрирует middleware
   * @param middleware - Функция middleware
   */
  registerMiddleware(middleware: Function): void {
    this.middlewares.push(middleware);
  }

  /**
   * Выполняет hook
   * @param hookName - Имя hook
   * @param data - Данные для обработки
   * @param context - Контекст выполнения
   */
  async executeHook(hookName: HookName, data: any, context: any = {}): Promise<any> {
    const handlers = this.hooks.get(hookName);
    
    if (!handlers || handlers.length === 0) {
      return data;
    }

    this.stats.hookExecutions++;
    let result = data;

    // Выполняем все handlers последовательно
    for (const handler of handlers) {
      try {
        result = await handler(result, { ...this.context, ...context, hookName });
      } catch (error) {
        console.error(`Error in hook "${hookName}":`, error);
        
        // Выполняем error hook если есть
        const errorHandlers = this.hooks.get('error');
        if (errorHandlers && errorHandlers.length > 0) {
          for (const errorHandler of errorHandlers) {
            try {
              errorHandler(error, { ...this.context, ...context, hookName, data: result });
            } catch {
              // Игнорируем ошибки в error handlers
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Backwards-compatible alias for executeHook.
   */
  async executeHooks(hookName: HookName, data: any, context: any = {}): Promise<any> {
    return this.executeHook(hookName, data, context);
  }

  /**
   * Executes an operation with before/after hooks and middleware.
   */
  async executeWithPlugins(
    operation: string,
    input: any,
    options: any,
    handler: (input: any, options: any) => any | Promise<any>
  ): Promise<any> {
    const context = { operation, options, metadata: {} as Record<string, any> };
    const beforeHook = `before:${operation}` as HookName;
    const afterHook = `after:${operation}` as HookName;

    const beforeInput = await this.executeHook(beforeHook, input, context);
    const middlewareInput = { input: beforeInput, options, operation, metadata: context.metadata };
    const middlewareResult = await this.executeMiddleware(middlewareInput, context);
    const result = await handler(middlewareResult.input ?? beforeInput, options);
    return this.executeHook(afterHook, result, context);
  }

  /**
   * Returns registered plugin names.
   */
  listPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Выполняет цепочку middleware
   * @param input - Входные данные
   * @param context - Контекст выполнения
   */
  async executeMiddleware(input: any, context: any = {}): Promise<any> {
    if (this.middlewares.length === 0) {
      return input;
    }

    this.stats.middlewareExecutions++;
    let result = input;

    // Выполняем middleware последовательно
    for (const middleware of this.middlewares) {
      try {
        result = await middleware(result, { ...this.context, ...context });
      } catch (error) {
        console.error('Error in middleware:', error);
        
        // Выполняем error hook если есть
        const errorHandlers = this.hooks.get('error');
        if (errorHandlers && errorHandlers.length > 0) {
          for (const errorHandler of errorHandlers) {
            try {
              errorHandler(error, { ...this.context, ...context, data: result });
            } catch {
              // Игнорируем ошибки в error handlers
            }
          }
        }
        
        throw error;
      }
    }

    return result;
  }

  /**
   * Устанавливает контекст
   * @param key - Ключ контекста
   * @param value - Значение
   */
  setContext(key: string, value: any): void {
    this.context[key] = value;
  }

  /**
   * Получает контекст
   * @param key - Ключ контекста (опционально)
   */
  getContext(key?: string): any {
    if (key) {
      return this.context[key];
    }
    return { ...this.context };
  }

  /**
   * Возвращает статистику
   */
  getStats(): PluginStats {
    return { ...this.stats };
  }

  /**
   * Возвращает список зарегистрированных плагинов
   */
  getPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Возвращает список зарегистрированных hooks
   */
  getHooks(): HookName[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Удаляет плагин
   * @param name - Имя плагина
   */
  unregisterPlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    
    if (!plugin) {
      return false;
    }

    // Вызываем destroy если есть
    if (plugin.destroy) {
      try {
        plugin.destroy();
      } catch (error) {
        console.error(`Error destroying plugin "${name}":`, error);
      }
    }

    // Удаляем плагин
    this.plugins.delete(name);
    
    // TODO: Удалить связанные hooks и middleware
    
    console.log(`🗑️ Plugin "${name}" unregistered`);
    return true;
  }

  /**
   * Очищает все плагины и hooks
   */
  clear(): void {
    // Вызываем destroy для всех плагинов
    this.plugins.forEach((plugin, name) => {
      if (plugin.destroy) {
        try {
          plugin.destroy();
        } catch (error) {
          console.error(`Error destroying plugin "${name}":`, error);
        }
      }
    });

    this.plugins.clear();
    this.hooks.clear();
    this.middlewares = [];
    this.context = {};
    
    // Регистрируем стандартные hooks заново
    this._registerDefaultHooks();
    
    console.log('🧹 Plugin system cleared');
  }

  /**
   * Асинхронная версия executeHook
   */
  async executeHookAsync(hookName: HookName, data: any, context: any = {}): Promise<any> {
    return this.executeHook(hookName, data, context);
  }

  /**
   * Асинхронная версия executeMiddleware
   */
  async executeMiddlewareAsync(input: any, context: any = {}): Promise<any> {
    return this.executeMiddleware(input, context);
  }
}

// Создание глобального экземпляра PluginManager
let globalPluginManager: PluginManager | null = null;

/**
 * Возвращает глобальный экземпляр PluginManager
 */
export function getGlobalPluginManager(): PluginManager {
  if (!globalPluginManager) {
    globalPluginManager = new PluginManager();
  }
  return globalPluginManager;
}

/**
 * Асинхронная версия getGlobalPluginManager
 */
export async function getGlobalPluginManagerAsync(): Promise<PluginManager> {
  return getGlobalPluginManager();
}

// Экспорт для CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PluginManager,
    getGlobalPluginManager,
    getGlobalPluginManagerAsync
  };
}
