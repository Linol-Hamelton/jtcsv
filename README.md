# jtcsv - JSON to CSV Converter

Легковесный, эффективный модуль для преобразования JSON данных в CSV формат с правильным экранированием и поддержкой Excel.

## Установка

```bash
npm install jtcsv
```

## Основные возможности

- ✅ Преобразование массивов объектов в CSV
- ✅ Правильное экранирование специальных символов (;, ", \n)
- ✅ Поддержка пользовательских разделителей
- ✅ Переименование заголовков столбцов
- ✅ Шаблоны для гарантированного порядка столбцов
- ✅ Глубокая развертка вложенных объектов
- ✅ Сохранение результата в файл
- ✅ Совместимость с Excel
- ✅ Поддержка UTF-8 (кириллица и другие языки)

## Быстрый старт

### Базовое использование

```javascript
const { jsonToCsv } = require('jtcsv');

const data = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

const csv = jsonToCsv(data);
console.log(csv);
// Output:
// id;name;email
// 1;John Doe;john@example.com
// 2;Jane Smith;jane@example.com
```

### С пользовательскими настройками

```javascript
const { jsonToCsv, saveAsCsv } = require('jtcsv');

const data = [
  { id: 1, name: 'John', email: 'john@example.com' },
  { id: 2, name: 'Jane', email: 'jane@example.com' }
];

// С переименованием заголовков
const csv = jsonToCsv(data, {
  delimiter: ',',
  renameMap: {
    id: 'ID',
    name: 'Full Name',
    email: 'Email Address'
  }
});

// Сохранение в файл
await saveAsCsv(data, './output.csv', {
  delimiter: ';',
  renameMap: { id: 'ID' }
});
```

### Работа с вложенными объектами

```javascript
const { jsonToCsv, preprocessData } = require('jtcsv');

const complexData = [
  {
    id: 1,
    user: {
      name: 'John',
      contact: { email: 'john@example.com' }
    },
    tags: ['admin', 'user']
  }
];

// Предварительная обработка для развертки вложенных структур
const processedData = preprocessData(complexData);
const csv = jsonToCsv(processedData);
```

## API документация

### `jsonToCsv(data, options)`

Основная функция для преобразования JSON в CSV.

**Параметры:**

- `data` (Array): Массив объектов для конвертации
- `options` (Object): Опциональные настройки:
  - `delimiter` (String): Разделитель CSV (по умолчанию: ';')
  - `includeHeaders` (Boolean): Включать ли строку заголовков (по умолчанию: true)
  - `renameMap` (Object): Карта переименования заголовков `{ oldKey: newKey }`
  - `template` (Object): Шаблон для гарантированного порядка столбцов

**Возвращает:** Строку в формате CSV

### `preprocessData(data)`

Предварительно обрабатывает данные, разворачивая вложенные объекты и массивы.

### `saveAsCsv(data, filePath, options)`

Асинхронная функция для сохранения CSV в файл.

### `deepUnwrap(value, depth, maxDepth)`

Вспомогательная функция для глубокой развертки значений.

## Примеры использования

### Пример 1: Экспорт данных из API

```javascript
const { saveAsCsv } = require('jtcsv');
const axios = require('axios');

async function exportApiData() {
  try {
    // Получаем данные из API
    const response = await axios.get('https://api.example.com/data');
    const data = response.data;
    
    // Сохраняем в CSV
    await saveAsCsv(data, './export.csv', {
      delimiter: ',',
      renameMap: {
        'user.id': 'User ID',
        'user.name': 'Name',
        'created_at': 'Created Date'
      }
    });
    
    console.log('✅ Экспорт завершен успешно');
  } catch (error) {
    console.error('❌ Ошибка экспорта:', error.message);
  }
}
```

### Пример 2: Обработка данных из MongoDB

```javascript
const { jsonToCsv } = require('jtcsv');
const mongoose = require('mongoose');

async function exportMongoData() {
  // Подключение к базе данных
  await mongoose.connect('mongodb://localhost:27017/mydb');
  
  // Получаем данные
  const users = await User.find({}).lean();
  
  // Конвертируем в CSV
  const csv = jsonToCsv(users, {
    delimiter: '\t', // Табуляция как разделитель
    renameMap: {
      '_id': 'ID',
      'profile.name': 'Full Name',
      'email': 'Email'
    }
  });
  
  return csv;
}
```

### Пример 3: Экспорт с кириллицей

```javascript
const { saveAsCsv } = require('jtcsv');

const russianData = [
  { id: 1, имя: 'Иван', фамилия: 'Иванов', email: 'ivan@example.com' },
  { id: 2, имя: 'Мария', фамилия: 'Петрова', email: 'maria@example.com' }
];

await saveAsCsv(russianData, './russian-export.csv', {
  renameMap: {
    id: 'ID',
    имя: 'Имя',
    фамилия: 'Фамилия',
    email: 'Электронная почта'
  }
});
```

## Особенности реализации

1. **Экранирование:** Автоматическое экранирование значений, содержащих разделители, кавычки или переносы строк
2. **Кодировка:** Поддержка UTF-8 для корректного отображения кириллицы и других языков
3. **Производительность:** Эффективная обработка больших объемов данных
4. **Гибкость:** Настраиваемые разделители, заголовки и порядок столбцов
5. **Надежность:** Правильная обработка null, undefined и пустых значений

## Разработчик

**Ruslan Fomenko**

## Лицензия

MIT