# @jtcsv/nextjs

Next.js интеграция для JTCSV - API routes, React hooks и компоненты для конвертации CSV/JSON.

## 📦 Установка

```bash
npm install @jtcsv/nextjs jtcsv-converter
# или
pnpm add @jtcsv/nextjs jtcsv-converter
# или
yarn add @jtcsv/nextjs jtcsv-converter
```

## 🚀 Быстрый старт

### 1. API Route

Создайте файл `pages/api/convert.js`:

```javascript
// pages/api/convert.js
import { handler } from '@jtcsv/nextjs/route';

export default handler;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};
```

### 2. React компонент

```jsx
// components/Converter.jsx
'use client';

import { useJtcsv } from '@jtcsv/nextjs';

export default function Converter() {
  const { 
    convertCsvToJson, 
    convertJsonToCsv, 
    isLoading, 
    error, 
    result 
  } = useJtcsv();
  
  const handleConvert = async () => {
    const csv = 'name,age\nJohn,30\nJane,25';
    const json = await convertCsvToJson(csv);
    console.log('Converted:', json);
  };
  
  return (
    <div>
      <button onClick={handleConvert} disabled={isLoading}>
        {isLoading ? 'Converting...' : 'Convert CSV to JSON'}
      </button>
      {error && <div>Error: {error}</div>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

## 📖 Документация

### API Routes

#### Автоматическая конвертация

```javascript
// pages/api/convert.js
import { handler } from '@jtcsv/nextjs/route';

export default handler;
```

**Примеры запросов:**

```bash
# JSON → CSV
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '[{"name":"John","age":30}]'

# CSV → JSON
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: text/csv" \
  -d 'name,age\nJohn,30\nJane,25'

# Специфичный формат вывода
curl -X POST "http://localhost:3000/api/convert?format=csv" \
  -H "Content-Type: application/json" \
  -d '[{"name":"John","age":30}]'
```

#### Специализированные handlers

```javascript
// pages/api/convert/[...path].js
import { 
  csvToJsonHandler,
  jsonToCsvHandler,
  healthCheckHandler 
} from '@jtcsv/nextjs/route';

export default async function handler(req, res) {
  const { path } = req.query;
  
  switch (path?.[0]) {
    case 'csv-to-json':
      return csvToJsonHandler(req, res);
    case 'json-to-csv':
      return jsonToCsvHandler(req, res);
    case 'health':
      return healthCheckHandler(req, res);
    default:
      res.status(404).json({ error: 'Not found' });
  }
}
```

### React Hooks

#### useJtcsv

```jsx
import { useJtcsv } from '@jtcsv/nextjs';

function Converter() {
  const {
    convertCsvToJson,
    convertJsonToCsv,
    isLoading,
    error,
    result,
    stats,
    reset
  } = useJtcsv({
    delimiter: ',',           // Разделитель CSV
    parseNumbers: true,       // Парсить числа
    parseBooleans: true,      // Парсить булевы значения
    preventCsvInjection: true // Защита от инъекций
  });
  
  // ...
}
```

#### JtcsvProvider (Context)

```jsx
// app/layout.jsx
import { JtcsvProvider } from '@jtcsv/nextjs';

export default function Layout({ children }) {
  return (
    <JtcsvProvider options={{ delimiter: ',' }}>
      {children}
    </JtcsvProvider>
  );
}

// components/Converter.jsx
'use client';
import { useJtcsvContext } from '@jtcsv/nextjs';

export default function Converter() {
  const { csvToJson, jsonToCsv } = useJtcsvContext();
  // ...
}
```

### Компоненты

#### CsvFileUploader

```jsx
import { CsvFileUploader } from '@jtcsv/nextjs';

function FileUpload() {
  const handleConvert = (result, stats) => {
    console.log('Converted:', result);
    console.log('Stats:', stats);
  };
  
  return (
    <CsvFileUploader
      onConvert={handleConvert}
      options={{ delimiter: ',' }}
    >
      <button>📁 Upload CSV File</button>
    </CsvFileUploader>
  );
}
```

### Утилиты

#### downloadCsv

```javascript
import { downloadCsv } from '@jtcsv/nextjs';

const data = [{ name: 'John', age: 30 }];
await downloadCsv(data, 'users.csv', { delimiter: ',' });
```

#### createJtcsvApiClient

```javascript
import { createJtcsvApiClient } from '@jtcsv/nextjs';

const api = createJtcsvApiClient('/api/convert');

// Конвертация CSV в JSON
const json = await api.csvToJson('name,age\nJohn,30');

// Конвертация JSON в CSV
const csv = await api.jsonToCsv([{ name: 'John', age: 30 }]);

// Проверка здоровья
const health = await api.health();
```

## 🔧 Конфигурация

### Опции API Route

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `format` | `string` | `auto` | Формат вывода: `json`, `csv` |
| `delimiter` | `string` | `','` | Разделитель CSV |
| `includeHeaders` | `boolean` | `true` | Включать заголовки в CSV |
| `parseNumbers` | `boolean` | `true` | Парсить числа |
| `parseBooleans` | `boolean` | `true` | Парсить булевы значения |
| `useFastPath` | `boolean` | `true` | Использовать Fast-Path Engine |
| `preventCsvInjection` | `boolean` | `true` | Защита от CSV инъекций |

### Опции React Hook

```javascript
const options = {
  delimiter: ',',           // Разделитель CSV
  includeHeaders: true,     // Включать заголовки
  parseNumbers: true,       // Парсить числа
  parseBooleans: true,      // Парсить булевы значения
  useFastPath: true,        // Использовать Fast-Path Engine
  preventCsvInjection: true,// Защита от инъекций
  rfc4180Compliant: true    // Соответствие RFC 4180
};
```

## 🌐 Примеры

### Полный пример приложения

Смотрите `examples/ConverterComponent.jsx` для полного примера React компонента.

### Кастомная API Route

```javascript
// pages/api/convert/secure.js
import { handler } from '@jtcsv/nextjs/route';

export default async function secureHandler(req, res) {
  // Проверка API ключа
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  // ... ваша логика rate limiting
  
  // Логирование
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Вызов основного обработчика
  return handler(req, res);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
```

### Интеграция с формой

```jsx
'use client';
import { useState } from 'react';
import { useJtcsv, downloadCsv } from '@jtcsv/nextjs';

export default function DataForm() {
  const [data, setData] = useState([]);
  const { convertJsonToCsv } = useJtcsv();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Конвертируем данные в CSV
    const csv = await convertJsonToCsv(data);
    
    // Скачиваем файл
    await downloadCsv(data, 'form-data.csv');
    
    // Отправляем на сервер
    await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv, data })
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* поля формы */}
      <button type="submit">Submit and Download CSV</button>
    </form>
  );
}
```

## 🛡️ Безопасность

### Защита от CSV инъекций

Все конвертации по умолчанию защищены от CSV инъекций:

```javascript
// Опасные данные
const dangerous = [{ formula: '=1+1', command: '@echo hello' }];

// Безопасный CSV
const safeCsv = await jsonToCsv(dangerous, { preventCsvInjection: true });
// Результат: "'=1+1','@echo hello"
```

### Валидация размера

```javascript
// pages/api/convert.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // Ограничение размера
    }
  }
};
```

## 📊 Мониторинг

### Health Check

```bash
curl http://localhost:3000/api/convert/health
```

**Ответ:**
```json
{
  "service": "jtcsv-nextjs-api",
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-23T10:30:00.000Z",
  "features": {
    "csvToJson": true,
    "jsonToCsv": true,
    "fastPathEngine": true,
    "csvInjectionProtection": true,
    "streaming": true,
    "ndjson": true
  }
}
```

### Статистика

Каждая операция возвращает статистику:

```json
{
  "stats": {
    "inputSize": 45,
    "outputSize": 28,
    "processingTime": 12,
    "conversion": "json→csv",
    "rows": 2
  }
}
```

## 🔌 TypeScript

Полная поддержка TypeScript:

```typescript
import { 
  useJtcsv, 
  CsvFileUploader, 
  type ConversionStats 
} from '@jtcsv/nextjs';

interface MyComponentProps {
  onConvert: (result: any[], stats: ConversionStats) => void;
}
```

## 🧪 Тестирование

```bash
# Запуск примеров
cd plugins/nextjs-api/examples

# Тестовые запросы к API
curl -X POST http://localhost:3000/api/convert \
  -H "Content-Type: application/json" \
  -d '[{"test":"data"}]'
```

## 📄 Лицензия

MIT

## 🤝 Вклад в развитие

1. Форкните репозиторий
2. Создайте ветку для вашей функции
3. Закоммитьте изменения
4. Запушьте в ветку
5. Откройте Pull Request

## 📞 Поддержка

- [Issues](https://github.com/Linol-Hamelton/jtcsv/issues)
- [Discussions](https://github.com/Linol-Hamelton/jtcsv/discussions)
- [Documentation](https://github.com/Linol-Hamelton/jtcsv#readme)