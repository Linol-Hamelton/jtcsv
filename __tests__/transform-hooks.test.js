/**
 * Тесты для системы Transform Hooks
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

const { TransformHooks, predefinedHooks } = require('../src/core/transform-hooks');

describe('TransformHooks', () => {
  describe('Конструктор и базовые методы', () => {
    test('создает новый экземпляр с пустыми хуками', () => {
      const hooks = new TransformHooks();
      expect(hooks).toBeInstanceOf(TransformHooks);
      expect(hooks.getStats().total).toBe(0);
    });

    test('регистрирует beforeConvert хук', () => {
      const hooks = new TransformHooks();
      const mockHook = jest.fn(data => data);
      
      hooks.beforeConvert(mockHook);
      
      expect(hooks.getStats().beforeConvert).toBe(1);
      expect(hooks.getStats().total).toBe(1);
    });

    test('регистрирует afterConvert хук', () => {
      const hooks = new TransformHooks();
      const mockHook = jest.fn(data => data);
      
      hooks.afterConvert(mockHook);
      
      expect(hooks.getStats().afterConvert).toBe(1);
      expect(hooks.getStats().total).toBe(1);
    });

    test('регистрирует perRow хук', () => {
      const hooks = new TransformHooks();
      const mockHook = jest.fn(row => row);
      
      hooks.perRow(mockHook);
      
      expect(hooks.getStats().perRow).toBe(1);
      expect(hooks.getStats().total).toBe(1);
    });

    test('выбрасывает ошибку для не-функции', () => {
      const hooks = new TransformHooks();
      
      expect(() => hooks.beforeConvert('not a function')).toThrow('beforeConvert hook must be a function');
      expect(() => hooks.afterConvert(123)).toThrow('afterConvert hook must be a function');
      expect(() => hooks.perRow(null)).toThrow('perRow hook must be a function');
    });

    test('поддерживает цепочку вызовов', () => {
      const hooks = new TransformHooks();
      
      const result = hooks
        .beforeConvert(data => data)
        .afterConvert(data => data)
        .perRow(row => row);
      
      expect(result).toBe(hooks);
      expect(hooks.getStats().total).toBe(3);
    });
  });

  describe('Применение хуков', () => {
    test('применяет beforeConvert хуки', () => {
      const hooks = new TransformHooks();
      const mockHook1 = jest.fn(data => ({ ...data, processed: true }));
      const mockHook2 = jest.fn(data => ({ ...data, stage: 'before' }));
      
      hooks.beforeConvert(mockHook1).beforeConvert(mockHook2);
      
      const data = { id: 1, name: 'John' };
      const result = hooks.applyBeforeConvert(data);
      
      expect(mockHook1).toHaveBeenCalledWith(data, {});
      expect(mockHook2).toHaveBeenCalledWith({ ...data, processed: true }, {});
      expect(result).toEqual({ id: 1, name: 'John', processed: true, stage: 'before' });
    });

    test('применяет afterConvert хуки', () => {
      const hooks = new TransformHooks();
      const mockHook1 = jest.fn(data => data.filter(item => item.active));
      const mockHook2 = jest.fn(data => data.map(item => ({ ...item, finalized: true })));
      
      hooks.afterConvert(mockHook1).afterConvert(mockHook2);
      
      const data = [
        { id: 1, name: 'John', active: true },
        { id: 2, name: 'Jane', active: false }
      ];
      
      const result = hooks.applyAfterConvert(data);
      
      expect(mockHook1).toHaveBeenCalledWith(data, {});
      expect(mockHook2).toHaveBeenCalledWith([{ id: 1, name: 'John', active: true }], {});
      expect(result).toEqual([{ id: 1, name: 'John', active: true, finalized: true }]);
    });

    test('применяет perRow хуки', () => {
      const hooks = new TransformHooks();
      const mockHook1 = jest.fn((row, index) => ({ ...row, index }));
      const mockHook2 = jest.fn((row, index) => ({ ...row, processed: true }));
      
      hooks.perRow(mockHook1).perRow(mockHook2);
      
      const row = { id: 1, name: 'John' };
      const result = hooks.applyPerRow(row, 0);
      
      expect(mockHook1).toHaveBeenCalledWith(row, 0, {});
      expect(mockHook2).toHaveBeenCalledWith({ ...row, index: 0 }, 0, {});
      expect(result).toEqual({ id: 1, name: 'John', index: 0, processed: true });
    });

    test('применяет все хуки через applyAll', () => {
      const hooks = new TransformHooks();
      
      hooks
        .beforeConvert(data => data.map(item => ({ ...item, before: true })))
        .perRow((row, index) => ({ ...row, index, perRow: true }))
        .afterConvert(data => data.filter(item => item.id > 0));
      
      const data = [
        { id: 1, name: 'John' },
        { id: 0, name: 'System' },
        { id: 2, name: 'Jane' }
      ];
      
      const result = hooks.applyAll(data);
      
      expect(result).toEqual([
        { id: 1, name: 'John', before: true, index: 0, perRow: true },
        { id: 2, name: 'Jane', before: true, index: 2, perRow: true }
      ]);
    });

    test('выбрасывает ошибку если applyAll вызывается не с массивом', () => {
      const hooks = new TransformHooks();
      
      expect(() => hooks.applyAll({ id: 1 })).toThrow('Data must be an array for applyAll');
      expect(() => hooks.applyAll('string')).toThrow('Data must be an array for applyAll');
      expect(() => hooks.applyAll(null)).toThrow('Data must be an array for applyAll');
    });
  });

  describe('Клонирование и очистка', () => {
    test('клонирует систему хуков', () => {
      const hooks = new TransformHooks();
      const mockHook = jest.fn();
      
      hooks.beforeConvert(mockHook).afterConvert(mockHook);
      
      const cloned = hooks.clone();
      
      expect(cloned).toBeInstanceOf(TransformHooks);
      expect(cloned).not.toBe(hooks);
      expect(cloned.getStats().total).toBe(2);
      
      // Добавляем хук в оригинал
      hooks.perRow(mockHook);
      
      // Клон не должен измениться
      expect(cloned.getStats().total).toBe(2);
      expect(hooks.getStats().total).toBe(3);
    });

    test('очищает все хуки', () => {
      const hooks = new TransformHooks();
      
      hooks
        .beforeConvert(() => {})
        .afterConvert(() => {})
        .perRow(() => {});
      
      expect(hooks.getStats().total).toBe(3);
      
      hooks.clear();
      
      expect(hooks.getStats().total).toBe(0);
      expect(hooks.getStats().beforeConvert).toBe(0);
      expect(hooks.getStats().afterConvert).toBe(0);
      expect(hooks.getStats().perRow).toBe(0);
    });
  });

  describe('Контекст выполнения', () => {
    test('передает контекст в хуки', () => {
      const hooks = new TransformHooks();
      const mockHook = jest.fn((data, context) => ({ ...data, context }));
      
      hooks.beforeConvert(mockHook);
      
      const data = { id: 1 };
      const context = { operation: 'test', timestamp: '2024-01-01' };
      
      const result = hooks.applyBeforeConvert(data, context);
      
      expect(mockHook).toHaveBeenCalledWith(data, context);
      expect(result.context).toEqual(context);
    });

    test('передает контекст в perRow хук', () => {
      const hooks = new TransformHooks();
      const mockHook = jest.fn((row, index, context) => ({ ...row, ...context }));
      
      hooks.perRow(mockHook);
      
      const row = { id: 1 };
      const context = { operation: 'csvToJson', lineNumber: 1 };
      
      const result = hooks.applyPerRow(row, 0, context);
      
      expect(mockHook).toHaveBeenCalledWith(row, 0, context);
      expect(result).toEqual({ id: 1, operation: 'csvToJson', lineNumber: 1 });
    });
  });
});

describe('predefinedHooks', () => {
  describe('filter', () => {
    test('фильтрует массив данных', () => {
      const filterHook = predefinedHooks.filter(item => item.active);
      
      const data = [
        { id: 1, active: true },
        { id: 2, active: false },
        { id: 3, active: true }
      ];
      
      const result = filterHook(data);
      
      expect(result).toEqual([
        { id: 1, active: true },
        { id: 3, active: true }
      ]);
    });

    test('возвращает данные как есть если не массив', () => {
      const filterHook = predefinedHooks.filter(() => true);
      
      const data = { id: 1, name: 'John' };
      const result = filterHook(data);
      
      expect(result).toBe(data);
    });
  });

  describe('map', () => {
    test('маппит массив данных', () => {
      const mapHook = predefinedHooks.map(item => ({ ...item, processed: true }));
      
      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ];
      
      const result = mapHook(data);
      
      expect(result).toEqual([
        { id: 1, name: 'John', processed: true },
        { id: 2, name: 'Jane', processed: true }
      ]);
    });
  });

  describe('sort', () => {
    test('сортирует массив данных', () => {
      const sortHook = predefinedHooks.sort((a, b) => a.id - b.id);
      
      const data = [
        { id: 3, name: 'Charlie' },
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ];
      
      const result = sortHook(data);
      
      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ]);
    });

    test('не мутирует оригинальный массив', () => {
      const sortHook = predefinedHooks.sort((a, b) => a.id - b.id);
      
      const original = [
        { id: 3, name: 'Charlie' },
        { id: 1, name: 'Alice' }
      ];
      
      const data = [...original];
      const result = sortHook(data);
      
      expect(data).toEqual(original); // Оригинал не изменился
      expect(result).not.toBe(data); // Новый массив
    });
  });

  describe('limit', () => {
    test('ограничивает количество записей', () => {
      const limitHook = predefinedHooks.limit(2);
      
      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 3, name: 'Bob' },
        { id: 4, name: 'Alice' }
      ];
      
      const result = limitHook(data);
      
      expect(result).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]);
      expect(result).toHaveLength(2);
    });
  });

  describe('addMetadata', () => {
    test('добавляет метаданные к каждому элементу', () => {
      const metadataHook = predefinedHooks.addMetadata({ source: 'test' });
      
      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ];
      
      const result = metadataHook(data, { operation: 'csvToJson' });
      
      expect(result[0]._metadata).toBeDefined();
      expect(result[0]._metadata.source).toBe('test');
      expect(result[0]._metadata.timestamp).toBeDefined();
      expect(result[0]._metadata.context).toEqual({ operation: 'csvToJson' });
      
      expect(result[1]._metadata).toBeDefined();
    });
  });

  describe('transformKeys', () => {
    test('трансформирует ключи объектов', () => {
      const transformHook = predefinedHooks.transformKeys(key => key.toUpperCase());
      
      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ];
      
      const result = transformHook(data);
      
      expect(result).toEqual([
        { ID: 1, NAME: 'John' },
        { ID: 2, NAME: 'Jane' }
      ]);
    });
  });

  describe('transformValues', () => {
    test('трансформирует значения объектов', () => {
      const transformHook = predefinedHooks.transformValues((value, key) => {
        if (key === 'score') {
          return value * 2;
        }
        return value;
      });
      
      const data = [
        { id: 1, name: 'John', score: 50 },
        { id: 2, name: 'Jane', score: 75 }
      ];
      
      const result = transformHook(data);
      
      expect(result).toEqual([
        { id: 1, name: 'John', score: 100 },
        { id: 2, name: 'Jane', score: 150 }
      ]);
    });
  });

  describe('validate', () => {
    test('валидирует данные и фильтрует невалидные', () => {
      const errors = [];
      const errorHandler = (message, errorList) => {
        errors.push(...errorList);
      };
      
      const validateHook = predefinedHooks.validate(
        item => item.id > 0 && item.name.length > 0,
        errorHandler
      );
      
      const data = [
        { id: 1, name: 'John' },
        { id: 0, name: '' }, // Невалидный
        { id: 2, name: 'Jane' },
        { id: -1, name: 'Invalid' } // Невалидный
      ];
      
      const result = validateHook(data);
      
      expect(result).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]);
      expect(errors).toHaveLength(2);
      expect(errors[0].index).toBe(1);
      expect(errors[1].index).toBe(3);
    });
  });

  describe('deduplicate', () => {
    test('удаляет дубликаты', () => {
      const deduplicateHook = predefinedHooks.deduplicate(item => item.id);
      
      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 1, name: 'John' }, // Дубликат
        { id: 3, name: 'Bob' },
        { id: 2, name: 'Jane' } // Дубликат
      ];
      
      const result = deduplicateHook(data);
      
      expect(result).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 3, name: 'Bob' }
      ]);
      expect(result).toHaveLength(3);
    });

    test('использует кастомную функцию выбора ключа', () => {
      const deduplicateHook = predefinedHooks.deduplicate(
        item => `${item.category}-${item.subcategory}`
      );
      
      const data = [
        { category: 'A', subcategory: '1', value: 10 },
        { category: 'A', subcategory: '2', value: 20 },
        { category: 'A', subcategory: '1', value: 30 }, // Дубликат по ключу
        { category: 'B', subcategory: '1', value: 40 }
      ];
      
      const result = deduplicateHook(data);
      
      expect(result).toEqual([
        { category: 'A', subcategory: '1', value: 10 },
        { category: 'A', subcategory: '2', value: 20 },
        { category: 'B', subcategory: '1', value: 40 }
      ]);
    });
  });
});

describe('Интеграционные тесты', () => {
  test('комбинирование нескольких предопределенных хуков', () => {
    const hooks = new TransformHooks();
    
    hooks
      .beforeConvert(predefinedHooks.filter(item => item.active))
      .perRow((row, index) => ({ ...row, index, processed: true }))
      .afterConvert(predefinedHooks.limit(2));
    
    const data = [
      { id: 1, name: 'John', active: true },
      { id: 2, name: 'Jane', active: false },
      { id: 3, name: 'Bob', active: true },
      { id: 4, name: 'Alice', active: true },
      { id: 5, name: 'Charlie', active: true }
    ];
    
    const result = hooks.applyAll(data);
    expect(result).toEqual([
      { id: 1, name: 'John', active: true, index: 0, processed: true },
      { id: 3, name: 'Bob', active: true, index: 1, processed: true }
    ]);
    expect(result).toHaveLength(2);
  });

  test('использование с реальными данными CSV', () => {
    const { csvToJson, createTransformHooks } = require('../csv-to-json');
    
    const csv = `id,name,email,active
1,John,john@example.com,true
2,Jane,jane@example.com,false
3,Bob,bob@example.com,true`;
    
    const hooks = createTransformHooks();
    hooks
      .perRow((row, index) => ({
        ...row,
        index,
        emailDomain: row.email.split('@')[1]
      }))
      .afterConvert(predefinedHooks.filter(item => item.active));
    
    const result = csvToJson(csv, {
      delimiter: ',',
      parseBooleans: true,
      hooks: {
        transformHooks: hooks
      }
    });
    
    expect(result).toEqual([
      {
        id: '1',
        name: 'John',
        email: 'john@example.com',
        active: true,
        index: 0,
        emailDomain: 'example.com'
      },
      {
        id: '3',
        name: 'Bob',
        email: 'bob@example.com',
        active: true,
        index: 2,
        emailDomain: 'example.com'
      }
    ]);
  });

  test('производительность с большим количеством хуков', () => {
    const hooks = new TransformHooks();
    
    // Добавляем 10 хуков каждого типа
    for (let i = 0; i < 10; i++) {
      hooks.beforeConvert(data => {
        if (Array.isArray(data)) {
          return data.map(item => ({ ...item, [`before${i}`]: true }));
        }
        return { ...data, [`before${i}`]: true };
      });
      hooks.perRow((row, index) => ({ ...row, [`perRow${i}`]: index }));
      hooks.afterConvert(data => data.map(item => ({ ...item, [`after${i}`]: true })));
    }
    
    // Генерируем 1000 объектов
    const data = [];
    for (let i = 0; i < 1000; i++) {
      data.push({
        id: i,
        name: `User${i}`,
        value: Math.random() * 100
      });
    }
    
    const startTime = Date.now();
    const result = hooks.applyAll(data);
    const executionTime = Date.now() - startTime;
    
    expect(result).toHaveLength(1000);
    expect(result[0]).toHaveProperty('before0', true);
    expect(result[0]).toHaveProperty('perRow0', 0);
    expect(result[0]).toHaveProperty('after0', true);
    
    console.log(`\n📊 Производительность TransformHooks:`);
    console.log(`  Хуков: ${hooks.getStats().total}`);
    console.log(`  Объектов: ${data.length}`);
    console.log(`  Время выполнения: ${executionTime}ms`);
    console.log(`  Скорость: ${Math.round(data.length / (executionTime / 1000))} объектов/сек`);
    
    // Должно быть достаточно быстро даже с 30 хуками
    expect(executionTime).toBeLessThan(500);
  });

  test('обработка ошибок в хуках', () => {
    const hooks = new TransformHooks();
    
    hooks
      .beforeConvert(() => {
        throw new Error('Before convert error');
      })
      .perRow(() => {
        throw new Error('Per row error');
      })
      .afterConvert(() => {
        throw new Error('After convert error');
      });
    
    const data = [{ id: 1, name: 'John' }];
    
    expect(() => hooks.applyBeforeConvert(data)).toThrow('Before convert error');
    expect(() => hooks.applyPerRow(data[0], 0)).toThrow('Per row error');
    expect(() => hooks.applyAfterConvert(data)).toThrow('After convert error');
  });

  test('хуки с асинхронными операциями', async () => {
    const hooks = new TransformHooks();
    
    hooks
      .beforeConvert(async (data) => {
        // Имитация асинхронной операции
        await new Promise(resolve => setTimeout(resolve, 10));
        return data.map(item => ({ ...item, asyncProcessed: true }));
      })
      .perRow(async (row, index) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return { ...row, asyncIndex: index };
      });
    
    const data = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' }
    ];
    
    // Note: Для асинхронных хуков нужна асинхронная версия applyAll
    // В текущей реализации хуки должны быть синхронными
    // Это демонстрирует ограничение текущей реализации
    expect(() => hooks.applyAll(data)).toThrow();
  });
});    
   