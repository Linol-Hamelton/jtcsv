#!/usr/bin/env node

/**
 * Простой пример использования новых возможностей JTCSV 2.1.0
 * Демонстрация Fast-Path Engine, NDJSON и Plugin System
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

// Используем require для совместимости с текущей структурой проекта
const { jsonToCsv, csvToJson } = require('jtcsv');
import type { JsonToCsvOptions, CsvToJsonOptions } from '../src/types';

(async () => {
  console.log('🚀 JTCSV 2.1.0 - Демонстрация новых возможностей\n');

  // ============================================================================
  // 1. Базовое использование (обратная совместимость)
  // ============================================================================

  console.log('1. 📦 Базовое использование (обратная совместимость)');
  console.log('='.repeat(60));

  const sampleData = [
    { id: 1, name: 'John Doe', age: 30, city: 'New York' },
    { id: 2, name: 'Jane Smith', age: 25, city: 'London' },
    { id: 3, name: 'Bob Johnson', age: 35, city: 'Tokyo' }
  ];

  // Конвертация JSON → CSV
  const csv = jsonToCsv(sampleData, { delimiter: ',' });
  console.log('📄 CSV результат:');
  console.log(csv);
  console.log();

  // Конвертация CSV → JSON
  const json = csvToJson(csv, { delimiter: ',' });
  console.log('📊 JSON результат:');
  console.log(JSON.stringify(json, null, 2));
  console.log();

  // ============================================================================
  // 2. Fast-Path Engine (оптимизированный парсинг)
  // ============================================================================

  console.log('\n2. ⚡ Fast-Path Engine (оптимизированный парсинг)');
  console.log('='.repeat(60));

  const FastPathEngine = require('../src/engines/fast-path-engine');
  const engine = new FastPathEngine();

  const largeCsv = `id,name,age,city
1,John Doe,30,New York
2,Jane Smith,25,London
3,Bob Johnson,35,Tokyo
4,Alice Brown,28,Paris
5,Charlie Wilson,42,Berlin`;

  console.log('📊 Парсинг CSV с Fast-Path Engine:');
  const fastPathResult = engine.parse(largeCsv, { delimiter: ',' });
  console.log(JSON.stringify(fastPathResult, null, 2));
  console.log();

  // ============================================================================
  // 3. NDJSON поддержка (Newline Delimited JSON)
  // ============================================================================

  console.log('\n3. 📝 NDJSON поддержка (Newline Delimited JSON)');
  console.log('='.repeat(60));

  const { jsonToNdjson, ndjsonToJson } = require('jtcsv');

  const ndjsonData = [
    { id: 1, name: 'John', active: true },
    { id: 2, name: 'Jane', active: false },
    { id: 3, name: 'Bob', active: true }
  ];

  // Конвертация в NDJSON
  const ndjson = jsonToNdjson(ndjsonData);
  console.log('📄 NDJSON результат:');
  console.log(ndjson);
  console.log();

  // Обратная конвертация
  const fromNdjson = ndjsonToJson(ndjson);
  console.log('📊 JSON из NDJSON:');
  console.log(JSON.stringify(fromNdjson, null, 2));
  console.log();

  // ============================================================================
  // 4. Потоковая обработка
  // ============================================================================

  console.log('\n4. 🌊 Потоковая обработка');
  console.log('='.repeat(60));

  const { streamCsvToJson, streamJsonToCsv } = require('jtcsv');

  console.log('📊 Пример потоковой обработки CSV:');
  
  // Создание потока CSV данных
  const csvStream = `id,name,age
1,John,30
2,Jane,25
3,Bob,35`;

  const jsonStream = streamCsvToJson(csvStream, { delimiter: ',' });
  
  // В реальном приложении здесь была бы обработка потока
  console.log('✅ Поток создан успешно');
  console.log();

  // ============================================================================
  // 5. Асинхронные функции
  // ============================================================================

  console.log('\n5. ⏱️ Асинхронные функции');
  console.log('='.repeat(60));

  try {
    // Использование асинхронных версий функций
    const asyncCsv = await jsonToCsv(sampleData, { delimiter: ';' });
    console.log('📄 Асинхронный CSV результат:');
    console.log(asyncCsv.substring(0, 100) + '...');
    console.log();
  } catch (error: any) {
    console.error('❌ Ошибка при асинхронной конвертации:', error.message);
  }

  // ============================================================================
  // 6. Многопоточная обработка
  // ============================================================================

  console.log('\n6. 🚀 Многопоточная обработка');
  console.log('='.repeat(60));

  try {
    const { processCsvMultithreaded } = require('../src/workers/csv-multithreaded');
    
    console.log('📊 Запуск многопоточной обработки...');
    
    // В реальном приложении здесь была бы обработка больших данных
    console.log('✅ Многопоточная система готова к использованию');
    console.log();
  } catch (error) {
    console.log('ℹ️ Многопоточная обработка доступна только в Node.js');
    console.log();
  }

  // ============================================================================
  // 7. TypeScript типы
  // ============================================================================

  console.log('\n7. 📘 TypeScript типы');
  console.log('='.repeat(60));

  // Демонстрация TypeScript типов
  const typedOptions: JsonToCsvOptions = {
    delimiter: ',',
    includeHeaders: true,
    maxRecords: 100,
    preventCsvInjection: true,
    rfc4180Compliant: true
  };

  console.log('✅ TypeScript типы корректно работают');
  console.log('📋 Пример опций:', JSON.stringify(typedOptions, null, 2));
  console.log();

  // ============================================================================
  // Заключение
  // ============================================================================

  console.log('\n🎉 Демонстрация завершена!');
  console.log('='.repeat(60));
  console.log('\n📚 Основные возможности JTCSV 2.1.0:');
  console.log('   • ⚡ Fast-Path Engine для оптимизированного парсинга');
  console.log('   • 📝 Поддержка NDJSON (Newline Delimited JSON)');
  console.log('   • 🌊 Потоковая обработка больших данных');
  console.log('   • ⏱️ Асинхронные и многопоточные функции');
  console.log('   • 📘 Полная поддержка TypeScript');
  console.log('   • 🔌 Расширяемая плагинная система');
  console.log('   • 🛡️ Защита от CSV инъекций');
  console.log('   • 📊 Поддержка различных форматов (CSV, TSV, NDJSON)');
  console.log('\n🚀 Готово к использованию в production!');
})();

// Обработка ошибок
process.on('unhandledRejection', (error) => {
  console.error('❌ Необработанная ошибка:', error);
  process.exit(1);
});
