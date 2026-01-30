import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
/**
 * Тесты для DelimiterCache
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

const DelimiterCacheModule = require('../src/core/delimiter-cache');
const DelimiterCache = DelimiterCacheModule.DelimiterCache ?? DelimiterCacheModule;
import { csvToJson, createDelimiterCache, getDelimiterCacheStats } from '../csv-to-json';

describe('DelimiterCache', () => {
  describe('Конструктор и базовые методы', () => {
    test('создает новый экземпляр с заданным размером', () => {
      const cache = new DelimiterCache(50);
      expect(cache).toBeInstanceOf(DelimiterCache);
      expect(cache.getStats().size).toBe(0);
    });

    test('создает экземпляр с размером по умолчанию', () => {
      const cache = new DelimiterCache();
      expect(cache).toBeInstanceOf(DelimiterCache);
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('Кэширование значений', () => {
    test('сохраняет и получает значение из кэша', () => {
      const cache = new DelimiterCache(10);
      const csv = 'id,name,email\n1,John,john@example.com';
      const candidates = [',', ';', '\t'];
      
      cache.set(csv, candidates, ',');
      const result = cache.get(csv, candidates);
      
      expect(result).toBe(',');
      expect(cache.getStats().hits).toBe(1);
      expect(cache.getStats().misses).toBe(0);
    });

    test('возвращает null для отсутствующего значения', () => {
      const cache = new DelimiterCache(10);
      const csv = 'id,name,email\n1,John,john@example.com';
      const candidates = [',', ';', '\t'];
      
      const result = cache.get(csv, candidates);
      
      expect(result).toBeNull();
      expect(cache.getStats().misses).toBe(1);
      expect(cache.getStats().hits).toBe(0);
    });

    test('обновляет позицию в LRU при повторном доступе', () => {
      const cache = new DelimiterCache(3);
      
      // Добавляем 3 значения
      cache.set('csv1', [','], ',');
      cache.set('csv2', [','], ';');
      cache.set('csv3', [','], '\t');
      
      // Получаем первое значение (должно переместиться в конец LRU)
      cache.get('csv1', [',']);
      
      // Добавляем четвертое значение (должно вытеснить csv2, а не csv1)
      cache.set('csv4', [','], '|');
      
      // Проверяем что csv1 все еще в кэше
      expect(cache.get('csv1', [','])).toBe(',');
      // csv2 должен быть вытеснен
      expect(cache.get('csv2', [','])).toBeNull();
      // csv3 и csv4 должны быть в кэше
      expect(cache.get('csv3', [','])).toBe('\t');
      expect(cache.get('csv4', [','])).toBe('|');
      
      expect(cache.getStats().evictions).toBe(1);
    });
  });

  describe('Очистка кэша', () => {
    test('очищает кэш и сбрасывает статистику', () => {
      const cache = new DelimiterCache(10);
      
      cache.set('csv1', [','], ',');
      cache.set('csv2', [','], ';');
      cache.get('csv1', [',']);
      
      expect(cache.getStats().size).toBe(2);
      expect(cache.getStats().hits).toBe(1);
      
      cache.clear();
      
      expect(cache.getStats().size).toBe(0);
      expect(cache.getStats().hits).toBe(0);
      expect(cache.getStats().misses).toBe(0);
      expect(cache.getStats().evictions).toBe(0);
      
      expect(cache.get('csv1', [','])).toBeNull();
      expect(cache.get('csv2', [','])).toBeNull();
    });
  });

  describe('Статистика', () => {
    test('возвращает корректную статистику', () => {
      const cache = new DelimiterCache(10);
      
      // Добавляем и получаем значения
      cache.set('csv1', [','], ',');
      cache.set('csv2', [','], ';');
      cache.get('csv1', [',']);
      cache.get('csv2', [',']);
      cache.get('csv3', [',']); // Промах
      cache.get('csv4', [',']); // Промах
      
      const stats = cache.getStats();
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.size).toBe(2);
      expect(stats.totalRequests).toBe(4);
      expect(stats.hitRate).toBe(50); // 2/4 = 50%
      expect(stats.evictions).toBe(0);
    });

    test('рассчитывает hitRate для пустого кэша', () => {
      const cache = new DelimiterCache(10);
      const stats = cache.getStats();
      
      expect(stats.hitRate).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('Статический метод autoDetectDelimiter', () => {
    test('определяет разделитель для CSV с запятыми', () => {
      const csv = 'id,name,email\n1,John,john@example.com';
      const result = DelimiterCache.autoDetectDelimiter(csv);
      
      expect(result).toBe(',');
    });

    test('определяет разделитель для CSV с точкой с запятой', () => {
      const csv = 'id;name;email\n1;John;john@example.com';
      const result = DelimiterCache.autoDetectDelimiter(csv);
      
      expect(result).toBe(';');
    });

    test('определяет разделитель для TSV', () => {
      const csv = 'id\tname\temail\n1\tJohn\tjohn@example.com';
      const result = DelimiterCache.autoDetectDelimiter(csv);
      
      expect(result).toBe('\t');
    });

    test('использует кэш если предоставлен', () => {
      const cache = new DelimiterCache(10);
      const csv = 'id,name,email\n1,John,john@example.com';
      
      // Первый вызов - должен сохранить в кэш
      const result1 = DelimiterCache.autoDetectDelimiter(csv, [','], cache);
      expect(result1).toBe(',');
      expect(cache.getStats().misses).toBe(1);
      
      // Второй вызов - должен использовать кэш
      const result2 = DelimiterCache.autoDetectDelimiter(csv, [','], cache);
      expect(result2).toBe(',');
      expect(cache.getStats().hits).toBe(1);
    });

    test('возвращает стандартный разделитель для пустой строки', () => {
      const result = DelimiterCache.autoDetectDelimiter('');
      expect(result).toBe(';');
      
      const result2 = DelimiterCache.autoDetectDelimiter(null);
      expect(result2).toBe(';');
      
      const result3 = DelimiterCache.autoDetectDelimiter(undefined);
      expect(result3).toBe(';');
    });

    test('возвращает стандартный разделитель если разделитель не найден', () => {
      const csv = 'id name email\n1 John john@example.com';
      const result = DelimiterCache.autoDetectDelimiter(csv);
      
      expect(result).toBe(';');
    });

    test('использует кастомные кандидаты', () => {
      const csv = 'id|name|email\n1|John|john@example.com';
      const result = DelimiterCache.autoDetectDelimiter(csv, ['|', ';']);
      
      expect(result).toBe('|');
    });
  });

  describe('Производительность', () => {
    test('быстрее с кэшированием при повторных вызовах', () => {
      const cache = new DelimiterCache(100);
      const csv = 'id,name,email,age,city,country\n1,John,john@example.com,30,New York,USA\n2,Jane,jane@example.com,25,London,UK';
      const perfEnabled = process.env.JTCSV_PERF_TESTS === '1';

      // Warm up to reduce JIT/GC noise in timing checks.
      for (let i = 0; i < 200; i++) {
        DelimiterCache.autoDetectDelimiter(csv, [',', ';', '\t', '|']);
        DelimiterCache.autoDetectDelimiter(csv, [',', ';', '\t', '|'], cache);
      }
      
      // Первый вызов без кэша
      const startTime1 = Date.now();
      for (let i = 0; i < 1000; i++) {
        DelimiterCache.autoDetectDelimiter(csv, [',', ';', '\t', '|']);
      }
      const timeWithoutCache = Date.now() - startTime1;
      
      // Второй вызов с кэшем
      const startTime2 = Date.now();
      for (let i = 0; i < 1000; i++) {
        DelimiterCache.autoDetectDelimiter(csv, [',', ';', '\t', '|'], cache);
      }
      const timeWithCache = Date.now() - startTime2;
      
      console.log('\n📊 Производительность DelimiterCache:');
      console.log(`  Без кэша: ${timeWithoutCache}ms`);
      console.log(`  С кэшем: ${timeWithCache}ms`);
      console.log(`  Ускорение: ${(timeWithoutCache / timeWithCache).toFixed(2)}x`);
      console.log(`  Hit rate: ${cache.getStats().hitRate.toFixed(2)}%`);
      
      expect(cache.getStats().hitRate).toBeGreaterThan(90); // Должен быть высокий hit rate
      if (perfEnabled) {
        expect(timeWithCache).toBeLessThan(timeWithoutCache);
      }
    });

    test('обрабатывает большие файлы эффективно', () => {
      const cache = new DelimiterCache(100);
      
      // Создаем большой CSV (10000 строк)
      let largeCsv = 'id,name,email,score\n';
      for (let i = 0; i < 10000; i++) {
        largeCsv += `${i},User${i},user${i}@example.com,${Math.random() * 100}\n`;
      }
      
      const startTime = Date.now();
      const result = DelimiterCache.autoDetectDelimiter(largeCsv, [',', ';', '\t', '|'], cache);
      const detectionTime = Date.now() - startTime;
      
      expect(result).toBe(',');
      
      console.log('\n📊 Производительность с большим файлом:');
      console.log('  Строк: 10000');
      console.log(`  Время детектирования: ${detectionTime}ms`);
      
      // Должно быть достаточно быстро даже для больших файлов
      expect(detectionTime).toBeLessThan(100);
    });
  });

  describe('Интеграционные тесты', () => {
    test('интеграция с csvToJson', () => {
      
      const csv = `id,name,email,active
1,John,john@example.com,true
2,Jane,jane@example.com,false
3,Bob,bob@example.com,true`;
      
      // Создаем кастомный кэш
      const cache = createDelimiterCache(50);
      
      // Первый вызов - должен сохранить в кэш
      const result1 = csvToJson(csv, {
        useCache: true,
        cache: cache,
        parseBooleans: true
      });
      
      expect(result1).toHaveLength(3);
      expect(result1[0].id).toBe('1');
      expect(result1[0].active).toBe(true);
      
      const stats1 = cache.getStats();
      expect(stats1.misses).toBe(1); // Первый вызов - промах
      
      // Второй вызов с тем же CSV - должен использовать кэш
      const result2 = csvToJson(csv, {
        useCache: true,
        cache: cache,
        parseBooleans: true
      });
      
      expect(result2).toEqual(result1);
      
      const stats2 = cache.getStats();
      expect(stats2.hits).toBe(1); // Второй вызов - попадание
    });

    test('отключение кэширования', () => {
      
      const csv = 'id,name\n1,John\n2,Jane';
      
      const initialStats = getDelimiterCacheStats();
      
      // Вызываем с отключенным кэшем
      const result = csvToJson(csv, {
        useCache: false
      });
      
      const finalStats = getDelimiterCacheStats();
      
      expect(result).toHaveLength(2);
      // Статистика не должна измениться так как кэш отключен
      expect(finalStats.hits).toBe(initialStats.hits);
      expect(finalStats.misses).toBe(initialStats.misses);
    });

    test('множественные CSV с разными разделителями', () => {
      const cache = new DelimiterCache(10);
      
      const csv1 = 'id,name,email\n1,John,john@example.com';
      const csv2 = 'id;name;email\n1;Jane;jane@example.com';
      const csv3 = 'id\tname\temail\n1\tBob\tbob@example.com';
      const csv4 = 'id|name|email\n1|Alice|alice@example.com';
      
      const results = [
        DelimiterCache.autoDetectDelimiter(csv1, [',', ';', '\t', '|'], cache),
        DelimiterCache.autoDetectDelimiter(csv2, [',', ';', '\t', '|'], cache),
        DelimiterCache.autoDetectDelimiter(csv3, [',', ';', '\t', '|'], cache),
        DelimiterCache.autoDetectDelimiter(csv4, [',', ';', '\t', '|'], cache)
      ];
      
      expect(results).toEqual([',', ';', '\t', '|']);
      
      const stats = cache.getStats();
      expect(stats.misses).toBe(4); // Все 4 должны быть промахами (первый вызов)
      expect(stats.size).toBe(4); // Все 4 должны быть в кэше
      
      // Повторные вызовы
      const results2 = [
        DelimiterCache.autoDetectDelimiter(csv1, [',', ';', '\t', '|'], cache),
        DelimiterCache.autoDetectDelimiter(csv2, [',', ';', '\t', '|'], cache),
        DelimiterCache.autoDetectDelimiter(csv3, [',', ';', '\t', '|'], cache),
        DelimiterCache.autoDetectDelimiter(csv4, [',', ';', '\t', '|'], cache)
      ];
      
      expect(results2).toEqual([',', ';', '\t', '|']);
      
      const stats2 = cache.getStats();
      expect(stats2.hits).toBe(4); // Все 4 должны быть попаданиями
    });
  });

  describe('Генерация ключа кэша', () => {
    test('генерирует одинаковый ключ для одинаковых входных данных', () => {
      const cache = new DelimiterCache(10);
      
      const csv1 = 'id,name,email\n1,John,john@example.com';
      const csv2 = 'id,name,email\n1,John,john@example.com'; // Такая же строка
      const candidates = [',', ';'];
      
      // Используем приватный метод через рефлексию
      const key1 = cache._generateKey(csv1, candidates);
      const key2 = cache._generateKey(csv2, candidates);
      
      expect(key1).toBe(key2);
    });

    test('генерирует разные ключи для разных входных данных', () => {
      const cache = new DelimiterCache(10);
      
      const csv1 = 'id,name,email\n1,John,john@example.com';
      const csv2 = 'id;name;email\n1;Jane;jane@example.com';
      const candidates1 = [',', ';'];
      const candidates2 = [';', ',']; // Другой порядок
      
      const key1 = cache._generateKey(csv1, candidates1);
      const key2 = cache._generateKey(csv2, candidates1);
      const key3 = cache._generateKey(csv1, candidates2);
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    test('использует только первые 1000 символов для генерации ключа', () => {
      const cache = new DelimiterCache(10);
      
      // Создаем очень длинную строку
      let longCsv = '';
      for (let i = 0; i < 2000; i++) {
        longCsv += 'x';
      }
      longCsv += ',id,name';
      
      const shortCsv = longCsv.substring(0, 1000);
      
      const key1 = cache._generateKey(longCsv, [',']);
      const key2 = cache._generateKey(shortCsv, [',']);
      
      // Ключи должны быть одинаковыми так как используются только первые 1000 символов
      expect(key1).toBe(key2);
    });
  });
});
