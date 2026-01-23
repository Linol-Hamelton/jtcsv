# @jtcsv/express-middleware

Express middleware для автоматической конвертации CSV/JSON в HTTP запросах.

## 📦 Установка

```bash
npm install @jtcsv/express-middleware express jtcsv-converter
```

## 🚀 Быстрый старт

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const { middleware } = require('@jtcsv/express-middleware');

const app = express();

// Middleware для парсинга JSON и CSV
app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/csv' }));

// JTCSV middleware для автоматической конвертации
app.use(middleware());

// Роут, использующий автоматическую конвертацию
app.post('/api/convert', (req, res) => {
  // Конвертированные данные доступны в req.converted
  res.json({
    success: true,
    data: req.converted.data,
    format: req.converted.format,
    stats: req.converted.stats
  });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
```

## 📖 Документация

### Основное middleware

```javascript
app.use(middleware({
  maxSize: '50mb',           // Максимальный размер тела запроса
  autoDetect: true,          // Автоматическое определение формата
  delimiter: ',',            // Разделитель CSV
  enableFastPath: true,      // Включить Fast-Path Engine
  preventCsvInjection: true, // Защита от CSV инъекций
  rfc4180Compliant: true     // Соответствие RFC 4180
}));
```

### Специфичные роуты

```javascript
const { 
  csvToJsonRoute, 
  jsonToCsvRoute, 
  uploadCsvRoute, 
  healthCheck 
} = require('@jtcsv/express-middleware');

// Конвертация CSV в JSON
app.post('/api/csv-to-json', csvToJsonRoute({
  delimiter: ',',
  parseNumbers: true,
  parseBooleans: true
}));

// Конвертация JSON в CSV
app.post('/api/json-to-csv', jsonToCsvRoute({
  delimiter: ',',
  includeHeaders: true,
  preventCsvInjection: true
}));

// Загрузка CSV файла (требуется multer)
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
app.post('/api/upload-csv', upload.single('file'), uploadCsvRoute());

// Health check
app.get('/api/health', healthCheck());
```

## 🔧 Конфигурация

### Опции middleware

| Опция | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `maxSize` | `string` | `'10mb'` | Максимальный размер тела запроса |
| `autoDetect` | `boolean` | `true` | Автоматическое определение формата |
| `delimiter` | `string` | `','` | Разделитель CSV |
| `enableFastPath` | `boolean` | `true` | Включить Fast-Path Engine |
| `preventCsvInjection` | `boolean` | `true` | Защита от CSV инъекций |
| `rfc4180Compliant` | `boolean` | `true` | Соответствие RFC 4180 |
| `conversionOptions` | `object` | `{}` | Дополнительные опции конвертации |

### Формат ответа

После обработки middleware, в объекте `req` появляется свойство `converted`:

```javascript
{
  data: any,                    // Конвертированные данные
  format: 'json' | 'csv',       // Формат выходных данных
  inputFormat: 'json' | 'csv' | 'unknown', // Формат входных данных
  outputFormat: 'json' | 'csv', // Формат выходных данных
  stats: {                      // Статистика конвертации
    inputSize: number,          // Размер входных данных (байты)
    outputSize: number,         // Размер выходных данных (байты)
    processingTime: number,     // Время обработки (мс)
    conversion: string          // Тип конвертации (например: "json→csv")
  },
  options: object               // Использованные опции
}
```

## 🌐 Примеры запросов

### Конвертация JSON в CSV

```bash
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '[{"name":"John","age":30},{"name":"Jane","age":25}]'
```

**Ответ:**
```csv
name,age
John,30
Jane,25
```

### Конвертация CSV в JSON

```bash
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: text/csv" \
  -d 'name,age\nJohn,30\nJane,25'
```

**Ответ:**
```json
[
  {"name":"John","age":30},
  {"name":"Jane","age":25}
]
```

### Специфичный формат вывода

```bash
# Запросить CSV даже если отправляем JSON
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -H "Accept: text/csv" \
  -d '[{"name":"John","age":30}]'

# Или через query параметр
curl -X POST "http://localhost:3000/api/convert?format=csv" \
  -H "Content-Type: application/json" \
  -d '[{"name":"John","age":30}]'
```

## 🛡️ Безопасность

### CSV Injection Protection

Middleware автоматически защищает от CSV инъекций:

```javascript
// Входные данные с потенциальной инъекцией
const dangerousData = [
  { formula: '=1+1', command: '@echo hello' }
];

// Безопасный CSV
const safeCsv = jsonToCsv(dangerousData, { 
  preventCsvInjection: true 
});
// Результат: "'=1+1','@echo hello"
```

### Валидация размера

```javascript
app.use(middleware({
  maxSize: '10mb' // Ограничение размера запроса
}));
```

## 📊 Мониторинг

### Health Check

```bash
curl http://localhost:3000/api/health
```

**Ответ:**
```json
{
  "service": "jtcsv-express-middleware",
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-23T10:30:00.000Z",
  "features": {
    "csvToJson": true,
    "jsonToCsv": true,
    "fastPathEngine": true,
    "csvInjectionProtection": true,
    "streaming": true
  }
}
```

### Статистика

Каждый запрос включает статистику конвертации:

```json
{
  "stats": {
    "inputSize": 45,
    "outputSize": 28,
    "processingTime": 12,
    "conversion": "json→csv"
  }
}
```

## 🔌 Интеграция

### С TypeScript

```typescript
import { Request, Response } from 'express';
import { middleware, ConvertedData } from '@jtcsv/express-middleware';

app.use(middleware());

app.post('/api/convert', (req: Request, res: Response) => {
  const converted = req.converted as ConvertedData;
  // TypeScript знает тип converted
});
```

### С другими middleware

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { middleware } = require('@jtcsv/express-middleware');

const app = express();

app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json());
app.use(express.text({ type: 'text/csv' }));
app.use(middleware());
```

## 🧪 Тестирование

```bash
# Запуск примера
cd plugins/express-middleware
node example.js

# Тестовые запросы
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '[{"test":"data"}]'
```

## 📄 Лицензия

MIT

## 🤝 Вклад в развитие

1. Форкните репозиторий
2. Создайте ветку для вашей функции (`git checkout -b feature/amazing-feature`)
3. Закоммитьте изменения (`git commit -m 'Add amazing feature'`)
4. Запушьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📞 Поддержка

- [Issues](https://github.com/Linol-Hamelton/jtcsv/issues)
- [Discussions](https://github.com/Linol-Hamelton/jtcsv/discussions)
- [Documentation](https://github.com/Linol-Hamelton/jtcsv#readme)