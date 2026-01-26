const fs = require('fs');
const path = require('path');

const testFiles = [
  '__tests__/csv-to-json-final-coverage.test.js',
  '__tests__/csv-to-json-edge-cases.test.js'
];

console.log('Исправление оставшихся тестовых файлов...');

testFiles.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Используем регулярное выражение для поиска паттерна
      const pattern = /\/\/ Mock fs for file reading tests[\s\S]*?jest\.mock\('fs', \(\) => mockFs\);/;
      
      if (pattern.test(content)) {
        console.log(`Исправляем ${filePath}...`);
        
        // Заменяем найденный паттерн
        content = content.replace(
          pattern,
          `// Mock fs for file reading tests
  jest.mock('fs', () => {
    const mockFs = {
      promises: {
        readFile: jest.fn()
      },
      readFileSync: jest.fn()
    };
    return mockFs;
  });`
        );
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✓ ${filePath} исправлен`);
      } else {
        console.log(`  ✗ Не удалось найти паттерн в ${filePath}`);
        // Выведем первые 500 символов для отладки
        console.log('Первые 500 символов файла:');
        console.log(content.substring(0, 500));
      }
    } else {
      console.log(`  ✗ Файл не найден: ${filePath}`);
    }
  } catch (error) {
    console.log(`  ✗ Ошибка при исправлении ${filePath}:`, error.message);
  }
});

console.log('\nЗапускаем тесты...');
const { execSync } = require('child_process');
try {
  const result = execSync('npm test', { stdio: 'inherit' });
  console.log('\n✓ Все тесты прошли успешно!');
} catch (error) {
  console.log('\n✗ Некоторые тесты не прошли');
  console.log('Статус выхода:', error.status);
}