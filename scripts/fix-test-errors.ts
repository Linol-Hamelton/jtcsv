#!/usr/bin/env node

/**
 * Скрипт для исправления распространенных ошибок в конвертированных тестах
 */

import fs from "fs";
import path from "path";

// Файлы для исправления
const FILES_TO_FIX = [
  '__tests__/cli.test.ts',
  '__tests__/ndjson-parser-additional.test.ts',
  '__tests__/plugins/express-middleware.test.ts',
  '__tests__/tsv-parser.test.ts'
];

/**
 * Исправляет импорт fs.promises
 */
function fixFsPromisesImport(content) {
  return content.replace(/import fs from 'fs'\.promises;/, "import fs from 'fs/promises';");
}

/**
 * Добавляет недостающие импорты Jest
 */
function addMissingJestImports(content) {
  // Проверяем, использует ли файл beforeAll/afterAll
  if ((content.includes('beforeAll(') || content.includes('afterAll(')) && 
      !content.includes("from '@jest/globals'")) {
    // Добавляем beforeAll и afterAll в импорты
    return content.replace(
      /import { ([^}]+) } from '@jest\/globals';/,
      "import { $1, beforeAll, afterAll } from '@jest/globals';"
    );
  }
  return content;
}

/**
 * Исправляет синтаксические ошибки с точкой с запятой
 */
function fixSemicolonErrors(content) {
  // Исправляем распространенные паттерны
  return content
    .replace(/expect\(([^)]+)\)\.toBe\(([^)]+)\)\)/g, 'expect($1).toBe($2)')
    .replace(/\);\)/g, '));')
    .replace(/\);\)/g, '));');
}

/**
 * Основная функция
 */
function main() {
  console.log('🔧 Исправление ошибок в конвертированных тестах');
  console.log('=' .repeat(50));
  
  let fixedCount = 0;
  
  for (const filePath of FILES_TO_FIX) {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Файл не найден: ${filePath}`);
      continue;
    }
    
    console.log(`📝 Исправление: ${filePath}`);
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Применяем исправления
      content = fixFsPromisesImport(content);
      content = addMissingJestImports(content);
      content = fixSemicolonErrors(content);
      
      // Если контент изменился, сохраняем
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ Исправлено`);
        fixedCount++;
      } else {
        console.log(`  ⏭️  Изменений не требуется`);
      }
    } catch (error) {
      console.error(`  ❌ Ошибка: ${error.message}`);
    }
  }
  
  console.log();
  console.log('=' .repeat(50));
  console.log(`📊 Исправлено файлов: ${fixedCount} из ${FILES_TO_FIX.length}`);
  
  if (fixedCount > 0) {
    console.log('💡 Запустите проверку TypeScript: npx tsc --noEmit');
  }
}

// Запуск
if (require.main === module) {
  main();
}