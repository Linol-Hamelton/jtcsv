import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
/**
 * Тесты для Plugin System
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

import PluginManager from '../src/core/plugin-system';

describe('PluginManager', () => {
  let pluginManager;

  beforeEach(() => {
    pluginManager = new PluginManager();
  });

  afterEach(() => {
    pluginManager.clear();
  });

  describe('Регистрация плагинов', () => {
    test('регистрирует простой плагин', () => {
      const plugin = {
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'Тестовый плагин'
      };

      pluginManager.use('test-plugin', plugin);
      
      const plugins = pluginManager.listPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].pluginName).toBe('Test Plugin');
      expect(plugins[0].enabled).toBe(true);
    });

    test('регистрирует плагин с hooks', () => {
      const mockHook = jest.fn();
      
      const plugin = {
        name: 'Hook Plugin',
        version: '1.0.0',
        hooks: {
          'test:hook': mockHook
        }
      };

      pluginManager.use('hook-plugin', plugin);
      
      const hooks = pluginManager.listHooks();
      expect(hooks['test:hook'].count).toBe(1);
    });

    test('регистрирует плагин с middlewares', () => {
      const mockMiddleware = jest.fn((ctx, next) => next());
      
      const plugin = {
        name: 'Middleware Plugin',
        version: '1.0.0',
        middlewares: [mockMiddleware]
      };

      pluginManager.use('middleware-plugin', plugin);
      
      const stats = pluginManager.getStats();
      expect(stats.middlewares).toBe(1);
    });

    test('выбрасывает ошибку при дублировании плагина', () => {
      const plugin = {
        name: 'Test Plugin',
        version: '1.0.0'
      };

      pluginManager.use('test', plugin);
      
      expect(() => {
        pluginManager.use('test', plugin);
      }).toThrow('Plugin "test" уже зарегистрирован');
    });

    test('валидирует обязательные поля плагина', () => {
      expect(() => {
        pluginManager.use('invalid', {});
      }).toThrow('Plugin должен иметь name и version');

      expect(() => {
        pluginManager.use('invalid', { name: 'Test' });
      }).toThrow('Plugin должен иметь name и version');
    });
  });

  describe('Управление hooks', () => {
    test('регистрирует hook вручную', () => {
      const mockHandler = jest.fn();
      
      pluginManager.registerHook('custom:hook', mockHandler, 'test-plugin');
      
      const hooks = pluginManager.listHooks();
      expect(hooks['custom:hook'].count).toBe(1);
      expect(hooks['custom:hook'].handlers[0].pluginName).toBe('test-plugin');
    });

    test('выполняет hooks последовательно', async () => {
      const executionOrder = [];
      
      pluginManager.registerHook('test', () => {
        executionOrder.push(1);
        return 'first';
      });
      
      pluginManager.registerHook('test', (data) => {
        executionOrder.push(2);
        return data + '-second';
      });
      
      const result = await pluginManager.executeHooks('test', 'initial');
      
      expect(executionOrder).toEqual([1, 2]);
      expect(result).toBe('first-second');
    });

    test('обрабатывает ошибки в hooks', async () => {
      const errorHook = jest.fn();
      
      pluginManager.registerHook('error', errorHook);
      
      pluginManager.registerHook('test', () => {
        throw new Error('Test error');
      });
      
      pluginManager.registerHook('test', () => {
        return 'should not execute';
      });
      
      // The executeHooks method should continue even if a hook throws
      const result = await pluginManager.executeHooks('test', 'data');
      
      // Error hook должен был быть вызван
      expect(errorHook).toHaveBeenCalled();
      // The second hook should still execute
      expect(result).toBe('should not execute');
    });

    test('возвращает исходные данные если нет hooks', async () => {
      const result = await pluginManager.executeHooks('nonexistent', 'data');
      expect(result).toBe('data');
    });
  });

  describe('Middleware pipeline', () => {
    test('выполняет middlewares последовательно', async () => {
      const executionOrder = [];
      
      pluginManager.registerMiddleware(async (ctx, next) => {
        executionOrder.push('middleware1-start');
        ctx.value = 'modified';
        await next();
        executionOrder.push('middleware1-end');
      });
      
      pluginManager.registerMiddleware(async (ctx, next) => {
        executionOrder.push('middleware2-start');
        ctx.value += '-further';
        await next();
        executionOrder.push('middleware2-end');
      });
      
      const ctx = { value: 'original' };
      await pluginManager.executeMiddlewares(ctx);
      
      expect(executionOrder).toEqual([
        'middleware1-start',
        'middleware2-start',
        'middleware2-end',
        'middleware1-end'
      ]);
      
      expect(ctx.value).toBe('modified-further');
    });

    test('обрабатывает ошибки в middlewares', async () => {
      const errorHook = jest.fn();
      pluginManager.registerHook('error', errorHook);
      
      pluginManager.registerMiddleware(async (ctx, next) => {
        throw new Error('Middleware error');
      });
      
      const ctx = {};
      await expect(pluginManager.executeMiddlewares(ctx)).rejects.toThrow('Middleware error');
      
      expect(errorHook).toHaveBeenCalled();
    });

    test('не позволяет вызывать next() несколько раз', async () => {
      pluginManager.registerMiddleware(async (ctx, next) => {
        await next();
        await next(); // Второй вызов должен вызвать ошибку
      });
      
      const ctx = {};
      await expect(pluginManager.executeMiddlewares(ctx)).rejects.toThrow('next() вызван несколько раз');
    });
  });

  describe('Управление плагинами', () => {
    test('включает и выключает плагины', () => {
      const plugin = {
        name: 'Test Plugin',
        version: '1.0.0'
      };

      pluginManager.use('test', plugin);
      
      let plugins = pluginManager.listPlugins();
      expect(plugins[0].enabled).toBe(true);
      
      pluginManager.setPluginEnabled('test', false);
      
      plugins = pluginManager.listPlugins();
      expect(plugins[0].enabled).toBe(false);
    });

    test('удаляет плагин', () => {
      const mockHook = jest.fn();
      
      const plugin = {
        name: 'Test Plugin',
        version: '1.0.0',
        hooks: {
          'test:hook': mockHook
        },
        middlewares: [jest.fn()]
      };

      pluginManager.use('test', plugin);
      
      expect(pluginManager.listPlugins()).toHaveLength(1);
      
      pluginManager.removePlugin('test');
      
      expect(pluginManager.listPlugins()).toHaveLength(0);
      
      // Hooks должны быть удалены
      const hooks = pluginManager.listHooks();
      expect(hooks['test:hook'].count).toBe(0);
    });

    test('возвращает список плагинов', () => {
      const plugin1 = { name: 'Plugin 1', version: '1.0.0' };
      const plugin2 = { name: 'Plugin 2', version: '2.0.0', description: 'Second plugin' };
      
      pluginManager.use('plugin1', plugin1);
      pluginManager.use('plugin2', plugin2);
      
      const plugins = pluginManager.listPlugins();
      
      expect(plugins).toHaveLength(2);
      expect(plugins[0].pluginName).toBe('Plugin 1');
      expect(plugins[1].pluginName).toBe('Plugin 2');
      expect(plugins[1].description).toBe('Second plugin');
    });
  });

  describe('executeWithPlugins', () => {
    test('выполняет операцию с поддержкой плагинов', async () => {
      const beforeHook = jest.fn((data) => data + '-before');
      const afterHook = jest.fn((data) => data + '-after');
      const coreFunction = jest.fn((data) => data + '-core');
      
      pluginManager.registerHook('before:test', beforeHook);
      pluginManager.registerHook('after:test', afterHook);
      
      const result = await pluginManager.executeWithPlugins(
        'test',
        'input',
        { option: 'value' },
        coreFunction
      );
      
      expect(beforeHook).toHaveBeenCalledWith('input', expect.any(Object));
      expect(coreFunction).toHaveBeenCalledWith('input-before', { option: 'value' });
      expect(afterHook).toHaveBeenCalledWith('input-before-core', expect.any(Object));
      expect(result).toBe('input-before-core-after');
    });

    test('обрабатывает ошибки в executeWithPlugins', async () => {
      const errorHook = jest.fn();
      pluginManager.registerHook('error', errorHook);
      
      const coreFunction = jest.fn(() => {
        throw new Error('Core function error');
      });
      
      await expect(
        pluginManager.executeWithPlugins('test', 'input', {}, coreFunction)
      ).rejects.toThrow('Core function error');
      
      expect(errorHook).toHaveBeenCalled();
    });

    test('создает контекст с метаданными', async () => {
      const coreFunction = jest.fn((data) => data);
      
      await pluginManager.executeWithPlugins(
        'test',
        'input',
        { metadata: { custom: 'value' } },
        coreFunction
      );
      
      // Проверяем что coreFunction получила правильные аргументы
      expect(coreFunction).toHaveBeenCalledWith('input', {
        metadata: { custom: 'value' }
      });
    });
  });

  describe('Статистика', () => {
    test('собирает статистику использования', () => {
      const plugin = {
        name: 'Test Plugin',
        version: '1.0.0',
        hooks: {
          'test:hook': () => {}
        },
        middlewares: [() => {}]
      };

      pluginManager.use('test', plugin);
      
      const stats = pluginManager.getStats();
      
      expect(stats.pluginLoads).toBe(1);
      expect(stats.plugins).toBe(1);
      expect(stats.hooks).toBe(1); // test:hook
      expect(stats.middlewares).toBe(1);
      expect(stats.uniqueHooks).toBeGreaterThan(0); // Включая стандартные hooks
    });

    test('сбрасывает статистику', () => {
      const plugin = {
        name: 'Test Plugin',
        version: '1.0.0'
      };

      pluginManager.use('test', plugin);
      
      let stats = pluginManager.getStats();
      expect(stats.pluginLoads).toBe(1);
      
      pluginManager.resetStats();
      
      stats = pluginManager.getStats();
      expect(stats.pluginLoads).toBe(0);
    });
  });

  describe('Интеграционные тесты', () => {
    test('полный цикл работы с плагинами', async () => {
      // Создаем плагин для логирования
      const logPlugin = {
        name: 'Logger',
        version: '1.0.0',
        hooks: {
          'before:process': (data) => {
            console.log(`Начало обработки: ${data}`);
            return data;
          },
          'after:process': (result) => {
            console.log(`Результат: ${result}`);
            return result;
          }
        },
        middlewares: [
          async (ctx, next) => {
            console.log('Middleware: до обработки');
            await next();
            console.log('Middleware: после обработки');
          }
        ]
      };

      // Создаем плагин для трансформации
      const transformPlugin = {
        name: 'Transformer',
        version: '1.0.0',
        hooks: {
          'before:process': (data) => data.toUpperCase(),
          'after:process': (result) => `RESULT: ${result}`
        }
      };

      // Регистрируем плагины
      pluginManager.use('logger', logPlugin);
      pluginManager.use('transformer', transformPlugin);

      // Основная функция
      const processFunction = (data) => {
        return data.split('').reverse().join('');
      };

      // Выполняем с плагинами
      const result = await pluginManager.executeWithPlugins(
        'process',
        'hello',
        {},
        processFunction
      );

      // Проверяем результат
      // 'hello' -> toUpperCase() -> 'HELLO' -> reverse() -> 'OLLEH' -> 'RESULT: OLLEH'
      expect(result).toBe('RESULT: OLLEH');

      // Проверяем статистику
      const stats = pluginManager.getStats();
      expect(stats.hookExecutions).toBe(2); // before and after hooks executed once each
      expect(stats.middlewareExecutions).toBe(1);
    });

    test('производительность с множеством плагинов', async () => {
      // Регистрируем 10 плагинов
      for (let i = 0; i < 10; i++) {
        pluginManager.use(`plugin-${i}`, {
          name: `Plugin ${i}`,
          version: '1.0.0',
          hooks: {
            'test:hook': (data) => `${data}-${i}`
          }
        });
      }

      const startTime = Date.now();
      const result = await pluginManager.executeHooks('test:hook', 'start');
      const duration = Date.now() - startTime;

      // Проверяем что все плагины выполнились
      expect(result).toBe('start-0-1-2-3-4-5-6-7-8-9');

      console.log('\n📊 Производительность Plugin System:');
      console.log('  Плагинов: 10');
      console.log(`  Время выполнения hooks: ${duration}ms`);
      
      // Должно быть достаточно быстро даже с 10 плагинами
      expect(duration).toBeLessThan(100);
    });
  });
});
