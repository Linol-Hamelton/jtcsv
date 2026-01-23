#!/usr/bin/env node

/**
 * Простой пример использования новых возможностей JTCSV 2.1.0
 * Демонстрация Fast-Path Engine, NDJSON и Plugin System
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

console.log('🚀 JTCSV 2.1.0 - Демонстрация новых возможностей\n');

// ============================================================================
// 1. Базовое использование (обратная совместимость)
// ============================================================================

console.log('1. 📦 Базовое использование (обратная совместимость)');
console.log('='.repeat(60));

const { jsonToCsv, csvToJson } = require('jtcsv

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

const { FastPathEngine } = require('../src/engines/fast-path-engine');
const engine = new FastPathEngine();

// Создаем тестовый CSV
let testCsv = 'id,name,description\n';
for (let i = 1; i <= 1000; i++) {
  testCsv += `${i},User${i},"Description for user ${i}"\n`;
}

console.log('📊 Анализ структуры CSV...');
const sample = testCsv.substring(0, 500);
const structure = engine.analyzeStructure(sample);
console.log('Структура:', {
  delimiter: structure.delimiter,
  hasQuotes: structure.hasQuotes,
  recommendedEngine: structure.recommendedEngine,
  complexity: structure.complexity
});

console.log('\n⚡ Парсинг 1000 строк с оптимизацией...');
const startTime = Date.now();
const parsed = engine.parse(testCsv);
const duration = Date.now() - startTime;

console.log(`✅ Парсинг завершен за ${duration}ms`);
console.log(`📈 Скорость: ${Math.round(1000 / (duration / 1000))} строк/сек`);
console.log(`📊 Результат: ${parsed.length} строк (${parsed[0].length} колонок)`);

const stats = engine.getStats();
console.log('\n📊 Статистика Fast-Path Engine:');
console.log(`  Simple парсеры: ${stats.simpleParserCount}`);
console.log(`  Quote-aware парсеры: ${stats.quoteAwareParserCount}`);
console.log(`  Cache hits: ${stats.cacheHits}`);
console.log(`  Cache miss: ${stats.cacheMisses}`);
console.log(`  Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);

// ============================================================================
// 3. NDJSON поддержка (потоковая обработка)
// ============================================================================

console.log('\n3. 📝 NDJSON поддержка (потоковая обработка)');
console.log('='.repeat(60));

const { NdjsonParser } = require('../src/formats/ndjson-parser');

// Конвертация в NDJSON
const ndjson = NdjsonParser.toNdjson(sampleData, { space: 2 });
console.log('📄 NDJSON результат:');
console.log(ndjson);
console.log();

// Обратная конвертация
const fromNdjson = NdjsonParser.fromNdjson(ndjson);
console.log('🔁 Обратная конвертация:');
console.log(JSON.stringify(fromNdjson, null, 2));
console.log();

// Статистика
const ndjsonStats = NdjsonParser.getStats(ndjson);
console.log('📊 Статистика NDJSON:');
console.log(`  Строк: ${ndjsonStats.totalLines}`);
console.log(`  Валидных: ${ndjsonStats.validLines}`);
console.log(`  Успешность: ${ndjsonStats.successRate}%`);

// ============================================================================
// 4. Plugin System (расширяемость)
// ============================================================================

console.log('\n4. 🔌 Plugin System (расширяемость)');
console.log('='.repeat(60));

const { PluginManager } = require('../src/core/plugin-system');

// Создаем простой плагин для логирования
const loggingPlugin = {
  name: 'Logging Plugin',
  version: '1.0.0',
  description: 'Логирование операций конвертации',
  
  hooks: {
    'before:csvToJson': (csv, context) => {
      console.log(`  📥 Начало csvToJson (${csv.length} байт)`);
      return csv;
    },
    
    'after:csvToJson': (result, context) => {
      console.log(`  📤 Завершение csvToJson (${result.length} записей)`);
      return result;
    },
    
    'before:jsonToCsv': (json, context) => {
      console.log(`  📥 Начало jsonToCsv (${json.length} записей)`);
      return json;
    },
    
    'after:jsonToCsv': (csv, context) => {
      console.log(`  📤 Завершение jsonToCsv (${csv.length} байт)`);
      return csv;
    }
  },
  
  middlewares: [
    async (ctx, next) => {
      console.log(`  🔄 Middleware: ${ctx.operation} начат`);
      const start = Date.now();
      await next();
      const duration = Date.now() - start;
      console.log(`  ✅ Middleware: ${ctx.operation} завершен за ${duration}ms`);
    }
  ]
};

// Создаем плагин для трансформации данных
const transformPlugin = {
  name: 'Transform Plugin',
  version: '1.0.0',
  description: 'Трансформация данных перед обработкой',
  
  hooks: {
    'before:jsonToCsv': (json, context) => {
      // Добавляем timestamp к каждой записи
      return json.map(item => ({
        ...item,
        processedAt: new Date().toISOString(),
        processedBy: 'transform-plugin'
      }));
    }
  }
};

// Инициализируем менеджер плагинов
const pluginManager = new PluginManager();
pluginManager.use('logging', loggingPlugin);
pluginManager.use('transform', transformPlugin);

console.log('📋 Зарегистрированные плагины:');
pluginManager.listPlugins().forEach(plugin => {
  console.log(`  • ${plugin.name} v${plugin.version} - ${plugin.description}`);
});

console.log('\n🔄 Выполнение с плагинами...');

// Основная функция для демонстрации
const processData = async () => {
  const testJson = [
    { id: 1, value: 'test1' },
    { id: 2, value: 'test2' }
  ];
  
  // Выполняем с плагинами
  const result = await pluginManager.executeWithPlugins(
    'jsonToCsv',
    testJson,
    { delimiter: '|' },
    (data, options) => {
      // Имитация основной функции
      const headers = Object.keys(data[0]);
      const rows = data.map(item => headers.map(h => item[h]).join(options.delimiter));
      return [headers.join(options.delimiter), ...rows].join('\n');
    }
  );
  
  console.log('\n📄 Результат с плагинами:');
  console.log(result);
};

await processData();

// Статистика плагинов
const pluginStats = pluginManager.getStats();
console.log('\n📊 Статистика Plugin System:');
console.log(`  Плагинов: ${pluginStats.plugins}`);
console.log(`  Hooks выполнено: ${pluginStats.hookExecutions}`);
console.log(`  Middleware выполнено: ${pluginStats.middlewareExecutions}`);
console.log(`  Уникальных hooks: ${pluginStats.uniqueHooks}`);

// ============================================================================
// 5. JTCSV с плагинами (полная интеграция)
// ============================================================================

console.log('\n5. 🎯 JTCSV с плагинами (полная интеграция)');
console.log('='.repeat(60));

// Проверяем доступность полной интеграции
try {
  const JtcsvWithPlugins = require('../src/index-with-plugins');
  
  console.log('✅ Полная интеграция доступна');
  console.log('Запустите для полной демонстрации:');
  console.log('  npm run example:plugins');
  console.log('\nИли посмотрите пример:');
  console.log('  examples/plugin-excel-exporter.js');
} catch (error) {
  console.log('⚠️  Полная интеграция требует дополнительных зависимостей');
  console.log('Установите @jtcsv/excel и exceljs для демонстрации Excel плагина:');
  console.log('  npm install @jtcsv/excel exceljs');
}

// ============================================================================
// Итоги
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('🎉 ДЕМОНСТРАЦИЯ ЗАВЕРШЕНА!');
console.log('='.repeat(60));

console.log('\n📈 ИТОГИ JTCSV 2.1.0:');
console.log('✅ Обратная совместимость с 2.0.0');
console.log('✅ Fast-Path Engine (до 3-4x быстрее)');
console.log('✅ NDJSON поддержка для потоковой обработки');
console.log('✅ Plugin System для расширяемости');
console.log('✅ Excel интеграция (через плагины)');
console.log('✅ Детальная статистика и мониторинг');

console.log('\n🚀 Следующие шаги:');
console.log('1. Изучите README-PLUGINS.md для подробной документации');
console.log('2. Запустите тесты: npm test');
console.log('3. Попробуйте примеры: npm run example:plugins');
console.log('4. Создайте свой плагин!');

console.log('\n💡 Совет: Для production используйте:');
console.log('  const jtcsv = require("jtcsv.create();');
console.log('  jtcsv.use("your-plugin", yourPluginConfig);');

console.log('\n📚 Документация: https://github.com/Linol-Hamelton/jtcsv');
console.log('🐛 Issues: https://github.com/Linol-Hamelton/jtcsv/issues');
console.log('⭐ Star на GitHub если понравилось!');

console.log('\n' + '✨'.repeat(30));
console.log('✨  JTCSV 2.1.0 - Next Generation JSON/CSV Converter  ✨');
console.log('✨'.repeat(30));


