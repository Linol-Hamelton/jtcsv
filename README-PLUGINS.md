# 🚀 JTCSV Plugin System & Advanced Features

## 📦 Новая архитектура: Core + Plugins

JTCSV 2.1.0 представляет революционную плагинную систему, которая позволяет расширять функциональность без модификации ядра.

### 🏗️ Архитектура

```
┌─────────────────────────────────────────────┐
│              JTCSV Core Engine              │
│  • Fast-Path Engine (оптимизированный)      │
│  • NDJSON поддержка                         │
│  • Plugin System                            │
└─────────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Excel Plugin  │     │  Validation     │
│   • Export      │     │  Plugin         │
│   • Import      │     │  • Schema       │
└─────────────────┘     │  • Rules        │
                        └─────────────────┘
```

## ⚡ Fast-Path Engine

### Оптимизированный парсинг CSV

Fast-Path Engine автоматически анализирует структуру CSV и выбирает оптимальный парсер:

- **SIMPLE парсер**: Для CSV без кавычек (3-4x быстрее)
- **QUOTE_AWARE парсер**: Для CSV с кавычками (state machine)
- **STANDARD парсер**: Для сложных случаев (fallback)

```javascript
const FastPathEngine = require('jtcsv-converter/plugins').FastPathEngine;

const engine = new FastPathEngine();

// Автоматический анализ и парсинг
const result = engine.parse(csvData, { delimiter: ',' });

// Статистика использования
const stats = engine.getStats();
console.log(`Cache hit rate: ${stats.hitRate * 100}%`);
console.log(`Simple parsers: ${stats.simpleParserCount}`);
```

### Бенчмарки производительности

```
📊 Производительность Fast-Path Engine:
  Строк: 10,000
  Время: 45ms
  Скорость: 222,222 строк/сек

📊 Сравнение производительности:
  Простой CSV: 32ms
  CSV с кавычками: 58ms
  Разница: 81.3%
```

## 📝 NDJSON (Newline Delimited JSON) поддержка

### Потоковая обработка больших JSON файлов

```javascript
const NdjsonParser = require('jtcsv-converter/plugins').NdjsonParser;

// Конвертация JSON → NDJSON
const ndjson = NdjsonParser.toNdjson(dataArray, { space: 2 });

// Конвертация NDJSON → JSON
const jsonArray = NdjsonParser.fromNdjson(ndjsonString);

// Потоковая обработка
for await (const obj of NdjsonParser.parseStream(readableStream)) {
  console.log(obj);
}

// Статистика файла
const stats = await NdjsonParser.getStats(ndjsonString);
console.log(`Valid lines: ${stats.validLines}/${stats.totalLines}`);
```

### Преобразование потоков

```javascript
// NDJSON → CSV Transform Stream
const ndjsonToCsv = NdjsonParser.createNdjsonToCsvStream({
  delimiter: ',',
  includeHeaders: true
});

// CSV → NDJSON Transform Stream
const csvToNdjson = NdjsonParser.createCsvToNdjsonStream({
  delimiter: ';',
  hasHeaders: true
});
```

## 🔌 Plugin System

### Создание плагинов

```javascript
const { PluginManager } = require('jtcsv-converter/plugins');

const myPlugin = {
  name: 'My Awesome Plugin',
  version: '1.0.0',
  description: 'Добавляет магические возможности',
  
  hooks: {
    'before:csvToJson': (csv, context) => {
      console.log(`Парсинг CSV размером ${csv.length} байт`);
      return csv;
    },
    
    'after:jsonToCsv': (csv, context) => {
      return `✨ ${csv} ✨`; // Добавляем магию
    }
  },
  
  middlewares: [
    async (ctx, next) => {
      console.log('Начало операции:', ctx.operation);
      await next();
      console.log('Завершение операции:', ctx.operation);
    }
  ]
};

const manager = new PluginManager();
manager.use('my-plugin', myPlugin);
```

### Использование JTCSV с плагинами

```javascript
const JtcsvWithPlugins = require('jtcsv-converter/plugins');

// Создаем экземпляр с плагинами
const jtcsv = JtcsvWithPlugins.create({
  enablePlugins: true,
  enableFastPath: true
});

// Регистрируем плагины
jtcsv.use('excel-exporter', require('./excel-plugin'));
jtcsv.use('data-validator', require('./validator-plugin'));

// Используем как обычно, но с плагинами!
const csv = await jtcsv.jsonToCsv(data, {
  delimiter: ',',
  exportToExcel: true // Плагин обработает эту опцию
});

// Статистика
const stats = jtcsv.getStats();
console.log('Плагины:', stats.plugins.plugins);
console.log('Hooks выполнено:', stats.plugins.hookExecutions);
```

## 📊 Пример: Excel Exporter Plugin

### Экспорт данных в Excel с форматированием

```javascript
// examples/plugin-excel-exporter.js
const { excelExporterPlugin, exampleUsage } = require('./examples/plugin-excel-exporter');

// Использование
const jtcsv = require('jtcsv-converter/plugins').create();
jtcsv.use('excel', excelExporterPlugin);

const data = [
  { id: 1, name: 'John', salary: 50000, hired: '2023-01-15' },
  { id: 2, name: 'Jane', salary: 45000, hired: '2023-03-20' }
];

const result = await jtcsv.jsonToCsv(data, {
  exportToExcel: true,
  outputPath: 'employees.xlsx',
  styling: true,
  sheetName: 'Employees'
});

console.log('Excel файл создан:', result.excel);
```

### Возможности Excel плагина:

✅ Автоматическое форматирование заголовков  
✅ Чередующаяся раскраска строк  
✅ Форматирование чисел и дат  
✅ Автоматическая ширина колонок  
✅ Фильтры и сортировка  
✅ Поддержка формул Excel  

## 🧪 Тестирование

### Запуск тестов

```bash
# Все тесты
npm test

# Только тесты плагинной системы
npm run test:plugins

# Тесты Fast-Path Engine
npm run test:fastpath

# Тесты NDJSON
npm run test:ndjson

# Тесты производительности
npm run test:performance

# Покрытие кода
npm run test:coverage
```

### Примеры использования

```bash
# Запуск примера с Excel плагином
npm run example:plugins

# Бенчмарки производительности
npm run benchmark
npm run benchmark:fastpath
```

## 📈 Производительность

### Сравнение с версией 2.0.0

```
Версия 2.0.0:
  CSV → JSON (10,000 строк): 120ms
  JSON → CSV (10,000 записей): 85ms
  Память: ~50MB для 100MB файла

Версия 2.1.0 с Fast-Path Engine:
  CSV → JSON (10,000 строк): 45ms  (2.7x быстрее) 🚀
  JSON → CSV (10,000 записей): 75ms
  Память: ~30MB для 100MB файла  (40% меньше) 📉
  NDJSON streaming: 5ms до первого результата
```

## 🚀 Миграция с 2.0.0

### Для существующих пользователей

```javascript
// Было (2.0.0)
const { jsonToCsv, csvToJson } = require('jtcsv-converter');

// Стало (2.1.0) - обратная совместимость сохраняется
const { jsonToCsv, csvToJson } = require('jtcsv-converter');

// Новая функциональность (опционально)
const { create, FastPathEngine, NdjsonParser } = require('jtcsv-converter/plugins');
const jtcsv = create({ enablePlugins: true });
```

### Новые возможности

1. **Плагинная система** - расширяемость без модификации ядра
2. **Fast-Path Engine** - автоматическая оптимизация парсинга
3. **NDJSON поддержка** - потоковая обработка больших JSON
4. **Excel интеграция** - экспорт/импорт с форматированием
5. **Middleware архитектура** - перехват и модификация операций
6. **Детальная статистика** - мониторинг производительности

## 📚 Документация

### Структура проекта

```
jtcsv/
├── src/
│   ├── engines/           # Fast-Path Engine
│   │   └── fast-path-engine.js
│   ├── formats/          # NDJSON поддержка
│   │   └── ndjson-parser.js
│   ├── core/            # Plugin System
│   │   └── plugin-system.js
│   └── index-with-plugins.js
├── examples/            # Примеры плагинов
│   └── plugin-excel-exporter.js
├── __tests__/          # Тесты
│   ├── fast-path-engine.test.js
│   ├── ndjson-parser.test.js
│   └── plugin-system.test.js
└── package.json        # Обновленные зависимости
```

### API Reference

#### FastPathEngine
- `analyzeStructure(sample, options)` - анализ CSV структуры
- `compileParser(structure)` - компиляция специализированного парсера
- `parse(csv, options)` - парсинг с автоматической оптимизацией
- `getStats()` - статистика использования
- `reset()` - сброс кеша и статистики

#### NdjsonParser
- `toNdjson(data, options)` - конвертация в NDJSON
- `fromNdjson(ndjson, options)` - парсинг NDJSON
- `parseStream(input, options)` - async iterator для потоков
- `createNdjsonToCsvStream(options)` - TransformStream
- `createCsvToNdjsonStream(options)` - TransformStream
- `getStats(input)` - статистика NDJSON файла

#### PluginManager
- `use(name, plugin)` - регистрация плагина
- `registerHook(hookName, handler)` - регистрация hook
- `registerMiddleware(middleware)` - регистрация middleware
- `executeHooks(hookName, data, context)` - выполнение hooks
- `executeMiddlewares(ctx)` - выполнение middleware pipeline
- `executeWithPlugins(operation, input, options, coreFunction)` - полный цикл
- `listPlugins()` - список плагинов
- `getStats()` - статистика

#### JtcsvWithPlugins
- `create(options)` - фабричный метод
- `csvToJson(csv, options)` - с поддержкой плагинов
- `jsonToCsv(json, options)` - с поддержкой плагинов
- `use(name, plugin)` - регистрация плагина
- `getPluginManager()` - доступ к менеджеру плагинов
- `getStats()` - общая статистика

## 🎯 Roadmap

### Q1 2026 (Выполнено ✅)
- [x] Fast-Path Engine для оптимизации парсинга
- [x] NDJSON поддержка для потоковой обработки
- [x] Plugin System архитектура
- [x] Excel Exporter плагин

### Q2 2026 (Планируется)
- [ ] Web UI Demo с Vue 3 + Vite
- [ ] Framework интеграции (Express, Fastify, Next.js)
- [ ] Marketplace для плагинов
- [ ] TypeScript улучшения

### Q3 2026 (Планируется)
- [ ] Enterprise features (лицензирование, SLA)
- [ ] Cloud API сервис
- [ ] Расширенная документация
- [ ] Сообщество контрибьюторов

## 🤝 Вклад в проект

### Создание плагинов

1. Создайте файл плагина в `src/plugins/`
2. Реализуйте hooks и/или middlewares
3. Напишите тесты
4. Добавьте документацию
5. Создайте Pull Request

### Пример структуры плагина

```javascript
// src/plugins/my-feature/index.js
module.exports = {
  name: 'My Feature',
  version: '1.0.0',
  description: 'Описание плагина',
  
  hooks: {
    // Lifecycle hooks
  },
  
  middlewares: [
    // Middleware functions
  ],
  
  // Дополнительные экспорты
  utilities: {
    helperFunction: () => {}
  }
};
```

## 📄 Лицензия

MIT © Ruslan Fomenko

## 🔗 Ссылки

- [GitHub](https://github.com/Linol-Hamelton/jtcsv)
- [npm](https://www.npmjs.com/package/jtcsv-converter)
- [Документация](https://github.com/Linol-Hamelton/jtcsv#readme)
- [Issues](https://github.com/Linol-Hamelton/jtcsv/issues)

---

**JTCSV 2.1.0** - следующее поколение JSON/CSV конвертера с невероятной производительностью и расширяемостью! 🚀