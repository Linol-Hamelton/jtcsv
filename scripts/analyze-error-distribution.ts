#!/usr/bin/env node

/**
 * Скрипт для анализа распределения ошибок TypeScript по типам
 */

import * as fs from 'fs';
import { execSync } from 'child_process';

interface ErrorStats {
  total: number;
  byType: Record<string, number>;
  byFile: Record<string, number>;
  topFiles: Array<{file: string, count: number}>;
  topErrorTypes: Array<{type: string, count: number}>;
}

// Получаем все ошибки TypeScript
function getAllTypeScriptErrors(): string[] {
  try {
    const tscOutput = execSync('npx tsc --noEmit --strict false 2>&1', { 
      encoding: 'utf8', 
      stdio: 'pipe' 
    });
    
    return tscOutput.split('\n').filter(line => line.includes('error TS'));
  } catch (error: any) {
    console.error('❌ Ошибка при получении ошибок TypeScript:', error.message);
    return [];
  }
}

// Анализируем ошибки
function analyzeErrors(errorLines: string[]): ErrorStats {
  const stats: ErrorStats = {
    total: errorLines.length,
    byType: {},
    byFile: {},
    topFiles: [],
    topErrorTypes: []
  };
  
  // Регулярные выражения для парсинга
  const errorTypeRegex = /error TS(\d+):/;
  const fileRegex = /(.+\.ts)\((\d+),(\d+)\):/;
  
  errorLines.forEach(line => {
    // Извлекаем тип ошибки
    const typeMatch = line.match(errorTypeRegex);
    if (typeMatch) {
      const errorType = `TS${typeMatch[1]}`;
      stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;
    }
    
    // Извлекаем файл
    const fileMatch = line.match(fileRegex);
    if (fileMatch) {
      const file = fileMatch[1];
      stats.byFile[file] = (stats.byFile[file] || 0) + 1;
    }
  });
  
  // Сортируем файлы по количеству ошибок
  stats.topFiles = Object.entries(stats.byFile)
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  
  // Сортируем типы ошибок
  stats.topErrorTypes = Object.entries(stats.byType)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return stats;
}

// Выводим отчет
function printReport(stats: ErrorStats): void {
  console.log('📊 АНАЛИЗ РАСПРЕДЕЛЕНИЯ ОШИБОК TYPESCRIPT');
  console.log('=' .repeat(50));
  console.log(`Всего ошибок: ${stats.total}`);
  console.log('');
  
  console.log('🔝 ТОП-10 ТИПОВ ОШИБОК:');
  console.log('-' .repeat(30));
  stats.topErrorTypes.forEach(({ type, count }, index) => {
    const percentage = ((count / stats.total) * 100).toFixed(1);
    console.log(`${index + 1}. ${type}: ${count} (${percentage}%)`);
  });
  console.log('');
  
  console.log('📁 ТОП-15 ФАЙЛОВ С ОШИБКАМИ:');
  console.log('-' .repeat(40));
  stats.topFiles.forEach(({ file, count }, index) => {
    const percentage = ((count / stats.total) * 100).toFixed(1);
    console.log(`${index + 1}. ${file}: ${count} (${percentage}%)`);
  });
  console.log('');
  
  // Общая статистика
  const errorTypesCount = Object.keys(stats.byType).length;
  const filesCount = Object.keys(stats.byFile).length;
  console.log('📈 ОБЩАЯ СТАТИСТИКА:');
  console.log(`- Уникальных типов ошибок: ${errorTypesCount}`);
  console.log(`- Файлов с ошибками: ${filesCount}`);
  console.log(`- Среднее количество ошибок на файл: ${(stats.total / filesCount).toFixed(1)}`);
}

// Сохраняем отчет в файл
function saveReport(stats: ErrorStats): void {
  const report = {
    timestamp: new Date().toISOString(),
    totalErrors: stats.total,
    errorTypes: stats.byType,
    files: stats.byFile,
    topFiles: stats.topFiles,
    topErrorTypes: stats.topErrorTypes,
    summary: {
      uniqueErrorTypes: Object.keys(stats.byType).length,
      filesWithErrors: Object.keys(stats.byFile).length,
      averageErrorsPerFile: stats.total / Object.keys(stats.byFile).length
    }
  };
  
  fs.writeFileSync(
    'ERROR_DISTRIBUTION_REPORT.json',
    JSON.stringify(report, null, 2),
    'utf8'
  );
  
  console.log('📄 Подробный отчет сохранен в ERROR_DISTRIBUTION_REPORT.json');
}

// Основная функция
function main(): void {
  console.log('🔍 Анализ распределения ошибок TypeScript...\n');
  
  const errorLines = getAllTypeScriptErrors();
  
  if (errorLines.length === 0) {
    console.log('✅ Ошибок TypeScript не найдено!');
    return;
  }
  
  const stats = analyzeErrors(errorLines);
  printReport(stats);
  saveReport(stats);
  
  console.log('\n💡 РЕКОМЕНДАЦИИ ДЛЯ ДАЛЬНЕЙШЕЙ РАБОТЫ:');
  console.log('1. Сфокусируйтесь на наиболее частых типах ошибок');
  console.log('2. Начните с файлов с наибольшим количеством ошибок');
  console.log('3. Используйте автоматические скрипты для исправления');
  console.log('4. Проверяйте прогресс после каждого этапа');
  console.log('5. Постепенно включайте strict режим');
}

// Запуск
if (require.main === module) {
  main();
}

export { getAllTypeScriptErrors, analyzeErrors, printReport };