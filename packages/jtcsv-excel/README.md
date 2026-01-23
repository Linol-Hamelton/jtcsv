# @jtcsv/excel

Excel integration for JTCSV - Convert between JSON, CSV and Excel formats with advanced formatting.

## 📦 Установка

```bash
npm install @jtcsv/excel exceljs jtcsv
```

## 🚀 Быстрый старт

```javascript
const { JtcsvExcel } = require('@jtcsv/excel');

// JSON → Excel
const data = [
  { name: 'John', age: 30, salary: 50000 },
  { name: 'Jane', age: 25, salary: 45000 }
];

await JtcsvExcel.toExcel(data, 'employees.xlsx', {
  sheetName: 'Employees',
  includeHeaders: true,
  autoWidth: true
});

// Excel → JSON
const jsonData = await JtcsvExcel.fromExcel('employees.xlsx');
console.log('Прочитано записей:', jsonData.length);

// Excel → CSV
const csv = await JtcsvExcel.excelToCsv('employees.xlsx');
console.log('CSV данные:', csv);

// CSV → Excel
await JtcsvExcel.csvToExcel(csv, 'converted.xlsx');
```

## 📖 Документация

### Конвертация JSON в Excel

```javascript
await JtcsvExcel.toExcel(data, 'output.xlsx', {
  sheetName: 'Data',           // Имя листа
  includeHeaders: true,        // Включать заголовки
  headers: ['Name', 'Age'],    // Кастомные заголовки
  autoWidth: true,             // Автоматическая ширина столбцов
  freezeHeader: true,          // Закрепить заголовки
  columnStyles: {              // Стили столбцов
    salary: { numFmt: '$#,##0.00' },
    hireDate: { numFmt: 'yyyy-mm-dd' }
  },
  headerStyle: {               // Стиль заголовков
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B5' } },
    alignment: { horizontal: 'center' }
  },
  returnBuffer: false          // Вернуть Buffer вместо сохранения
});
```

### Конвертация Excel в JSON

```javascript
const jsonData = await JtcsvExcel.fromExcel('data.xlsx', {
  sheetNumber: 1,              // Номер листа (начиная с 1)
  sheetName: 'Sheet1',         // Или имя листа
  hasHeaders: true,            // Первая строка содержит заголовки
  headerRow: 1,                // Строка с заголовками
  dataStartRow: 2,             // Строка начала данных
  includeEmptyRows: false,     // Включать пустые строки
  columnMapping: {             // Переименование заголовков
    'Employee Name': 'name',
    'Employee Age': 'age'
  },
  valueTransformers: {         // Трансформация значений
    salary: (value) => parseFloat(value),
    hireDate: (value) => new Date(value)
  }
});
```

### Конвертация Excel в CSV

```javascript
const csv = await JtcsvExcel.excelToCsv('data.xlsx', {
  // Опции для чтения Excel
  sheetName: 'Data',
  hasHeaders: true,
  
  // Опции для конвертации в CSV
  csvOptions: {
    delimiter: ',',
    includeHeaders: true,
    preventCsvInjection: true
  }
});
```

### Конвертация CSV в Excel

```javascript
await JtcsvExcel.csvToExcel(csvData, 'output.xlsx', {
  // Опции для парсинга CSV
  csvOptions: {
    delimiter: ',',
    parseNumbers: true,
    parseBooleans: true
  },
  
  // Опции для создания Excel
  excelOptions: {
    sheetName: 'Imported Data',
    autoWidth: true,
    freezeHeader: true
  }
});
```

### Работа с несколькими листами

#### Чтение нескольких листов

```javascript
const sheets = await JtcsvExcel.readMultipleSheets('workbook.xlsx');

Object.entries(sheets).forEach(([sheetName, sheetData]) => {
  console.log(`${sheetName}: ${sheetData.data.length} записей`);
  console.log('Данные:', sheetData.data);
});
```

#### Создание Excel с несколькими листами

```javascript
const multiSheetData = {
  'Employees': employeesData,
  'Departments': departmentsData,
  'Summary': summaryData
};

await JtcsvExcel.createMultiSheetExcel(multiSheetData, 'workbook.xlsx', {
  autoWidth: true,
  freezeHeader: true
});
```

### Форматированный экспорт

```javascript
await JtcsvExcel.exportWithFormatting(data, {
  headerStyle: {
    font: { bold: true, size: 12 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
  },
  rules: {
    salary: [
      {
        condition: (value) => value > 55000,
        style: { font: { bold: true, color: { argb: 'FF00FF00' } } }
      },
      {
        condition: (value) => value < 47000,
        style: { font: { italic: true, color: { argb: 'FFFF0000' } } }
      }
    ]
  },
  numberFormat: '$#,##0.00',
  dateFormat: 'yyyy-mm-dd',
  addFilters: true
}, 'formatted.xlsx');
```

### Метаданные Excel файла

```javascript
const metadata = await JtcsvExcel.getExcelMetadata('file.xlsx');

console.log('Создатель:', metadata.creator);
console.log('Дата создания:', metadata.created);
console.log('Листы:', metadata.worksheets.length);
metadata.worksheets.forEach(ws => {
  console.log(`- ${ws.name}: ${ws.rowCount} строк, ${ws.columnCount} столбцов`);
});
```

### Создание шаблонов

```javascript
const templateBuffer = await JtcsvExcel.createTemplate(
  ['ID', 'Name', 'Email', 'Department', 'Salary', 'Hire Date'],
  {
    sheetName: 'Employee Template',
    instructions: 'Заполните данные сотрудников. Все поля обязательны.',
    exampleData: [
      {
        'ID': 1,
        'Name': 'John Doe',
        'Email': 'john@example.com',
        'Department': 'Engineering',
        'Salary': 50000,
        'Hire Date': '2023-01-15'
      }
    ],
    validationRules: {
      'ID': ['Только числа', 'Уникальный'],
      'Email': ['Должен содержать @', 'Валидный email'],
      'Salary': ['Только числа', 'Больше 0']
    }
  }
);

// Сохранение шаблона
const fs = require('fs');
fs.writeFileSync('template.xlsx', templateBuffer);
```

## 🔧 Интеграция с JTCSV

### Как плагин

```javascript
const { JtcsvWithPlugins } = require('jtcsv;
const { jtcsvPlugin } = require('@jtcsv/excel');

const jtcsv = new JtcsvWithPlugins();
jtcsv.use('excel', jtcsvPlugin());

// Теперь можно использовать формат 'excel'
const excelBuffer = await jtcsv.jsonToCsv(data, {
  format: 'excel',
  excelOptions: {
    sheetName: 'Data',
    autoWidth: true
  }
});
```

### Прямое использование

```javascript
const { fromExcel, toExcel } = require('@jtcsv/excel');

// Альтернативный синтаксис
const json = await fromExcel('data.xlsx');
const buffer = await toExcel(data, null, { returnBuffer: true });
```

## 🎯 Примеры использования

### Экспорт данных из базы данных

```javascript
async function exportUsersToExcel() {
  // Получаем данные из базы данных
  const users = await db.query('SELECT * FROM users');
  
  // Конвертируем в Excel
  await JtcsvExcel.toExcel(users, 'users-export.xlsx', {
    sheetName: 'Users',
    columnStyles: {
      created_at: { numFmt: 'yyyy-mm-dd hh:mm:ss' },
      salary: { numFmt: '$#,##0.00' }
    },
    autoWidth: true,
    freezeHeader: true
  });
  
  console.log('✅ Экспорт завершен');
}
```

### Импорт данных из Excel

```javascript
async function importProductsFromExcel(filePath) {
  // Читаем Excel файл
  const products = await JtcsvExcel.fromExcel(filePath, {
    sheetName: 'Products',
    hasHeaders: true,
    valueTransformers: {
      price: (value) => parseFloat(value),
      quantity: (value) => parseInt(value, 10),
      in_stock: (value) => value === 'Yes'
    }
  });
  
  // Валидируем данные
  const validator = new (require('@jtcsv/validator').JtcsvValidator)()
    .field('sku', { type: 'string', required: true })
    .field('name', { type: 'string', required: true })
    .field('price', { type: 'number', required: true, min: 0 })
    .field('quantity', { type: 'integer', required: true, min: 0 });
  
  const validation = validator.validate(products);
  
  if (!validation.valid) {
    throw new Error(`Ошибки валидации: ${validation.errors.map(e => e.message).join(', ')}`);
  }
  
  // Сохраняем в базу данных
  for (const product of products) {
    await db.insert('products', product);
  }
  
  console.log(`✅ Импортировано ${products.length} продуктов`);
}
```

### Конвертация между форматами

```javascript
async function convertExcelReports() {
  // Excel → CSV для обработки
  const csv = await JtcsvExcel.excelToCsv('monthly-report.xlsx', {
    sheetName: 'Sales',
    csvOptions: { delimiter: ';' }
  });
  
  // Обработка CSV данных
  const processedCsv = processCsvData(csv);
  
  // CSV → Excel для отправки
  await JtcsvExcel.csvToExcel(processedCsv, 'processed-report.xlsx', {
    csvOptions: { delimiter: ';' },
    excelOptions: {
      sheetName: 'Processed Sales',
      autoWidth: true,
      columnStyles: {
        revenue: { numFmt: '$#,##0.00' },
        growth: { numFmt: '0.00%' }
      }
    }
  });
}
```

## 🔌 TypeScript

Полная поддержка TypeScript:

```typescript
import { JtcsvExcel, ExcelToJsonOptions, JsonToExcelOptions } from '@jtcsv/excel';

const options: ExcelToJsonOptions = {
  sheetName: 'Data',
  hasHeaders: true,
  valueTransformers: {
    price: (value) => parseFloat(value as string)
  }
};

const data = await JtcsvExcel.fromExcel('data.xlsx', options);
```

## 🛡️ Безопасность

### Валидация входных данных

```javascript
const { JtcsvValidator } = require('@jtcsv/validator');

async function safeExcelImport(filePath) {
  // Читаем Excel
  const data = await JtcsvExcel.fromExcel(filePath);
  
  // Валидируем данные
  const validator = new JtcsvValidator()
    .field('name', { type: 'string', required: true, max: 100 })
    .field('email', { 
      type: 'string', 
      required: true,
      pattern: /^[^@]+@[^@]+\.[^@]+$/
    })
    .transform('email', (value) => value.toLowerCase().trim());
  
  const result = validator.validate(data);
  
  if (!result.valid) {
    throw new Error(`Invalid data: ${result.errors.map(e => e.message).join(', ')}`);
  }
  
  return result.data;
}
```

### Ограничение размера файлов

```javascript
const fs = require('fs');

async function importWithSizeLimit(filePath) {
  const stats = fs.statSync(filePath);
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (stats.size > maxSize) {
    throw new Error(`File too large: ${stats.size} bytes (max: ${maxSize} bytes)`);
  }
  
  return await JtcsvExcel.fromExcel(filePath);
}
```

## 📊 Производительность

### Пакетная обработка

```javascript
async function batchProcessExcelFiles(files) {
  const results = [];
  
  for (const file of files) {
    try {
      const data = await JtcsvExcel.fromExcel(file, {
        hasHeaders: true,
        includeEmptyRows: false
      });
      results.push({ file, data, success: true });
    } catch (error) {
      results.push({ file, error: error.message, success: false });
    }
  }
  
  return results;
}
```

### Stream обработка больших файлов

```javascript
const { csvToJson } = require('jtcsv

async function processLargeExcel(filePath) {
  // Для очень больших файлов конвертируем в CSV и обрабатываем потоково
  const csvStream = await JtcsvExcel.excelToCsv(filePath, {
    csvOptions: { streaming: true }
  });
  
  // Обработка CSV потоково
  const processedData = [];
  
  for await (const row of csvToJson.parseStream(csvStream)) {
    // Обработка каждой строки
    processedData.push(processRow(row));
  }
  
  return processedData;
}
```

## 🧪 Тестирование

```bash
# Запуск тестов
cd packages/jtcsv-excel
npm test

# Запуск примеров
npm run example

# Покрытие кода тестами
npm run test:coverage
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
- [Документация JTCSV](https://github.com/Linol-Hamelton/jtcsv#readme)


