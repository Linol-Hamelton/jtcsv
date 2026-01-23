/**
 * Plugin System для JTCSV
 * Middleware-like архитектура с поддержкой hooks и плагинов
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

class PluginManager {
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
   * Регистрирует стандартные hooks
   */
  _registerDefaultHooks() {
    const defaultHooks = [
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
   * @param {string} name - Уникальное имя плагина
   * @param {Object} plugin - Конфигурация плагина
   * @returns {PluginManager} this для chaining
   * 
   * @example
   * pluginManager.use('excel-exporter', {
   *   name: 'Excel Exporter',
   *   version: '1.0.0',
   *   description: 'Экспорт в Excel формат',
   *   hooks: {
   *     'after:jsonToCsv': (csv) => convertToExcel(csv)
   *   },
   *   middlewares: [
   *     async (ctx, next) => {
   *       console.log('Before conversion:', ctx);
   *       await next();
   *       console.log('After conversion:', ctx);
   *     }
   *   ]
   * });
   */
  use(name, plugin) {
    if (this.plugins.has(name)) {
      throw new Error(`Plugin "${name}" уже зарегистрирован`);
    }

    this._validatePlugin(plugin);
    
    // Сохраняем плагин
    this.plugins.set(name, {
      ...plugin,
      registeredAt: new Date(),
      enabled: true
    });

    // Регистрируем hooks
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
        this.registerHook(hookName, handler, name);
      });
    }

    // Регистрируем middlewares
    if (plugin.middlewares) {
      plugin.middlewares.forEach((middleware, index) => {
        this.registerMiddleware(middleware, `${name}:${index}`);
      });
    }

    this.stats.pluginLoads++;
    console.log(`✅ Plugin "${name}" зарегистрирован`);
    return this;
  }

  /**
   * Валидирует плагин
   */
  _validatePlugin(plugin) {
    if (!plugin.name || !plugin.version) {
      throw new Error('Plugin должен иметь name и version');
    }

    // Проверяем обязательные поля
    const required = ['name', 'version'];
    required.forEach(field => {
      if (!plugin[field]) {
        throw new Error(`Plugin missing required field: ${field}`);
      }
    });

    // Проверяем hooks если есть
    if (plugin.hooks) {
      if (typeof plugin.hooks !== 'object') {
        throw new Error('Plugin hooks должен быть объектом');
      }
      
      Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
        if (typeof handler !== 'function') {
          throw new Error(`Hook handler для "${hookName}" должен быть функцией`);
        }
      });
    }

    // Проверяем middlewares если есть
    if (plugin.middlewares) {
      if (!Array.isArray(plugin.middlewares)) {
        throw new Error('Plugin middlewares должен быть массивом');
      }
      
      plugin.middlewares.forEach((middleware, index) => {
        if (typeof middleware !== 'function') {
          throw new Error(`Middleware ${index} должен быть функцией`);
        }
      });
    }
  }

  /**
   * Регистрирует hook
   * @param {string} hookName - Имя hook
   * @param {Function} handler - Обработчик hook
   * @param {string} pluginName - Имя плагина (опционально)
   */
  registerHook(hookName, handler, pluginName = null) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    this.hooks.get(hookName).push({
      handler,
      pluginName,
      registeredAt: new Date()
    });

    console.log(`📌 Hook "${hookName}" зарегистрирован${pluginName ? ` для плагина "${pluginName}"` : ''}`);
  }

  /**
   * Регистрирует middleware
   * @param {Function} middleware - Middleware функция
   * @param {string} name - Имя middleware (опционально)
   */
  registerMiddleware(middleware, name = null) {
    this.middlewares.push({
      middleware,
      name,
      registeredAt: new Date()
    });

    console.log(`🔄 Middleware "${name || 'anonymous'}" зарегистрирован`);
  }

  /**
   * Выполняет все handlers для конкретного hook
   * @param {string} hookName - Имя hook
   * @param {any} data - Данные для обработки
   * @param {Object} context - Контекст выполнения
   * @returns {Promise<any>} Результат обработки
   */
  async executeHooks(hookName, data, context = {}) {
    const handlers = this.hooks.get(hookName) || [];
    
    if (handlers.length === 0) {
      return data;
    }

    console.log(`⚡ Выполнение hook "${hookName}" с ${handlers.length} обработчиками`);
    
    let result = data;
    
    for (const { handler, pluginName } of handlers) {
      try {
        const startTime = Date.now();
        result = await handler(result, { ...context, pluginName });
        const duration = Date.now() - startTime;
        
        if (duration > 100) {
          console.warn(`⚠️ Hook "${hookName}" от плагина "${pluginName}" выполнился за ${duration}ms`);
        }
      } catch (error) {
        console.error(`❌ Ошибка в hook "${hookName}" от плагина "${pluginName}":`, error.message);
        
        // Выполняем error hook если есть
        await this.executeHooks('error', { 
          hook: hookName, 
          plugin: pluginName, 
          error, 
          data: result 
        }, context);
        
        // Продолжаем выполнение с другими обработчиками
        continue;
      }
    }

    this.stats.hookExecutions++;
    return result;
  }

  /**
   * Выполняет middleware pipeline
   * @param {Object} ctx - Контекст выполнения
   * @returns {Promise<Object>} Обработанный контекст
   */
  async executeMiddlewares(ctx) {
    if (this.middlewares.length === 0) {
      return ctx;
    }

    console.log(`🚀 Запуск middleware pipeline с ${this.middlewares.length} middleware`);
    
    let index = -1;
    const middlewares = this.middlewares.map(m => m.middleware);

    const dispatch = async (i) => {
      if (i <= index) {
        throw new Error('next() вызван несколько раз');
      }
      
      index = i;
      const middleware = middlewares[i];
      
      if (!middleware) {
        return ctx;
      }

      try {
        const startTime = Date.now();
        await middleware(ctx, () => dispatch(i + 1));
        const duration = Date.now() - startTime;
        
        if (duration > 50) {
          console.warn(`⚠️ Middleware ${i} выполнился за ${duration}ms`);
        }
      } catch (error) {
        console.error(`❌ Ошибка в middleware ${i}:`, error.message);
        
        // Выполняем error hook
        await this.executeHooks('error', { 
          middleware: i, 
          error, 
          context: ctx 
        }, ctx);
        
        throw error;
      }
    };

    await dispatch(0);
    this.stats.middlewareExecutions++;
    return ctx;
  }

  /**
   * Создает контекст для операции
   * @param {string} operation - Тип операции
   * @param {any} input - Входные данные
   * @param {Object} options - Опции
   * @returns {Object} Контекст
   */
  createContext(operation, input, options = {}) {
    return {
      operation,
      input,
      options,
      startTime: Date.now(),
      metadata: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        ...options.metadata
      },
      state: {},
      result: null,
      errors: [],
      warnings: []
    };
  }

  /**
   * Выполняет операцию с поддержкой плагинов
   * @param {string} operation - Тип операции
   * @param {any} input - Входные данные
   * @param {Object} options - Опции
   * @param {Function} coreFunction - Основная функция
   * @returns {Promise<any>} Результат
   */
  async executeWithPlugins(operation, input, options, coreFunction) {
    // Создаем контекст
    const ctx = this.createContext(operation, input, options);
    
    try {
      // Выполняем before hooks
      ctx.input = await this.executeHooks(`before:${operation}`, ctx.input, ctx);
      
      // Выполняем middlewares
      await this.executeMiddlewares(ctx);
      
      // Выполняем основную функцию
      ctx.result = await coreFunction(ctx.input, ctx.options);
      
      // Выполняем after hooks
      ctx.result = await this.executeHooks(`after:${operation}`, ctx.result, ctx);
      
      // Записываем время выполнения
      ctx.duration = Date.now() - ctx.startTime;
      
      // Логируем успешное выполнение
      console.log(`✅ Операция "${operation}" выполнена за ${ctx.duration}ms`);
      
      return ctx.result;
    } catch (error) {
      // Записываем ошибку
      ctx.errors.push(error);
      ctx.duration = Date.now() - ctx.startTime;
      
      // Выполняем error hooks
      await this.executeHooks('error', { 
        operation, 
        error, 
        context: ctx 
      }, ctx);
      
      console.error(`❌ Ошибка в операции "${operation}":`, error.message);
      throw error;
    }
  }

  /**
   * Возвращает список всех зарегистрированных плагинов
   * @returns {Array} Список плагинов
   */
  listPlugins() {
    return Array.from(this.plugins.entries()).map(([name, plugin]) => ({
      name,
      pluginName: plugin.name,
      version: plugin.version,
      description: plugin.description || '',
      enabled: plugin.enabled,
      registeredAt: plugin.registeredAt,
      hooks: Object.keys(plugin.hooks || {}).length,
      middlewares: (plugin.middlewares || []).length
    }));
  }

  /**
   * Возвращает список всех hooks
   * @returns {Object} Статистика hooks
   */
  listHooks() {
    const result = {};
    
    for (const [hookName, handlers] of this.hooks.entries()) {
      result[hookName] = {
        count: handlers.length,
        handlers: handlers.map(h => ({
          pluginName: h.pluginName,
          registeredAt: h.registeredAt
        }))
      };
    }
    
    return result;
  }

  /**
   * Включает/выключает плагин
   * @param {string} pluginName - Имя плагина
   * @param {boolean} enabled - Состояние
   */
  setPluginEnabled(pluginName, enabled) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin "${pluginName}" не найден`);
    }
    
    plugin.enabled = enabled;
    console.log(`🔧 Plugin "${pluginName}" ${enabled ? 'включен' : 'выключен'}`);
  }

  /**
   * Удаляет плагин
   * @param {string} pluginName - Имя плагина
   */
  removePlugin(pluginName) {
    if (!this.plugins.has(pluginName)) {
      throw new Error(`Plugin "${pluginName}" не найден`);
    }
    
    // Удаляем связанные hooks
    for (const [hookName, handlers] of this.hooks.entries()) {
      const filtered = handlers.filter(h => h.pluginName !== pluginName);
      this.hooks.set(hookName, filtered);
    }
    
    // Удаляем связанные middlewares
    this.middlewares = this.middlewares.filter(m => !m.name?.startsWith(`${pluginName}:`));
    
    // Удаляем плагин
    this.plugins.delete(pluginName);
    
    console.log(`🗑️ Plugin "${pluginName}" удален`);
  }

  /**
   * Возвращает статистику
   * @returns {Object} Статистика
   */
  getStats() {
    return {
      ...this.stats,
      plugins: this.plugins.size,
      hooks: Array.from(this.hooks.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      middlewares: this.middlewares.length,
      uniqueHooks: this.hooks.size
    };
  }

  /**
   * Сбрасывает статистику
   */
  resetStats() {
    this.stats = {
      pluginLoads: 0,
      hookExecutions: 0,
      middlewareExecutions: 0
    };
  }

  /**
   * Очищает все плагины и hooks
   */
  clear() {
    this.plugins.clear();
    this.hooks.clear();
    this.middlewares = [];
    this.resetStats();
    this._registerDefaultHooks();
    
    console.log('🧹 Все плагины и hooks очищены');
  }
}

module.exports = PluginManager;
