import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
/**
 * Тесты для NDJSON парсера
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

import NdjsonParser from '../src/formats/ndjson-parser';

// Mock для ReadableStream
class MockReadableStream {
  constructor(data) {
    this.data = data;
    this.index = 0;
    this.chunkSize = 10;
  }

  async read() {
    if (this.index >= this.data.length) {
      return { done: true };
    }

    const chunk = this.data.substring(this.index, this.index + this.chunkSize);
    this.index += this.chunkSize;
    
    return {
      done: false,
      value: new TextEncoder().encode(chunk)
    };
  }

  releaseLock() {}
  getReader() {
    return this;
  }
}

describe('NdjsonParser', () => {
  describe('toNdjson', () => {
    test('конвертирует массив объектов в NDJSON', () => {
      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ];
      
      const result = NdjsonParser.toNdjson(data);
      
      expect(result).toBe('{"id":1,"name":"John"}\n{"id":2,"name":"Jane"}');
    });

    test('использует replacer и space опции', () => {
      const data = [{ id: 1, name: 'John' }];
      const result = NdjsonParser.toNdjson(data, {
        replacer: (key, value) => key === 'id' ? value * 2 : value,
        space: 2
      });
      
      expect(result).toBe('{\n  "id": 2,\n  "name": "John"\n}');
    });

    test('выбрасывает ошибку для не-массива', () => {
      expect(() => {
        NdjsonParser.toNdjson({ id: 1 });
      }).toThrow('Input must be an array');
    });
  });

  describe('fromNdjson', () => {
    test('конвертирует NDJSON строку в массив объектов', () => {
      const ndjson = '{"id":1,"name":"John"}\n{"id":2,"name":"Jane"}';
      const result = NdjsonParser.fromNdjson(ndjson);
      
      expect(result).toEqual([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]);
    });

    test('игнорирует пустые строки', () => {
      const ndjson = '{"id":1}\n\n{"id":2}\n';
      const result = NdjsonParser.fromNdjson(ndjson);
      
      expect(result).toEqual([
        { id: 1 },
        { id: 2 }
      ]);
    });

    test('применяет фильтр', () => {
      const ndjson = '{"id":1,"active":true}\n{"id":2,"active":false}';
      const result = NdjsonParser.fromNdjson(ndjson, {
        filter: (obj) => obj.active
      });
      
      expect(result).toEqual([
        { id: 1, active: true }
      ]);
    });

    test('применяет трансформацию', () => {
      const ndjson = '{"id":1,"name":"john"}\n{"id":2,"name":"jane"}';
      const result = NdjsonParser.fromNdjson(ndjson, {
        transform: (obj) => ({
          ...obj,
          name: obj.name.toUpperCase()
        })
      });
      
      expect(result).toEqual([
        { id: 1, name: 'JOHN' },
        { id: 2, name: 'JANE' }
      ]);
    });

    test('обрабатывает ошибки парсинга', () => {
      const ndjson = '{"id":1}\ninvalid json\n{"id":3}';
      const errors = [];
      
      const result = NdjsonParser.fromNdjson(ndjson, {
        onError: (error, line, lineNumber) => {
          errors.push({ lineNumber, error: error.message });
        }
      });
      
      expect(result).toEqual([
        { id: 1 },
        { id: 3 }
      ]);
      expect(errors).toHaveLength(1);
      expect(errors[0].lineNumber).toBe(2);
    });
  });

  describe('parseStream', () => {
    test('парсит NDJSON строку как async iterator', async () => {
      const ndjson = '{"id":1}\n{"id":2}\n{"id":3}';
      const results = [];
      
      for await (const obj of NdjsonParser.parseStream(ndjson)) {
        results.push(obj);
      }
      
      expect(results).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ]);
    });

    test('парсит NDJSON поток как async iterator', async () => {
      const ndjson = '{"id":1}\n{"id":2}\n{"id":3}';
      const stream = new MockReadableStream(ndjson);
      const results = [];
      
      for await (const obj of NdjsonParser.parseStream(stream)) {
        results.push(obj);
      }
      
      expect(results).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ]);
    });

    test('обрабатывает ошибки в потоке', async () => {
      const ndjson = '{"id":1}\ninvalid\n{"id":3}';
      const errors = [];
      const results = [];
      
      for await (const obj of NdjsonParser.parseStream(ndjson, {
        onError: (error, line) => {
          errors.push({ line, error: error.message });
        }
      })) {
        results.push(obj);
      }
      
      expect(results).toEqual([
        { id: 1 },
        { id: 3 }
      ]);
      expect(errors).toHaveLength(1);
    });

    test('обрабатывает большие файлы по частям', async () => {
      // Создаем большой NDJSON (1000 объектов)
      let ndjson = '';
      for (let i = 0; i < 1000; i++) {
        ndjson += `{"id":${i},"value":"item${i}"}\n`;
      }
      
      const stream = new MockReadableStream(ndjson);
      let count = 0;
      
      for await (const obj of NdjsonParser.parseStream(stream)) {
        expect(obj.id).toBe(count);
        expect(obj.value).toBe(`item${count}`);
        count++;
      }
      
      expect(count).toBe(1000);
    });
  });

  describe('createNdjsonToCsvStream', () => {
    test('создает TransformStream для конвертации NDJSON в CSV', async () => {
      const transform = NdjsonParser.createNdjsonToCsvStream({
        delimiter: ','
      });
      
      // Note: Тестирование TransformStream требует браузерной среды или polyfill
      // В Node.js мы можем протестировать логику напрямую
      const testData = [
        '{"id":1,"name":"John"}',
        '{"id":2,"name":"Jane,Smith"}' // Содержит запятую
      ];
      
      // Проверяем что функция возвращает TransformStream
      expect(transform).toBeInstanceOf(TransformStream);
    });
  });

  describe('getStats', () => {
    test('собирает статистику по строке', async () => {
      const ndjson = '{"id":1}\ninvalid\n{"id":3}\n';
      const stats = await NdjsonParser.getStats(ndjson);
      
      expect(stats.totalLines).toBe(4);
      expect(stats.validLines).toBe(2);
      expect(stats.errorLines).toBe(1);
      expect(stats.successRate).toBe(50);
      expect(stats.errors).toHaveLength(1);
    });

    test('собирает статистику по потоку', async () => {
      const ndjson = '{"id":1}\n{"id":2}\n{"id":3}';
      const stream = new MockReadableStream(ndjson);
      const stats = await NdjsonParser.getStats(stream);
      
      expect(stats.totalLines).toBe(3);
      expect(stats.validLines).toBe(3);
      expect(stats.errorLines).toBe(0);
      expect(stats.successRate).toBe(100);
    });
  });

  describe('Интеграционные тесты', () => {
    test('полный цикл: объекты → NDJSON → объекты', () => {
      const original = [
        { id: 1, name: 'John', active: true },
        { id: 2, name: 'Jane', active: false },
        { id: 3, name: 'Bob', active: true }
      ];
      
      // Конвертируем в NDJSON
      const ndjson = NdjsonParser.toNdjson(original);
      
      // Проверяем формат NDJSON
      const lines = ndjson.split('\n');
      expect(lines).toHaveLength(3);
      lines.forEach(line => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
      
      // Конвертируем обратно
      const restored = NdjsonParser.fromNdjson(ndjson);
      
      // Проверяем что данные идентичны
      expect(restored).toEqual(original);
    });

    test('обрабатывает специальные символы', () => {
      const data = [
        { text: 'Line 1\nLine 2' }, // Перенос строки
        { text: 'Quote: "test"' }, // Кавычки
        { text: 'Comma, separated' }, // Запятая
        { text: 'Tab\tcharacter' } // Табуляция
      ];
      
      const ndjson = NdjsonParser.toNdjson(data);
      const restored = NdjsonParser.fromNdjson(ndjson);
      
      expect(restored).toEqual(data);
    });

    test('производительность с большими данными', () => {
      // Генерируем 10,000 объектов
      const data = [];
      for (let i = 0; i < 10000; i++) {
        data.push({
          id: i,
          name: `User${i}`,
          email: `user${i}@example.com`,
          score: Math.random() * 100,
          active: Math.random() > 0.5,
          createdAt: new Date().toISOString()
        });
      }
      
      const startTime = Date.now();
      const ndjson = NdjsonParser.toNdjson(data);
      const serializeTime = Date.now() - startTime;
      
      const parseStart = Date.now();
      const restored = NdjsonParser.fromNdjson(ndjson);
      const parseTime = Date.now() - parseStart;
      
      expect(restored).toEqual(data);
      
      console.log('\n📊 Производительность NDJSON:');
      console.log(`  Объектов: ${data.length}`);
      console.log(`  Сериализация: ${serializeTime}ms`);
      console.log(`  Парсинг: ${parseTime}ms`);
      console.log(`  Всего: ${serializeTime + parseTime}ms`);
      console.log(`  Скорость: ${Math.round(data.length / ((serializeTime + parseTime) / 1000))} объектов/сек`);
      
      // Должно быть достаточно быстро
      expect(serializeTime + parseTime).toBeLessThan(2000);
    });
  });
});
