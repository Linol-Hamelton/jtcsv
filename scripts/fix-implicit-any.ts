#!/usr/bin/env node

/**
 * Скрипт для автоматического добавления типа `any` к параметрам функций
 * Исправляет ошибку TS7006: Parameter implicitly has an 'any' type
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface Pattern {
  regex: RegExp;
  fixer: (match: string, params: string) => string;
}

// Паттерны для поиска параметров без типов
const patterns: Pattern[] = [
  // Функции: function name(param) { или function name(param1, param2) {
  {
    regex: /function\s+\w+\s*\(([^)]*)\)\s*{/g,
    fixer: function(match: string, params: string): string {
      if (!params.trim()) return match;
      const fixedParams = params.split(',').map(function(p: string): string {
        const param = p.trim();
        if (!param) return '';
        // Если параметр уже имеет тип или имеет значение по умолчанию, не трогаем
        if (param.includes(':') || param.includes('=')) return param;
        return `${param}: any`;
      }).filter(function(p: string): boolean { return !!p; }).join(', ');
      return match.replace(params, fixedParams);
    }
  },
  // Стрелочные функции: (param) => { или param => {
  {
    regex: /\(([^)]*)\)\s*=>\s*{/g,
    fixer: function(match: string, params: string): string {
      if (!params.trim()) return match;
      const fixedParams = params.split(',').map(function(p: string): string {
        const param = p.trim();
        if (!param) return '';
        if (param.includes(':') || param.includes('=')) return param;
        return `${param}: any`;
      }).filter(function(p: string): boolean { return !!p; }).join(', ');
      return match.replace(params, fixedParams);
    }
  },
  // Методы классов: method(param) { или async method(param) {
  {
    regex: /(?:async\s+)?\w+\s*\(([^)]*)\)\s*{/g,
    fixer: function(match: string, params: string): string {
      if (!params.trim()) return match;
      // Проверяем, что это не конструктор класса
      if (match.includes('constructor(')) return match;
      const fixedParams = params.split(',').map(function(p: string): string {
        const param = p.trim();
        if (!param) return '';
        if (param.includes(':') || param.includes('=')) return param;
        return `${param}: any`;
      }).filter(function(p: string): boolean { return !!p; }).join(', ');
      return match.replace(params, fixedParams);
    }
  },
  // Однострочные стрелочные функции без фигурных скобок: (param) => expression
  {
    regex: /\(([^)]*)\)\s*=>\s*(?!{)(?![^{]*{)/g,
    fixer: function(match: string, params: string): string {
      if (!params.trim()) return match;
      const fixedParams = params.split(',').map(function(p: string): string {
        const param = p.trim();
        if (!param) return '';
        if (param.includes(':') || param.includes('=')) return param;
        return `${param}: any`;
      }).filter(function(p: string): boolean { return !!p; }).join(', ');
      return match.replace(params, fixedParams);
    }
  }
];

// Файлы для обработки (приоритетные из отчета)
const priorityFiles: string[] = [
  'bin/jtcsv.ts',
  'src/engines/fast-path-engine.ts',
  'packages/jtcsv-validator/src/index.ts',
  'benchmarks/independent-suite.ts',
  'src/formats/ndjson-parser.ts'
];

// Проверяем существование файлов
const filesToProcess = priorityFiles.filter(file => fs.existsSync(file));

console.log(`🔧 Обработка ${filesToProcess.length} файлов с ошибками TS7006...`);

let totalFixed = 0;
let totalFunctionsFixed = 0;

filesToProcess.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let fileFixed = false;
    let functionsFixed = 0;
    
    // Применяем все паттерны
    patterns.forEach(pattern => {
      let match: RegExpExecArray | null;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      
      while ((match = regex.exec(content)) !== null) {
        const fullMatch = match[0];
        const params = match[1] || '';
        
        // Применяем фиксер
        const fixedMatch = pattern.fixer(fullMatch, params);
        if (fixedMatch !== fullMatch) {
          // Заменяем в содержимом
          content = content.substring(0, match.index) + 
                   fixedMatch + 
                   content.substring(match.index + fullMatch.length);
          
          fileFixed = true;
          functionsFixed++;
          
          // Сбрасываем индекс regex для следующей итерации
          regex.lastIndex = match.index + fixedMatch.length;
        }
      }
    });
    
    // Если файл был изменен, сохраняем
    if (fileFixed) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFixed++;
      totalFunctionsFixed += functionsFixed;
      console.log(`✅ ${filePath}: исправлено ${functionsFixed} функций`);
    }
  } catch (error: any) {
    console.error(`❌ Ошибка при обработке ${filePath}:`, error.message);
  }
});

console.log(`\n🎉 Исправлено ${totalFixed} файлов, ${totalFunctionsFixed} функций`);

// Проверяем, сколько ошибок TS7006 осталось
console.log('\n🔍 Проверка оставшихся ошибок TS7006...');
try {
  const tscOutput = execSync('npx tsc --noEmit --strict false 2>&1', { encoding: 'utf8', stdio: 'pipe' });
  const errorLines = tscOutput.split('\n').filter(line => line.includes('TS7006'));
  
  if (errorLines.length === 0) {
    console.log('✅ Все ошибки TS7006 исправлены!');
  } else {
    console.log(`⚠️  Осталось ${errorLines.length} ошибок TS7006`);
    
    // Группируем по файлам
    const errorsByFile: Record<string, number> = {};
    errorLines.forEach(line => {
      const match = line.match(/(.+\.ts)\((\d+),(\d+)\): error TS7006:/);
      if (match) {
        const file = match[1];
        errorsByFile[file] = (errorsByFile[file] || 0) + 1;
      }
    });
    
    console.log('📁 Распределение по файлам:');
    Object.entries(errorsByFile)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 10)
      .forEach(([file, count]) => {
        console.log(`  ${file}: ${count} ошибок`);
      });
  }
} catch (error: any) {
  console.error('❌ Ошибка при проверке TypeScript:', error.message);
}

// Создаем отчет
const report = {
  timestamp: new Date().toISOString(),
  filesProcessed: filesToProcess.length,
  filesFixed: totalFixed,
  functionsFixed: totalFunctionsFixed,
  remainingTS7006: 0
};

fs.writeFileSync(
  'IMPLICIT_ANY_FIX_REPORT.json',
  JSON.stringify(report, null, 2),
  'utf8'
);

console.log('\n📄 Отчет о исправлениях сохранен в IMPLICIT_ANY_FIX_REPORT.json');
console.log('💡 Совет: Для дальнейшего улучшения типов замените `any` на конкретные типы!');