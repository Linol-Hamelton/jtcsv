/**
 * Plugin System для JTCSV
 * Middleware-like архитектура с поддержкой hooks и плагинов
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

interface PluginStatsCounters {
  pluginLoads: number;
  hookExecutions: number;
  middlewareExecutions: number;
}

interface PluginStats extends PluginStatsCounters {
  plugins: number;
  hooks: number;
  middlewares: number;
  uniqueHooks: number;
}

interface Plugin {
  name: string;
  version: string;
  description?: string;
  hooks?: Record<string, Function>;
  middlewares?: Function[];
  init?: (manager: PluginManager) => void;
  destroy?: () => void;
}

interface PluginRecord extends Plugin {
  id: string;
  enabled: boolean;
}

interface HookHandlerEntry {
  handler: Function;
  pluginName?: string;
  executionCount: number;
}

interface MiddlewareEntry {
  handler: Function;
  pluginName?: string;
  executionCount: number;
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

const SLOW_HOOK_THRESHOLD_MS = 100;

export class PluginManager {
  private plugins: Map<string, PluginRecord>;
  private hooks: Map<HookName, HookHandlerEntry[]>;
  private middlewares: MiddlewareEntry[];
  private context: Record<string, any>;
  private stats: PluginStatsCounters;

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
    if (!plugin || typeof plugin !== 'object' || !plugin.name || !plugin.version) {
      throw new Error('Plugin должен иметь name и version');
    }

    if (this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" уже зарегистрирован`);
    }

    if (plugin.hooks && (typeof plugin.hooks !== 'object' || Array.isArray(plugin.hooks))) {
      throw new Error('hooks must be an object');
    }

    if (plugin.hooks) {
      for (const [hookName, handler] of Object.entries(plugin.hooks)) {
        if (typeof handler !== 'function') {
          throw new Error(`Hook handler for "${hookName}" must be a function`);
        }
      }
    }

    if (plugin.middlewares && !Array.isArray(plugin.middlewares)) {
      throw new Error('middlewares must be an array');
    }

    if (plugin.middlewares) {
      plugin.middlewares.forEach((middleware, index) => {
        if (typeof middleware !== 'function') {
          throw new Error(`Middleware ${index} must be a function`);
        }
      });
    }

    const record: PluginRecord = {
      id: name,
      enabled: true,
      ...plugin
    };

    // ?????????????????? ????????????
    this.plugins.set(name, record);
    this.stats.pluginLoads++;

    // ?????????????????????? hooks ??????????????
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
        this.registerHook(hookName as HookName, handler, name);
      });
    }

    // ?????????????????????? middleware ??????????????
    if (plugin.middlewares) {
      plugin.middlewares.forEach(middleware => {
        this.registerMiddleware(middleware, name);
      });
    }

    // ???????????????? init ???????? ????????
    if (plugin.init) {
      plugin.init(this);
    }
  }

  registerHook(hookName: HookName, handler: Function, pluginName?: string): void {
    if (typeof handler != 'function') {
      throw new Error('Hook handler must be a function');
    }
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    const handlers = this.hooks.get(hookName)!;
    handlers.push({
      handler,
      pluginName,
      executionCount: 0
    });
  }

  registerMiddleware(middleware: Function, pluginName?: string): void {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middlewares.push({
      handler: middleware,
      pluginName,
      executionCount: 0
    });
  }

  private _isPluginEnabled(pluginName?: string): boolean {
    if (!pluginName) {
      return true;
    }
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return true;
    }
    return plugin.enabled !== false;
  }

  private _runErrorHooks(error: any, context: any): void {
    const errorHandlers = this.hooks.get('error');
    if (!errorHandlers || errorHandlers.length == 0) {
      return;
    }
    for (const handlerEntry of errorHandlers) {
      try {
        handlerEntry.handler(error, context);
      } catch {
        // ignore errors in error handlers
      }
    }
  }

  async executeHook(hookName: HookName, data: any, context: any = {}): Promise<any> {
    const handlers = this.hooks.get(hookName);

    if (!handlers || handlers.length === 0) {
      return data;
    }

    let result = data;
    let executed = false;

    for (const handlerEntry of handlers) {
      if (!this._isPluginEnabled(handlerEntry.pluginName)) {
        continue;
      }

      executed = true;
      const startTime = Date.now();
      try {
        result = await handlerEntry.handler(result, { ...this.context, ...context, hookName, plugin: handlerEntry.pluginName });
        handlerEntry.executionCount++;
      } catch (error) {
        this._runErrorHooks(error, { ...this.context, ...context, hookName, data: result });
      } finally {
        const duration = Date.now() - startTime;
        if (duration > SLOW_HOOK_THRESHOLD_MS) {
          console.warn(`Slow hook "${hookName}" detected (${duration}ms)`);
        }
      }
    }

    if (executed) {
      this.stats.hookExecutions++;
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
    const metadata = options && options.metadata ? options.metadata : {};
    const context = { operation, options, metadata };
    const beforeHook = `before:${operation}` as HookName;
    const afterHook = `after:${operation}` as HookName;

    const beforeInput = await this.executeHook(beforeHook, input, context);
    const middlewareContext: { input: any; options: any; operation: string; metadata: any; result?: any } = {
      input: beforeInput,
      options,
      operation,
      metadata
    };
    const resultHolder = { set: false, value: undefined as any };

    try {
      await this.executeMiddlewares(middlewareContext, context, async (ctx: any) => {
        const handlerInput = ctx && Object.prototype.hasOwnProperty.call(ctx, 'input')
          ? ctx.input
          : beforeInput;
        const result = await handler(handlerInput, options);
        ctx.result = result;
        resultHolder.set = true;
        resultHolder.value = result;
        return result;
      });
    } catch (error) {
      this._runErrorHooks(error, { ...this.context, ...context, data: beforeInput });
      throw error;
    }

    const finalResult = resultHolder.set
      ? resultHolder.value
      : (Object.prototype.hasOwnProperty.call(middlewareContext, 'result') ? middlewareContext.result : undefined);

    return this.executeHook(afterHook, finalResult, context);
  }

  /**
   * Returns registered plugin names.
   */
  listPlugins(): Array<{ id: string; pluginName: string; version: string; description?: string; enabled: boolean }> {
    return Array.from(this.plugins.values()).map((plugin) => ({
      id: plugin.id,
      pluginName: plugin.name,
      version: plugin.version,
      description: plugin.description,
      enabled: plugin.enabled
    }));
  }

  listHooks(): Record<string, { count: number; handlers: Array<{ handler: Function; pluginName?: string; executionCount: number }> }> {
    const result: Record<string, { count: number; handlers: Array<{ handler: Function; pluginName?: string; executionCount: number }> }> = {};
    for (const [hookName, handlers] of this.hooks.entries()) {
      result[hookName] = {
        count: handlers.length,
        handlers: handlers.map((handlerEntry) => ({
          handler: handlerEntry.handler,
          pluginName: handlerEntry.pluginName,
          executionCount: handlerEntry.executionCount
        }))
      };
    }
    return result;
  }


  setPluginEnabled(name: string, enabled: boolean): void {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" не найден`);
    }
    plugin.enabled = Boolean(enabled);
  }

  removePlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin "${name}" не найден`);
    }

    if (plugin.destroy) {
      try {
        plugin.destroy();
      } catch (error) {
        console.error(`Error destroying plugin "${name}":`, error);
      }
    }

    this.plugins.delete(name);

    for (const [hookName, handlers] of this.hooks.entries()) {
      if (!handlers.length) {
        continue;
      }
      const remaining = handlers.filter((handlerEntry) => handlerEntry.pluginName !== name);
      this.hooks.set(hookName, remaining);
    }

    this.middlewares = this.middlewares.filter((middleware) => middleware.pluginName !== name);

    return true;
  }

  resetStats(): void {
    this.stats.pluginLoads = 0;
    this.stats.hookExecutions = 0;
    this.stats.middlewareExecutions = 0;
  }

  async executeMiddlewares(ctx: any, context: any = {}, finalHandler?: (ctx: any) => any | Promise<any>): Promise<any> {
    const entries = this.middlewares.filter((entry) => this._isPluginEnabled(entry.pluginName));
    if (entries.length === 0) {
      if (finalHandler) {
        await finalHandler(ctx);
      }
      return ctx;
    }

    let index = -1;
    const dispatch = async (i: number): Promise<any> => {
      if (i <= index) {
        throw new Error('next() вызван несколько раз');
      }
      index = i;
      const entry = entries[i];
      if (!entry) {
        if (finalHandler) {
          return finalHandler(ctx);
        }
        return;
      }

      const startTime = Date.now();
      try {
        const result = entry.handler(ctx, () => dispatch(i + 1));
        await result;
        entry.executionCount++;
        this.stats.middlewareExecutions++;
      } catch (error) {
        this._runErrorHooks(error, { ...this.context, ...context, data: ctx });
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        if (duration > SLOW_HOOK_THRESHOLD_MS) {
          console.warn(`Slow middleware "${entry.pluginName || 'anonymous'}" detected (${duration}ms)`);
        }
      }
    };

    await dispatch(0);
    return ctx;
  }

  /**
   * Backwards-compatible alias for executeMiddlewares.
   */
  async executeMiddleware(input: any, context: any = {}): Promise<any> {
    return this.executeMiddlewares(input, context);
  }

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
    let hookCount = 0;
    for (const handlers of this.hooks.values()) {
      hookCount += handlers.length;
    }

    return {
      ...this.stats,
      plugins: this.plugins.size,
      hooks: hookCount,
      middlewares: this.middlewares.length,
      uniqueHooks: this.hooks.size
    };
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
    try {
      this.removePlugin(name);
      return true;
    } catch {
      return false;
    }
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
    return this.executeMiddlewares(input, context);
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

export default PluginManager;

// Экспорт для CommonJS
if (typeof module !== 'undefined' && module.exports) {
  const current = module.exports;
  if (current && current.__esModule) {
    current.PluginManager = PluginManager;
    current.getGlobalPluginManager = getGlobalPluginManager;
    current.getGlobalPluginManagerAsync = getGlobalPluginManagerAsync;
    current.default = PluginManager;
  } else {
    module.exports = PluginManager;
    module.exports.PluginManager = PluginManager;
    module.exports.getGlobalPluginManager = getGlobalPluginManager;
    module.exports.getGlobalPluginManagerAsync = getGlobalPluginManagerAsync;
    module.exports.default = PluginManager;
  }
}
