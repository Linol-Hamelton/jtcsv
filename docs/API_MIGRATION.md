# API Migration Guide

**Версия**: 3.1.0 → 3.2.0  
**Дата**: Февраль 2026

Этот документ поможет вам мигрировать на каноничные API функции JTCSV.

---

## 📋 Каноничные функции

JTCSV теперь имеет 5 основных (canonical) функций, которые рекомендуется использовать:

| Категория | Функция | Описание |
|-----------|---------|----------|
| **CSV → JSON** | `csvToJson()` | Парсинг CSV строки в JSON |
| **JSON → CSV** | `jsonToCsv()` | Конвертация JSON в CSV строку |
| **Файлы** | `readCsvAsJson()` | Чтение CSV файла в JSON |
| **Потоки** | `createCsvToJsonStream()` | Потоковый парсинг CSV |
| **TSV** | `tsvToJson()` | Парсинг TSV в JSON |

---

## 🔄 Deprecated Aliases

Следующие функции помечены как deprecated и будут удалены в версии 4.0.0:

### CSV File Reading

| Deprecated | Canonical | Изменения |
|------------|-----------|-----------|
| `csvToJsonFile()` | `readCsvAsJson()` | Только переименование |
| `csvToJsonFileSync()` | `readCsvAsJsonSync()` | Только переименование |

### Streaming

| Deprecated | Canonical | Изменения |
|------------|-----------|-----------|
| `csvToJsonStream()` | `createCsvToJsonStream()` | Только переименование |
| `csvFileToJsonStream()` | `createCsvFileToJsonStream()` | Только переименование |

---

## 📝 Примеры миграции

### csvToJsonFile → readCsvAsJson

```typescript
// ❌ Before (deprecated)
import { csvToJsonFile } from 'jtcsv';

const data = await csvToJsonFile('data.csv', {
  delimiter: ',',
  hasHeaders: true
});

// ✅ After (recommended)
import { readCsvAsJson } from 'jtcsv';

const data = await readCsvAsJson('data.csv', {
  delimiter: ',',
  hasHeaders: true
});
```

### csvToJsonFileSync → readCsvAsJsonSync

```typescript
// ❌ Before (deprecated)
import { csvToJsonFileSync } from 'jtcsv';

const data = csvToJsonFileSync('data.csv');

// ✅ After (recommended)
import { readCsvAsJsonSync } from 'jtcsv';

const data = readCsvAsJsonSync('data.csv');
```

### csvToJsonStream → createCsvToJsonStream

```typescript
// ❌ Before (deprecated)
import { csvToJsonStream } from 'jtcsv';

const stream = csvToJsonStream({
  delimiter: ',',
  hasHeaders: true
});

// ✅ After (recommended)
import { createCsvToJsonStream } from 'jtcsv';

const stream = createCsvToJsonStream({
  delimiter: ',',
  hasHeaders: true
});
```

### csvFileToJsonStream → createCsvFileToJsonStream

```typescript
// ❌ Before (deprecated)
import { csvFileToJsonStream } from 'jtcsv';

const stream = csvFileToJsonStream('large-file.csv', {
  chunkSize: 1000
});

// ✅ After (recommended)
import { createCsvFileToJsonStream } from 'jtcsv';

const stream = createCsvFileToJsonStream('large-file.csv', {
  chunkSize: 1000
});
```

---

## 🛠️ Автоматическая миграция

Для автоматической миграции вы можете использовать codemod:

```bash
# Установка jscodeshift
npm install -g jscodeshift

# Запуск миграции
npx jscodeshift -t node_modules/jtcsv/codemods/canonical-api.js src/
```

Или используйте find-and-replace в вашем редакторе:

```
csvToJsonFile(       → readCsvAsJson(
csvToJsonFileSync(   → readCsvAsJsonSync(
csvToJsonStream(     → createCsvToJsonStream(
csvFileToJsonStream( → createCsvFileToJsonStream(
```

---

## ⚠️ Deprecation Warnings

Начиная с версии 3.2.0, при использовании deprecated функций будет выводиться предупреждение:

```
⚠️  [JTCSV] csvToJsonFile() is deprecated. Use readCsvAsJson() instead.
    This alias will be removed in v4.0.0.
```

---

## 📅 Timeline

| Версия | Статус |
|--------|--------|
| 3.1.0 | Deprecated aliases помечены `@deprecated` в JSDoc |
| 3.2.0 | Добавлены console warnings при использовании deprecated функций |
| 4.0.0 | Deprecated aliases будут удалены |

---

## 🤔 Почему эти изменения?

### Консистентность

Раньше функции имели разные паттерны именования:
- `csvToJson*` (imperative)
- `readCsvAsJson*` (descriptive)
- `createCsvToJsonStream*` (factory pattern)

Теперь все функции следуют единому паттерну:
- `csvToJson()` - базовая операция
- `readCsvAsJson()` - чтение из файла
- `createCsvToJsonStream()` - создание потока

### Лучшая документация

Каноничные функции имеют:
- Полную JSDoc документацию
- Примеры использования
- TypeScript типы
- Edge cases документацию

### Простота обучения

Новым пользователям проще выбрать нужную функцию:
- Нужно распарсить CSV строку? → `csvToJson()`
- Нужно прочитать файл? → `readCsvAsJson()`
- Нужен стриминг? → `createCsvToJsonStream()`

---

## 📚 Дополнительные ресурсы

- [API Decision Tree](./API_DECISION_TREE.md) - выбор правильной функции
- [API Reference](./api/) - полная документация API
- [Examples](https://github.com/Linol-Hamelton/jtcsv/tree/main/examples) - примеры использования

---

**Вопросы?** Создайте issue на [GitHub](https://github.com/Linol-Hamelton/jtcsv/issues)
