# @jtcsv/validator

Валидация CSV/JSON данных для JTCSV с Zod-подобным API.

## 📦 Установка

```bash
npm install @jtcsv/validator jtcsv-converter
```

## 🚀 Быстрый старт

```javascript
const { JtcsvValidator } = require('@jtcsv/validator');

// Создаем валидатор
const validator = new JtcsvValidator()
  .field('name', { type: 'string', required: true, min: 1, max: 100 })
  .field('email', { 
    type: 'string', 
    required: true, 
    pattern: /^[^@]+@[^@]+\.[^@]+$/ 
  })
  .field('age', { type: 'number', min: 0, max: 150 })
  .transform('email', (value) => value.toLowerCase().trim());

// Валидируем данные
const data = [
  { name: 'John Doe', email: 'JOHN@EXAMPLE.COM', age: 30 },
  { name: 'Jane Smith', email: 'jane@example.com', age: 25 }
];

const result = validator.validate(data);

if (result.valid) {
  console.log('✅ Данные валидны!');
  console.log('Трансформированные данные:', result.data);
} else {
  console.log('❌ Ошибки валидации:', result.errors);
}
```

## 📖 Документация

### Создание валидатора

#### Базовый валидатор

```javascript
const validator = new JtcsvValidator();
```

#### Использование предопределенных схем

```javascript
const { schemas } = require('@jtcsv/validator');

const userValidator = schemas.user();
const productValidator = schemas.product();
const orderValidator = schemas.order();
```

#### Создание через фабрику

```javascript
const { createValidator } = require('@jtcsv/validator');

const validator = createValidator({
  name: { type: 'string', required: true },
  email: { type: 'string', required: true }
});
```

### Определение полей

```javascript
validator
  .field('name', { 
    type: 'string',      // Тип данных
    required: true,      // Обязательное поле
    min: 1,              // Минимальная длина
    max: 100             // Максимальная длина
  })
  .field('email', {
    type: 'string',
    required: true,
    pattern: /^[^@]+@[^@]+\.[^@]+$/  // Регулярное выражение
  })
  .field('age', {
    type: 'number',
    min: 0,              // Минимальное значение
    max: 150             // Максимальное значение
  })
  .field('category', {
    type: 'string',
    enum: ['A', 'B', 'C']  // Допустимые значения
  });
```

### Поддерживаемые типы данных

- `'string'` - Строка
- `'number'` - Число (целое или дробное)
- `'integer'` - Целое число
- `'float'` - Дробное число
- `'boolean'` - Булево значение
- `'date'` - Дата
- `'array'` - Массив
- `'object'` - Объект

### Кастомные правила

#### Валидация поля

```javascript
validator.custom('validEmail', (value, row, index) => {
  // Возвращаем true если валидно, или строку с ошибкой
  if (!value.includes('@')) {
    return 'Email must contain @ symbol';
  }
  return true;
});
```

#### Валидация строки

```javascript
validator.row('validOrder', (row, index) => {
  if (row.amount > 1000 && !row.approved) {
    return 'Orders over 1000 require approval';
  }
  return true;
});
```

### Трансформации

```javascript
validator
  .transform('email', (value) => value.toLowerCase().trim())
  .transform('name', (value) => value.trim())
  .transform('price', (value) => parseFloat(value).toFixed(2));
```

### Валидация данных

#### Базовая валидация

```javascript
const result = validator.validate(data, {
  stopOnFirstError: false,  // Остановиться при первой ошибке
  includeWarnings: true,    // Включать предупреждения
  transform: true           // Применять трансформации
});
```

#### Валидация CSV

```javascript
const csv = 'name,email,age\nJohn,john@example.com,30';

const result = await validator.validateCsv(csv, {
  csvOptions: { delimiter: ',' },
  validationOptions: { transform: true }
});
```

#### Валидация JSON строки

```javascript
const jsonString = '[{"name":"John","age":30}]';

const result = validator.validateJsonString(jsonString, {
  transform: true
});