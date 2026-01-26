const fs = require('fs');
const path = require('path');

const testFiles = [
  '__tests__/csv-to-json.test.js',
  '__tests__/csv-to-json-final-coverage.test.js',
  '__tests__/csv-to-json-edge-cases.test.js'
];

console.log('Исправление тестовых файлов...');

testFiles.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Исправляем проблему с mockFs
      if (content.includes('jest.mock(\'fs\', () => mockFs)')) {
        console.log(`Исправляем ${filePath}...`);
        
        // Находим определение mockFs
        const mockFsMatch = content.match(/const mockFs = \{[\s\S]*?\};/);
        if (mockFsMatch) {
          const mockFsDef = mockFsMatch[0];
          
          // Заменяем определение
          content = content.replace(
            `${mockFsDef}\n\n// Mock the entire fs module\njest.mock('fs', () => mockFs);`,
            `// Mock the entire fs module\njest.mock('fs', () => {\n  ${mockFsDef.replace('const mockFs = ', 'const mockFs = ')}\n  return mockFs;\n});`
          );
          
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`  ✓ ${filePath} исправлен`);
        } else {
          console.log(`  ✗ Не удалось найти mockFs в ${filePath}`);
        }
      } else {
        console.log(`  ✓ ${filePath} уже исправлен`);
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