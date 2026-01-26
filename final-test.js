const fs = require('fs');
const jtcsv = require('./index.js');

console.log('=== Финальный тест jtcsv ===');

// 1. Тест базовой конвертации
console.log('1. Базовая конвертация JSON→CSV:');
const data = [
  {id: 1, name: 'John', age: 30},
  {id: 2, name: 'Jane', age: 25}
];
const csv = jtcsv.jsonToCsv(data);
console.log(csv);

// 2. Тест renameMap
console.log('\n2. Конвертация с renameMap:');
const csvRenamed = jtcsv.jsonToCsv(data, {renameMap: {id: 'ID', name: 'FullName'}});
console.log(csvRenamed);

// 3. Тест schema (если поддерживается)
console.log('\n3. Проверка поддержки schema:');
console.log('Функция jsonToCsv принимает schema:', jtcsv.jsonToCsv.toString().includes('schema'));

// 4. Проверка функций в CLI
console.log('\n4. Проверка функций в bin/jtcsv.js:');
const cliContent = fs.readFileSync('bin/jtcsv.js', 'utf8');
const checks = [
  ['applyTransform', 'Функция applyTransform'],
  ['options.schema', 'Передача schema в options'],
  ['options.transform', 'Передача transform в options'],
  ['finalObj = {}', 'Обработка renameMap в streaming'],
  ['batch process', 'Команда batch process (заглушка)']
];

checks.forEach(([pattern, desc]) => {
  const found = cliContent.includes(pattern);
  console.log(found ? '✓' : '✗', desc);
});

console.log('\n=== Тест завершен ===');