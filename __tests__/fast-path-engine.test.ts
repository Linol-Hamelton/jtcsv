import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
/**
 * Тесты для Fast-Path Engine
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

import FastPathEngine from '../src/engines/fast-path-engine';

// Skip strict performance checks in CI (variable performance of cloud runners)
const IS_CI = !!process.env.CI;

describe('FastPathEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new FastPathEngine();
  });

  afterEach(() => {
    engine.reset();
  });

  describe('Анализ структуры CSV', () => {
    test('определяет простой CSV без кавычек', () => {
      const csv = 'id,name,age\n1,John,30\n2,Jane,25';
      const structure = engine.analyzeStructure(csv);
      
      expect(structure.delimiter).toBe(',');
      expect(structure.hasQuotes).toBe(false);
      expect(structure.hasNewlinesInFields).toBe(false);
      expect(structure.fieldConsistency).toBe(true);
      expect(structure.recommendedEngine).toBe('SIMPLE');
    });

    test('определяет CSV с кавычками', () => {
      const csv = 'id,name,description\n1,John,"Software engineer"\n2,Jane,"Data analyst"';
      const structure = engine.analyzeStructure(csv);
      
      expect(structure.hasQuotes).toBe(true);
      expect(structure.recommendedEngine).toBe('QUOTE_AWARE');
    });

    test('определяет CSV с escaped кавычками', () => {
      const csv = 'id,quote\n1,"He said ""hello"""\n2,"Test """" escaped"';
      const structure = engine.analyzeStructure(csv);
      
      expect(structure.hasQuotes).toBe(true);
      expect(structure.hasEscapedQuotes).toBe(true);
    });

    test('определяет разделитель табуляции', () => {
      const csv = 'id\tname\tage\n1\tJohn\t30';
      const structure = engine.analyzeStructure(csv);
      
      expect(structure.delimiter).toBe('\t');
    });

    test('определяет разделитель точки с запятой', () => {
      const csv = 'id;name;age\n1;John;30';
      const structure = engine.analyzeStructure(csv);
      
      expect(structure.delimiter).toBe(';');
    });
  });

  describe('Компиляция парсеров', () => {
    test('компилирует простой парсер', () => {
      const structure = {
        delimiter: ',',
        hasQuotes: false,
        hasNewlinesInFields: false,
        fieldConsistency: true,
        recommendedEngine: 'SIMPLE'
      };
      
      const parser = engine.compileParser(structure);
      expect(typeof parser).toBe('function');
      
      const stats = engine.getStats();
      expect(stats.simpleParserCount).toBe(1);
      expect(stats.cacheMisses).toBe(1);
    });

    test('кеширует скомпилированные парсеры', () => {
      const structure = {
        delimiter: ',',
        hasQuotes: false,
        hasNewlinesInFields: false,
        fieldConsistency: true,
        recommendedEngine: 'SIMPLE'
      };
      
      // Первая компиляция
      const parser1 = engine.compileParser(structure);
      // Вторая компиляция - должна быть из кеша
      const parser2 = engine.compileParser(structure);
      
      expect(parser1).toBe(parser2);
      
      const stats = engine.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
    });

    test('компилирует quote-aware парсер', () => {
      const structure = {
        delimiter: ',',
        hasQuotes: true,
        hasEscapedQuotes: true,
        hasNewlinesInFields: false,
        fieldConsistency: true,
        recommendedEngine: 'QUOTE_AWARE'
      };
      
      const parser = engine.compileParser(structure);
      expect(typeof parser).toBe('function');
      
      const stats = engine.getStats();
      expect(stats.quoteAwareParserCount).toBe(1);
    });
  });

  describe('Парсинг CSV', () => {
    test('парсит простой CSV', () => {
      const csv = 'id,name,age\n1,John,30\n2,Jane,25';
      const result = engine.parse(csv);
      
      expect(result).toEqual([
        ['id', 'name', 'age'],
        ['1', 'John', '30'],
        ['2', 'Jane', '25']
      ]);
    });

    test('парсит CSV с escaped кавычками', () => {
      const csv = 'id,quote\n1,"He said ""hello"""\n2,"Test """" escaped"';
      const result = engine.parse(csv);
      
      expect(result).toEqual([
        ['id', 'quote'],
        ['1', 'He said "hello"'],
        ['2', 'Test "" escaped']
      ]);
    });

    test('парсит CSV с escaped кавычками', () => {
      const csv = 'id,quote\n1,"He said ""hello"""\n2,"Test """" escaped"';
      const result = engine.parse(csv);
      
      expect(result).toEqual([
        ['id', 'quote'],
        ['1', 'He said "hello"'],
        ['2', 'Test "" escaped']
      ]);
    });

    test('парсит CSV с переносами строк в полях', () => {
      const csv = 'id,text\n1,"Line 1\nLine 2"\n2,Single line';
      const result = engine.parse(csv);
      
      expect(result).toEqual([
        ['id', 'text'],
        ['1', 'Line 1\nLine 2'],
        ['2', 'Single line']
      ]);
    });

    test('парсит CSV с разными разделителями', () => {
      const csv = 'id;name;age\n1;John;30\n2;Jane;25';
      const result = engine.parse(csv, { delimiter: ';' });
      
      expect(result).toEqual([
        ['id', 'name', 'age'],
        ['1', 'John', '30'],
        ['2', 'Jane', '25']
      ]);
    });

    test('обрабатывает пустые строки', () => {
      const csv = 'id,name\n1,John\n\n2,Jane\n';
      const result = engine.parse(csv);
      
      expect(result).toEqual([
        ['id', 'name'],
        ['1', 'John'],
        ['2', 'Jane']
      ]);
    });
  });

  describe('Производительность', () => {
    test('обрабатывает большие CSV файлы', () => {
      // Генерируем большой CSV (10,000 строк)
      let csv = 'id,name,email,score\n';
      for (let i = 1; i <= 10000; i++) {
        csv += `${i},User${i},user${i}@example.com,${Math.random() * 100}\n`;
      }
      
      const startTime = Date.now();
      const result = engine.parse(csv);
      const duration = Date.now() - startTime;
      
      expect(result.length).toBe(10001); // Заголовок + 10,000 строк
      expect(duration).toBeLessThan(1000); // Должно быть меньше 1 секунды
      
      console.log('\n📊 Производительность Fast-Path Engine:');
      console.log(`  Строк: ${result.length - 1}`);
      console.log(`  Время: ${duration}ms`);
      console.log(`  Скорость: ${Math.round((result.length - 1) / (duration / 1000))} строк/сек`);
    });

    test('сравнивает производительность разных парсеров', () => {
      // Простой CSV
      let simpleCsv = 'id,name\n';
      for (let i = 1; i <= 5000; i++) {
        simpleCsv += `${i},Name${i}\n`;
      }
      
      // CSV с кавычками
      let quotedCsv = 'id,name\n';
      for (let i = 1; i <= 5000; i++) {
        quotedCsv += `${i},"Name ${i}"\n`;
      }
      
      const simpleStart = Date.now();
      engine.parse(simpleCsv);
      const simpleTime = Date.now() - simpleStart;
      
      const quotedStart = Date.now();
      engine.parse(quotedCsv);
      const quotedTime = Date.now() - quotedStart;
      
      console.log('\n📊 Сравнение производительности:');
      console.log(`  Простой CSV: ${simpleTime}ms`);
      console.log(`  CSV с кавычками: ${quotedTime}ms`);
      console.log(`  Разница: ${((quotedTime - simpleTime) / simpleTime * 100).toFixed(1)}%`);
      
      // Quote-aware parser should be slower, but not by much.
      // Guard against the local-dev case where simpleTime rounded to
      // 0 ms — `0 * 10 === 0`, so any positive quotedTime fails the
      // ratio. Skip the ratio check whenever the baseline is too
      // small to be meaningful (< 1 ms or in CI).
      if (!IS_CI && simpleTime >= 1) {
        expect(quotedTime).toBeLessThan(simpleTime * 10);
      } else {
        expect(simpleTime).toBeGreaterThanOrEqual(0);
        expect(quotedTime).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Статистика', () => {
    test('собирает статистику использования', () => {
      const csv1 = 'id,name\n1,John\n2,Jane';
      const csv2 = 'id,name\n1,"John Doe"\n2,"Jane Smith"';
      
      engine.parse(csv1);
      engine.parse(csv2);
      engine.parse(csv1); // Должен использовать кеш
      
      const stats = engine.getStats();
      
      expect(stats.simpleParserCount).toBe(1);
      expect(stats.quoteAwareParserCount).toBe(1);
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(2);
      expect(stats.totalParsers).toBe(2);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    test('сбрасывает статистику', () => {
      const csv = 'id,name\n1,John';
      engine.parse(csv);
      
      let stats = engine.getStats();
      expect(stats.cacheMisses).toBe(1);
      
      engine.reset();
      
      stats = engine.getStats();
      expect(stats.cacheMisses).toBe(0);
      expect(stats.totalParsers).toBe(0);
    });
  });

  describe('parseRows', () => {
    test('emits rows for simple CSV', () => {
      const csv = 'id,name,age\n1,John,30\n2,Jane,25';
      const rows = [];

      engine.parseRows(csv, {}, (row) => rows.push(row));

      expect(rows).toEqual(engine.parse(csv));
    });

    test('emits rows for quoted fields with newlines', () => {
      const csv = 'id,text\n1,"Line 1\nLine 2"\n2,Single line';
      const rows = [];

      engine.parseRows(csv, {}, (row) => rows.push(row));

      expect(rows).toEqual(engine.parse(csv));
    });

    test('falls back when quotes appear after the sample window', () => {
      let csv = 'id,name\n';
      for (let i = 0; i < 200; i++) {
        csv += `${i},User${i}\n`;
      }
      csv += '201,"User 201"\n';

      const rows = [];
      engine.parseRows(csv, {}, (row) => rows.push(row));

      expect(rows).toEqual(engine.parse(csv));
    });
  });
});
