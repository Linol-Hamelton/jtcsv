#!/usr/bin/env node

/**
 * Скрипт для анализа и исправления ошибок TS2339
 * Property does not exist on type
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface PropertyFix {
  file: string;
  line: number;
  column: number;
  property: string;
  object: string;
}

// Получаем ошибки TS2339 из TypeScript компилятора
function getTS2339Errors(): PropertyFix[] {
  try {
    const tscOutput = execSync('npx tsc --noEmit --strict false 2>&1', { 
      encoding: 'utf8', 
      stdio: 'pipe' 
    });
    
    const errors: PropertyFix[] = [];
    const lines = tscOutput.split('\n');
    
    for (const line of lines) {
      if (line.includes('TS2339:')) {
        // Пример: src/index.ts(123,15): error TS2339: Property 'length' does not exist on type 'string | number'.
        const match = line.match(/(.+\.ts)\((\d+),(\d+)\): error TS2339: Property '(.+)' does not exist on type '(.+)'\./);
        if (match) {
          const [, file, lineStr, columnStr, property, objectType] = match;
          errors.push({
            file,
            line: parseInt(lineStr),
            column: parseInt(columnStr),
            property,
            object: objectType
          });
        }
      }
    }
    
    return errors;
  } catch (error: any) {
    console.error('❌ Ошибка при получении ошибок TypeScript:', error.message);
    return [];
  }
}

// Анализируем наиболее частые ошибки
function analyzeErrors(errors: PropertyFix[]): void {
  console.log(`🔍 Найдено ${errors.length} ошибок TS2339`);
  
  // Группируем по файлам
  const errorsByFile: Record<string, number> = {};
  errors.forEach(error => {
    errorsByFile[error.file] = (errorsByFile[error.file] || 0) + 1;
  });
  
  console.log('\n📁 Распределение по файлам (топ-10):');
  Object.entries(errorsByFile)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 10)
    .forEach(([file, count]) => {
      console.log(`  ${file}: ${count} ошибок`);
    });
  
  // Группируем по свойствам
  const errorsByProperty: Record<string, number> = {};
  errors.forEach(error => {
    errorsByProperty[error.property] = (errorsByProperty[error.property] || 0) + 1;
  });
  
  console.log('\n🔑 Наиболее частые свойства (топ-10):');
  Object.entries(errorsByProperty)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 10)
    .forEach(([property, count]) => {
      console.log(`  ${property}: ${count} ошибок`);
    });
}

// Создаем отчет
function createReport(errors: PropertyFix[]): void {
  const report = {
    timestamp: new Date().toISOString(),
    totalErrors: errors.length,
    errorsByFile: {} as Record<string, number>,
    errorsByProperty: {} as Record<string, number>,
    sampleErrors: errors.slice(0, 20)
  };
  
  // Группируем
  errors.forEach(error => {
    report.errorsByFile[error.file] = (report.errorsByFile[error.file] || 0) + 1;
    report.errorsByProperty[error.property] = (report.errorsByProperty[error.property] || 0) + 1;
  });
  
  fs.writeFileSync(
    'TS2339_ERRORS_REPORT.json',
    JSON.stringify(report, null, 2),
    'utf8'
  );
  
  console.log('\n📄 Отчет сохранен в TS2339_ERRORS_REPORT.json');
}

// Основная функция
function main(): void {
  console.log('🔧 Анализ ошибок TS2339 (Property does not exist on type)...');
  
  const errors = getTS2339Errors();
  
  if (errors.length === 0) {
    console.log('✅ Ошибок TS2339 не найдено!');
    return;
  }
  
  analyzeErrors(errors);
  createReport(errors);
  
  console.log('\n💡 Рекомендации для исправления:');
  console.log('1. Используйте type guards для проверки типов');
  console.log('2. Добавьте проверки на существование свойств');
  console.log('3. Используйте optional chaining (?.)');
  console.log('4. Добавьте явные приведения типов (as)');
  console.log('5. Обновите интерфейсы и типы');
}

// Запуск
if (require.main === module) {
  main();
}

export { getTS2339Errors, analyzeErrors, createReport };