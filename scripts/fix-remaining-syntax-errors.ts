#!/usr/bin/env node

/**
 * Скрипт для исправления оставшихся синтаксических ошибок
 * TS1005: ',' expected, ')' expected, ';' expected
 * TS1128: Declaration or statement expected
 * TS1434: Unexpected keyword or identifier
 */

import * as fs from 'fs';

// Основные проблемные файлы
const problemFiles = [
  'benchmarks/independent-suite.ts',
  'bin/jtcsv.ts',
  'packages/jtcsv-validator/src/index.ts'
];

// Функция для исправления конкретных проблем в файле
function fixFile(filePath: string): boolean {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changed = false;
    
    // 1. Исправление проблем с запятыми после добавления :any
    // Пример: function name(param: any, param2: any,) → function name(param: any, param2: any)
    content = content.replace(/,\s*\)/g, ')');
    content = content.replace(/,\s*;/g, ';');
    content = content.replace(/,\s*,/g, ',');
    
    // 2. Исправление проблем с лишними скобками
    // Пример: ((param: any)) → (param: any)
    content = content.replace(/\(\(/g, '(');
    content = content.replace(/\)\)/g, ')');
    
    // 3. Исправление проблем с :any в неправильных местах
    // Пример: switch (j % 4: any) → switch (j % 4)
    content = content.replace(/(switch|if|while|for)\s*\(\s*([^:)]+)\s*:\s*any\s*\)/g, '$1 ($2)');
    
    // 4. Исправление проблем с объявлениями функций
    // Удаление лишних :any из объявлений
    content = content.replace(/function\s+(\w+)\s*\(([^)]*)\)\s*:\s*any\s*{/g, 'function $1($2) {');
    
    // 5. Исправление конкретных проблем для benchmarks/independent-suite.ts
    if (filePath.includes('benchmarks/independent-suite.ts')) {
      // Исправление строки 361: error TS1005: ',' expected.
      // Найдем проблемные места вокруг строки 361
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('createCsvToJsonStream') && lines[i].includes(': any')) {
          // Удалим лишние :any
          lines[i] = lines[i].replace(/:\s*any/g, '');
        }
      }
      content = lines.join('\n');
    }
    
    // 6. Исправление проблем для bin/jtcsv.ts
    if (filePath.includes('bin/jtcsv.ts')) {
      // Удаление лишних :any из вызовов функций
      content = content.replace(/\(\s*([^)]+)\s*:\s*any\s*\)/g, '($1)');
    }
    
    // 7. Исправление проблем для packages/jtcsv-validator/src/index.ts
    if (filePath.includes('packages/jtcsv-validator/src/index.ts')) {
      // Исправление строки 48: error TS1441: Cannot start a function call in a type annotation.
      // Вероятно, проблема с type assertion
      content = content.replace(/:\s*\(\s*\)\s*=>/g, ': () =>');
    }
    
    // Проверяем, были ли изменения
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath}: исправлены синтаксические ошибки`);
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error(`❌ Ошибка при обработке ${filePath}:`, error.message);
    return false;
  }
}

// Функция для проверки конкретной строки в файле
function checkSpecificLine(filePath: string, lineNumber: number): void {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lineNumber <= lines.length) {
      console.log(`\n🔍 Проверка строки ${lineNumber} в ${filePath}:`);
      console.log(lines[lineNumber - 1]);
    }
  } catch (error) {
    // Игнорируем ошибки
  }
}

function main(): void {
  console.log('🔧 Исправление оставшихся синтаксических ошибок...\n');
  
  let totalFixed = 0;
  
  problemFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      if (fixFile(filePath)) {
        totalFixed++;
      }
    } else {
      console.log(`⚠️  Файл не найден: ${filePath}`);
    }
  });
  
  console.log(`\n🎉 Исправлено ${totalFixed} файлов`);
  
  // Проверяем конкретные проблемные строки
  console.log('\n🔍 Проверка конкретных проблемных строк:');
  checkSpecificLine('benchmarks/independent-suite.ts', 361);
  checkSpecificLine('packages/jtcsv-validator/src/index.ts', 48);
  
  // Проверяем результат
  console.log('\n📊 Проверка оставшихся ошибок...');
  try {
    const { execSync } = require('child_process');
    const tscOutput = execSync('npx tsc --noEmit --strict false 2>&1', { 
      encoding: 'utf8', 
      stdio: 'pipe' 
    });
    
    const errorCount = tscOutput.split('\n').filter((line: string) => line.includes('error TS')).length;
    console.log(`Всего ошибок TypeScript: ${errorCount}`);
    
    // Анализируем типы ошибок
    const errorsByType: Record<string, number> = {};
    tscOutput.split('\n').forEach((line: string) => {
      const match = line.match(/error TS(\d+):/);
      if (match) {
        const errorType = `TS${match[1]}`;
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      }
    });
    
    console.log('\n📈 Распределение ошибок по типам:');
    Object.entries(errorsByType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count} ошибок`);
      });
    
  } catch (error: any) {
    console.error('❌ Ошибка при проверке TypeScript:', error.message);
  }
}

if (require.main === module) {
  main();
}