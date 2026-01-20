#!/usr/bin/env node

/* eslint-disable no-console */

const { jsonToCsv, preprocessData, saveAsCsv } = require('./json-to-csv');

async function main() {
  console.log('=== jtcsv Demo ===\n');
  
  // Пример 1: Базовое использование
  console.log('1. Базовое преобразование JSON в CSV:');
  const simpleData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35 }
  ];
  
  const basicCsv = jsonToCsv(simpleData, { delimiter: ',' });
  console.log(basicCsv);
  console.log();
  
  // Пример 2: Переименование заголовков
  console.log('2. С переименованными заголовками:');
  const renamedCsv = jsonToCsv(simpleData, {
    delimiter: ',',
    renameMap: {
      id: 'ID',
      name: 'Full Name',
      email: 'Email Address',
      age: 'Age'
    }
  });
  console.log(renamedCsv);
  console.log();
  
  // Пример 3: Защита от CSV injection
  console.log('3. Защита от CSV injection:');
  const dangerousData = [
    { id: 1, formula: '=SUM(A1:A10)', command: '+cmd|"/c calc.exe"' },
    { id: 2, formula: '@HYPERLINK("http://evil.com")', command: '-malicious' }
  ];
  
  const safeCsv = jsonToCsv(dangerousData, { delimiter: ',' });
  console.log(safeCsv);
  console.log('\nПримечание: Формулы экранированы префиксом \'\'');
  console.log();
  
  // Пример 4: Обработка вложенных структур
  console.log('4. Обработка вложенных объектов:');
  const nestedData = [
    {
      id: 1,
      user: {
        name: 'John',
        profile: { age: 30, city: 'Moscow' }
      },
      tags: ['admin', 'user']
    },
    {
      id: 2,
      user: {
        name: 'Jane',
        profile: { age: 25, city: 'SPb' }
      },
      tags: ['user']
    }
  ];
  
  const processedData = preprocessData(nestedData);
  const nestedCsv = jsonToCsv(processedData, { delimiter: ',' });
  console.log(nestedCsv);
  console.log();
  
  // Пример 5: Сохранение в файл
  console.log('5. Сохранение в файл:');
  try {
    await saveAsCsv(simpleData, 'demo-output.csv', {
      delimiter: ',',
      renameMap: { id: 'ID', name: 'Name' }
    });
    console.log('✅ Файл успешно создан: demo-output.csv');
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
  console.log();
  
  // Пример 6: Валидация входных данных
  console.log('6. Валидация входных данных:');
  try {
    jsonToCsv('not an array');
  } catch (error) {
    console.log('✅ Корректная ошибка для неверного типа:', error.message);
  }
  
  try {
    const largeData = Array.from({ length: 1000001 }, (_, i) => ({ id: i }));
    jsonToCsv(largeData);
  } catch (error) {
    console.log('✅ Корректная ошибка для большого объема:', error.message);
  }
  
  console.log('\n=== Демонстрация завершена ===');
}

// Обработка ошибок
main().catch(error => {
  console.error('❌ Ошибка в демо:', error.message);
  process.exit(1);
});