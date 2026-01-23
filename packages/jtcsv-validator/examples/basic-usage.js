/**
 * Пример использования JTCSV Validator
 * 
 * Запуск: node basic-usage.js
 */

const { JtcsvValidator, createValidator, schemas } = require('../src/index');

console.log('🚀 JTCSV Validator - Примеры использования\n');

// Пример 1: Базовая валидация
console.log('1. Базовая валидация:');
const validator1 = new JtcsvValidator()
  .field('name', { type: 'string', required: true, min: 1, max: 100 })
  .field('email', { 
    type: 'string', 
    required: true, 
    pattern: /^[^@]+@[^@]+\.[^@]+$/ 
  })
  .field('age', { type: 'number', min: 0, max: 150 })
  .transform('email', (value) => value.toLowerCase().trim());

const testData1 = [
  { name: 'John Doe', email: 'JOHN@EXAMPLE.COM', age: 30 },
  { name: '', email: 'invalid-email', age: -5 },
  { name: 'Jane Smith', email: 'jane@example.com', age: 25 }
];

const result1 = validator1.validate(testData1);
console.log('Результат валидации:', {
  valid: result1.valid,
  errors: result1.errors.length,
  warnings: result1.warnings.length,
  validRows: result1.summary.validRows
});
console.log('Ошибки:', result1.errors.map(e => `${e.field}: ${e.message}`));
console.log('Трансформированные email:', result1.data.map(d => d.email));
console.log();

// Пример 2: Использование предопределенной схемы
console.log('2. Предопределенная схема (пользователи):');
const userValidator = schemas.user();
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', age: 28, active: true },
  { id: 2, name: 'Bob', email: 'INVALID', age: 35, active: 'yes' },
  { id: 'three', name: 'Charlie', email: 'charlie@example.com', age: 42 }
];

const userResult = userValidator.validate(users);
console.log('Валидные пользователи:', userResult.summary.validRows);
console.log('Ошибки:', userResult.errors.map(e => `Строка ${e.row}: ${e.message}`));
console.log();

// Пример 3: Валидация CSV
console.log('3. Валидация CSV данных:');
const csvData = `name,email,age
John Doe,john@example.com,30
Jane Smith,jane@example.com,25
Invalid User,invalid-email,-5`;

async function validateCsvExample() {
  const csvValidator = createValidator({
    name: { type: 'string', required: true },
    email: { type: 'string', required: true, pattern: /^[^@]+@[^@]+\.[^@]+$/ },
    age: { type: 'number', min: 0, max: 150 }
  });

  const csvResult = await csvValidator.validateCsv(csvData, {
    csvOptions: { delimiter: ',' }
  });

  console.log('CSV валидация:', {
    valid: csvResult.valid,
    totalRows: csvResult.summary.totalRows,
    validRows: csvResult.summary.validRows,
    errors: csvResult.errors.length
  });

  if (!csvResult.valid) {
    console.log('Ошибки CSV:');
    csvResult.errors.forEach(error => {
      console.log(`  Строка ${error.row}: ${error.message}`);
    });
  }
}

validateCsvExample().then(() => {
  console.log();

  // Пример 4: Отчет о валидации
  console.log('4. Подробный отчет:');
  const reportValidator = new JtcsvValidator()
    .field('product', { type: 'string', required: true })
    .field('price', { type: 'number', required: true, min: 0 })
    .field('quantity', { type: 'integer', required: true, min: 0 })
    .row('validProduct', (row) => {
      if (row.price > 1000 && row.quantity > 100) {
        return 'High value products should have limited quantity';
      }
      return true;
    });

  const products = [
    { product: 'Laptop', price: 1200, quantity: 150 },
    { product: 'Mouse', price: 25, quantity: 500 },
    { product: '', price: -10, quantity: 'invalid' }
  ];

  const report = reportValidator.report(products);
  console.log('Отчет о валидации:');
  console.log('  Статус:', report.valid ? '✅ Успешно' : '❌ Ошибки');
  console.log('  Всего строк:', report.summary.totalRows);
  console.log('  Валидных строк:', report.summary.validRows);
  console.log('  Ошибок:', report.summary.errorCount);
  console.log('  Предупреждений:', report.summary.warningCount);
  
  if (report.analysis) {
    console.log('  Анализ ошибок:');
    Object.entries(report.analysis.errorTypes).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });
  }
  
  if (report.recommendations && report.recommendations.length > 0) {
    console.log('  Рекомендации:');
    report.recommendations.forEach(rec => console.log(`    • ${rec}`));
  }

  console.log('\n✅ Все примеры выполнены успешно!');
}).catch(console.error);