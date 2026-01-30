#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Исправление свойств Error объектов...');

// Файлы для исправления (на основе анализа ошибок)
const filesToFix = [
  '__tests__/additional-coverage.test.ts',
  '__tests__/coverage-100.test.ts',
  '__tests__/csv-to-json-edge-cases.test.ts',
  '__tests__/critical-bugs.test.ts',
  'src/engines/fast-path-engine.ts',
  'src/engines/fast-path-engine-new.ts',
  'src/web-server/index.ts',
  'src/browser/workers/worker-pool.ts'
];

// Паттерны для исправления
const patterns = [
  // Свойство 'code' у Error
  {
    regex: /\.code\b/g,
    replacement: ".(code as string)"
  },
  // Свойство 'details' у Error  
  {
    regex: /\.details\b/g,
    replacement: ".(details as any)"
  },
  // Свойство 'lineNumber' у Error
  {
    regex: /\.lineNumber\b/g,
    replacement: ".(lineNumber as number)"
  },
  // Свойство 'stack' у объектов
  {
    regex: /\.stack\b/g,
    replacement: ".(stack as string)"
  }
];

let totalFixed = 0;

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`Файл не найден: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  patterns.forEach(pattern => {
    if (pattern.regex.test(content)) {
      const newContent = content.replace(pattern.regex, pattern.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Исправлен: ${filePath}`);
    totalFixed++;
  }
});

console.log(`\nИсправлено ${totalFixed} файлов`);

// Также исправим динамические импорты в тестовых файлах
console.log('\nИсправление динамических импортов...');
const testFiles = [
  '__tests__/additional-coverage.test.ts',
  '__tests__/coverage-100.test.ts',
  '__tests__/csv-to-json.test.ts',
  '__tests__/csv-to-json-remaining-coverage.test.ts'
];

testFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Заменяем динамические импорты внутри функций на require
  const importRegex = /(\s+)import\s+(.*?)\s+from\s+['"](.*?)['"]/g;
  const lines = content.split('\n');
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Если импорт не на верхнем уровне (есть отступ)
    if (line.match(/^\s+import/) && !line.match(/^(import|export)/)) {
      const newLine = line.replace(/import\s+(.*?)\s+from\s+['"](.*?)['"]/, 'const $1 = require("$2")');
      if (newLine !== line) {
        lines[i] = newLine;
        modified = true;
      }
    }
  }
  
  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Исправлены динамические импорты в: ${filePath}`);
    totalFixed++;
  }
});

console.log(`\nВсего исправлено файлов: ${totalFixed}`);