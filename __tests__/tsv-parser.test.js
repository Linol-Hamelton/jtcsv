/**
 * Тесты для TSV парсера
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

const TsvParser = require('../src/formats/tsv-parser');
const { Transform } = require('stream');

describe('TsvParser', () => {
  describe('jsonToTsv', () => {
    test('конвертирует массив объектов в TSV', () => {
      const data = [
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 }
      ];
      
      const tsv = TsvParser.jsonToTsv(data);
      // Нормализуем переносы строк для кроссплатформенности
      const lines = tsv.split(/\r?\n/).filter(line => line.trim() !== '');
      
      expect(lines[0]).toBe('id\tname\tage');
      expect(lines[1]).toBe('1\tJohn\t30');
      expect(lines[2]).toBe('2\tJane\t25');
    });

    test('работает с опциями', () => {
      const data = [{ id: 1, name: 'John' }];
      const tsv = TsvParser.jsonToTsv(data, {
        includeHeaders: false
      });
      
      // Нормализуем переносы строк
      const lines = tsv.split(/\r?\n/).filter(line => line.trim() !== '');
      expect(lines[0]).toBe('1\tJohn');
    });

    test('экранирует специальные символы', () => {
      const data = [
        { text: 'Line1\nLine2' }, // перенос строки
        { text: 'Tab\tcharacter' }, // табуляция
        { text: 'Quote"test' } // кавычки
      ];
      
      const tsv = TsvParser.jsonToTsv(data);
      expect(tsv).toContain('text');
      // Нормализуем и фильтруем пустые строки
      const lines = tsv.split(/\r?\n/).filter(line => line.trim() !== '');
      expect(lines).toHaveLength(5); // заголовок + 4 строки (перенос строки разбивает одну строку на две)
    });
  });

  describe('tsvToJson', () => {
    test('конвертирует TSV строку в массив объектов', () => {
      const tsv = 'id\tname\tage\n1\tJohn\t30\n2\tJane\t25';
      const result = TsvParser.tsvToJson(tsv);
      
      expect(result).toEqual([
        { id: '1', name: 'John', age: '30' },
        { id: '2', name: 'Jane', age: '25' }
      ]);
    });

    test('работает без заголовков', () => {
      const tsv = '1\tJohn\t30\n2\tJane\t25';
      const result = TsvParser.tsvToJson(tsv, {
        hasHeaders: false,
        parseNumbers: true
      });
      
      expect(result).toEqual([
        { column1: 1, column2: 'John', column3: 30 },
        { column1: 2, column2: 'Jane', column3: 25 }
      ]);
    });

    test('парсит числа и булевы значения', () => {
      const tsv = 'id\tactive\tscore\n1\ttrue\t95.5\n2\tfalse\t85.0';
      const result = TsvParser.tsvToJson(tsv, {
        parseBooleans: true,
        parseNumbers: true
      });
      
      expect(result).toEqual([
        { id: 1, active: true, score: 95.5 },
        { id: 2, active: false, score: 85.0 }
      ]);
    });
  });

  describe('isTsv', () => {
    test('определяет TSV по наличию табуляций', () => {
      const tsvSample = 'id\tname\tage\n1\tJohn\t30';
      expect(TsvParser.isTsv(tsvSample)).toBe(true);
    });

    test('определяет что это не TSV если больше запятых', () => {
      const csvSample = 'id,name,age\n1,John,30';
      expect(TsvParser.isTsv(csvSample)).toBe(false);
    });

    test('возвращает false для пустой строки', () => {
      expect(TsvParser.isTsv('')).toBe(false);
      expect(TsvParser.isTsv(null)).toBe(false);
      expect(TsvParser.isTsv(undefined)).toBe(false);
    });

    test('работает с смешанными разделителями', () => {
      const mixedSample = 'id,name\tage\n1,John\t30';
      // В этой строке: запятых - 2, табуляций - 2, но табуляций не больше чем запятых
      expect(TsvParser.isTsv(mixedSample)).toBe(false);
      
      const tsvSample = 'id\tname\tage\n1\tJohn\t30';
      expect(TsvParser.isTsv(tsvSample)).toBe(true);
    });
  });

  describe('validateTsv', () => {
    test('валидирует корректный TSV', () => {
      const tsv = 'id\tname\n1\tJohn\n2\tJane';
      const result = TsvParser.validateTsv(tsv);
      
      expect(result.valid).toBe(true);
      expect(result.stats.totalLines).toBe(3); // заголовок + 2 строки
      expect(result.stats.totalColumns).toBe(2);
      expect(result.stats.consistentColumns).toBe(true);
    });

    test('обнаруживает неконсистентные колонки', () => {
      const tsv = 'id\tname\n1\tJohn\n2\tJane\tExtra';
      const result = TsvParser.validateTsv(tsv);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors[0].error).toBe('Inconsistent column count');
    });

    test('проверяет пустые поля если требуется', () => {
      const tsv = 'id\tname\tage\n1\t\t30\n2\tJane\t';
      const result = TsvParser.validateTsv(tsv, {
        disallowEmptyFields: true
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    test('возвращает ошибку для не-строки', () => {
      const result = TsvParser.validateTsv(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Input must be a non-empty string');
    });
  });

  describe('readTsvAsJson', () => {
    test('читает TSV файл и конвертирует в JSON', async () => {
      // Создаем временный файл для теста
      const fs = require('fs').promises;
      const path = require('path');
      const tempFile = path.join(__dirname, 'temp-test.tsv');
      
      try {
        const tsvContent = 'id\tname\tage\n1\tJohn\t30\n2\tJane\t25';
        await fs.writeFile(tempFile, tsvContent, 'utf8');
        
        const result = await TsvParser.readTsvAsJson(tempFile, {
          parseNumbers: true
        });
        
        expect(result).toEqual([
          { id: 1, name: 'John', age: 30 },
          { id: 2, name: 'Jane', age: 25 }
        ]);
      } finally {
        // Удаляем временный файл
        try {
          await fs.unlink(tempFile);
        } catch (error) {
          // Игнорируем ошибки удаления
        }
      }
    });
  });

  describe('saveAsTsv', () => {
    test('сохраняет массив объектов как TSV файл', async () => {
      const fs = require('fs').promises;
      const path = require('path');
      const tempFile = path.join(__dirname, 'temp-save.tsv');
      
      try {
        const data = [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' }
        ];
        
        await TsvParser.saveAsTsv(data, tempFile);
        
        const fileContent = await fs.readFile(tempFile, 'utf8');
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
        
        expect(lines[0]).toBe('id\tname');
        expect(lines[1]).toBe('1\tJohn');
        expect(lines[2]).toBe('2\tJane');
      } finally {
        try {
          await fs.unlink(tempFile);
        } catch (error) {
          // Игнорируем ошибки удаления
        }
      }
    });
  });

  describe('Интеграционные тесты', () => {
    test('полный цикл: объекты -> TSV -> объекты', () => {
      const original = [
        { id: 1, name: 'John', active: true, score: 95.5 },
        { id: 2, name: 'Jane', active: false, score: 85.0 }
      ];
      
      // Конвертируем в TSV
      const tsv = TsvParser.jsonToTsv(original, {
        parseNumbers: true,
        parseBooleans: true
      });
      
      // Проверяем формат TSV
      expect(tsv).toContain('\t');
      const lines = tsv.split(/\r?\n/).filter(line => line.trim() !== '');
      expect(lines).toHaveLength(3); // заголовок + 2 строки
      
      // Конвертируем обратно
      const restored = TsvParser.tsvToJson(tsv, {
        parseBooleans: true,
        parseNumbers: true
      });
      
      // Проверяем что данные идентичны
      expect(restored).toEqual(original);
    });

    test('производительность с большими данными', () => {
      // Генерируем 5,000 объектов
      const data = [];
      for (let i = 0; i < 5000; i++) {
        data.push({
          id: i,
          name: `User${i}`,
          email: `user${i}@example.com`,
          score: Math.random() * 100,
          active: Math.random() > 0.5
        });
      }
      
      const startTime = Date.now();
      const tsv = TsvParser.jsonToTsv(data, {
        parseNumbers: true,
        parseBooleans: true
      });
      const serializeTime = Date.now() - startTime;
      
      const parseStart = Date.now();
      const restored = TsvParser.tsvToJson(tsv, {
        parseBooleans: true,
        parseNumbers: true
      });
      const parseTime = Date.now() - parseStart;
      
      expect(restored).toEqual(data);
      
      console.log(`  Производительность TSV:`);
      console.log(`  Объектов: ${data.length}`);
      console.log(`  Сериализация: ${serializeTime}ms`);
      console.log(`  Парсинг: ${parseTime}ms`);
      console.log(`  Всего: ${serializeTime + parseTime}ms`);
      console.log(`  Скорость: ${Math.round(data.length / ((serializeTime + parseTime) / 1000))} объектов/сек`);
      
      // Должно быть достаточно быстро
      expect(serializeTime + parseTime).toBeLessThan(1000);
    });
  });

  describe('Stream API', () => {
    test('создает Transform stream для JSON в TSV', () => {
      const transform = TsvParser.createJsonToTsvStream();
      expect(transform).toBeInstanceOf(Transform);
    });

    test('создает Transform stream для TSV в JSON', () => {
      const transform = TsvParser.createTsvToJsonStream();
      expect(transform).toBeInstanceOf(Transform);
    });
  });
});
