#!/usr/bin/env node

/**
 * Скрипт для массовой конвертации тестов из JavaScript в TypeScript
 */

import fs from "fs";
import path from "path";

// Конфигурация
const CONFIG = {
  testDir: '__tests__',
  jsExtensions: ['.js', '.jsx'],
  tsExtensions: ['.ts', '.tsx'],
  
  // Шаблон для импортов Jest
  jestImportTemplate: `import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';\n`,
  
  // Игнорируемые файлы
  ignoreFiles: [
    'setup-jest.js',
    'jest.config.js',
    'jest.config.ts.js'
  ]
};

/**
 * Конвертирует require() в import
 */
function convertRequireToImport(content) {
  // Заменяем const {  ...  } = await import("...") на import { ... } from '...'
  const requireRegex = /const\s+{([^}]+)}\s*=\s*require\(['"]([^'"]+)['"]\)/g;
  let converted = content.replace(requireRegex, (match, imports, modulePath) => {
    // Убираем расширения .js из импортов
    const cleanPath = modulePath.replace(/\.js$/, '');
    return `import {${imports}} from '${cleanPath}'`;
  });
  
  // Заменяем const module = await import("...") на import module from '...'
  const singleRequireRegex = /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
  converted = converted.replace(singleRequireRegex, (match, varName, modulePath) => {
    const cleanPath = modulePath.replace(/\.js$/, '');
    return `import ${varName} from '${cleanPath}'`;
  });
  
  return converted;
}

/**
 * Добавляет импорты Jest если их нет
 */
function addJestImports(content) {
  // Проверяем, есть ли уже импорты Jest
  if (content.includes('@jest/globals') || content.includes("from '@jest/globals'")) {
    return content;
  }
  
  // Проверяем, использует ли файл глобальные функции Jest
  const usesJestGlobals = content.includes('describe(') || content.includes('test(') || content.includes('expect(');
  
  if (usesJestGlobals) {
    // Находим первую строку после возможных комментариев
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Пропускаем shebang и комментарии
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('#!') && !lines[i].startsWith('//')) {
        insertIndex = i;
        break;
      }
    }
    
    // Вставляем импорт Jest
    lines.splice(insertIndex, 0, CONFIG.jestImportTemplate.trim());
    return lines.join('\n');
  }
  
  return content;
}

/**
 * Конвертирует один тестовый файл
 */
function convertTestFile(jsFilePath) {
  const dir = path.dirname(jsFilePath);
  const baseName = path.basename(jsFilePath, '.js');
  const tsFilePath = path.join(dir, `${baseName}.ts`);
  
  console.log(`📝 Конвертация: ${path.relative(process.cwd(), jsFilePath)} → ${path.relative(process.cwd(), tsFilePath)}`);
  
  try {
    // Читаем исходный файл
    const content = fs.readFileSync(jsFilePath, 'utf8');
    
    // Конвертируем require в import
    let converted = convertRequireToImport(content);
    
    // Добавляем импорты Jest
    converted = addJestImports(converted);
    
    // Исправляем типы any
    converted = converted.replace(/as any/g, 'as any');
    
    // Записываем TypeScript файл
    fs.writeFileSync(tsFilePath, converted, 'utf8');
    
    // Удаляем оригинальный JavaScript файл
    fs.unlinkSync(jsFilePath);
    
    console.log(`  ✅ Успешно конвертирован`);
    return true;
  } catch (error) {
    console.error(`  ❌ Ошибка: ${error.message}`);
    return false;
  }
}

/**
 * Рекурсивно сканирует директорию с тестами
 */
function scanAndConvertTests(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let convertedCount = 0;
  let errorCount = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      // Рекурсивно сканируем поддиректории
      const subResult = scanAndConvertTests(fullPath);
      convertedCount += subResult.converted;
      errorCount += subResult.errors;
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      
      // Проверяем, нужно ли игнорировать файл
      if (CONFIG.ignoreFiles.includes(entry.name)) {
        console.log(`⏭️  Пропуск: ${path.relative(process.cwd(), fullPath)} (игнорируется)`);
        continue;
      }
      
      // Конвертируем только .js файлы
      if (CONFIG.jsExtensions.includes(ext) && entry.name.endsWith('.test.js')) {
        const success = convertTestFile(fullPath);
        if (success) {
          convertedCount++;
        } else {
          errorCount++;
        }
      }
    }
  }
  
  return { converted: convertedCount, errors: errorCount };
}

/**
 * Основная функция
 */
function main() {
  console.log('🚀 МАССОВАЯ КОНВЕРТАЦИЯ ТЕСТОВ ИЗ JavaScript В TypeScript');
  console.log('=' .repeat(60));
  console.log();
  
  // Проверяем существование директории тестов
  if (!fs.existsSync(CONFIG.testDir)) {
    console.error(`❌ Директория тестов не найдена: ${CONFIG.testDir}`);
    process.exit(1);
  }
  
  // Сканируем и конвертируем тесты
  const result = scanAndConvertTests(CONFIG.testDir);
  
  console.log();
  console.log('=' .repeat(60));
  console.log('📊 РЕЗУЛЬТАТЫ:');
  console.log(`   Конвертировано файлов: ${result.converted}`);
  console.log(`   Ошибок: ${result.errors}`);
  console.log();
  
  if (result.errors > 0) {
    console.log('⚠️  Некоторые файлы не были конвертированы. Проверьте ошибки выше.');
    process.exit(1);
  } else {
    console.log('🎉 Все тесты успешно конвертированы!');
    console.log('💡 Следующие шаги:');
    console.log('   1. Запустите проверку TypeScript: npx tsc --noEmit');
    console.log('   2. Запустите тесты: npm test');
    console.log('   3. Обновите документацию прогресса');
  }
}

// Запуск
if (require.main === module) {
  main();
}

export default {
  convertRequireToImport,
  addJestImports,
  convertTestFile,
  scanAndConvertTests
};