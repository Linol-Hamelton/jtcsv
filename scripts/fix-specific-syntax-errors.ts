#!/usr/bin/env node

/**
 * Скрипт для исправления конкретных синтаксических ошибок
 * 1. switch (expression: any) → switch (expression)
 * 2. if (condition: any) → if (condition)
 * 3. while (condition: any) → while (condition)
 * 4. for (let i = 0: any; i < n: any; i++: any) → for (let i = 0; i < n; i++)
 */

import * as fs from 'fs';

// Файлы для исправления
const filesToFix = [
  'benchmarks/independent-suite.ts',
  'bin/jtcsv.ts',
  'src/engines/fast-path-engine.ts',
  'packages/jtcsv-validator/src/index.ts',
  'src/formats/ndjson-parser.ts'
];

// Паттерны для исправления
const fixPatterns = [
  // switch (expression: any) → switch (expression)
  {
    regex: /switch\s*\(\s*([^:)]+)\s*:\s*any\s*\)/g,
    fixer: (match: string, expr: string) => `switch (${expr.trim()})`
  },
  // if (condition: any) → if (condition)
  {
    regex: /if\s*\(\s*([^:)]+)\s*:\s*any\s*\)/g,
    fixer: (match: string, cond: string) => `if (${cond.trim()})`
  },
  // while (condition: any) → while (condition)
  {
    regex: /while\s*\(\s*([^:)]+)\s*:\s*any\s*\)/g,
    fixer: (match: string, cond: string) => `while (${cond.trim()})`
  },
  // for (init: any; test: any; update: any) → for (init; test; update)
  {
    regex: /for\s*\(\s*([^;]+)\s*:\s*any\s*;\s*([^;]+)\s*:\s*any\s*;\s*([^)]+)\s*:\s*any\s*\)/g,
    fixer: (match: string, init: string, test: string, update: string) => 
      `for (${init.trim()}; ${test.trim()}; ${update.trim()})`
  },
  // Удаление :any из выражений в скобках
  {
    regex: /\(\s*([^:)]+)\s*:\s*any\s*\)/g,
    fixer: (match: string, expr: string) => `(${expr.trim()})`
  },
  // Исправление: case expression: any: → case expression:
  {
    regex: /case\s+([^:]+)\s*:\s*any\s*:/g,
    fixer: (match: string, expr: string) => `case ${expr.trim()}:`
  },
  // Исправление: default: any: → default:
  {
    regex: /default\s*:\s*any\s*:/g,
    fixer: () => 'default:'
  }
];

function fixFile(filePath: string): boolean {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changed = false;
    
    // Применяем все паттерны исправления
    fixPatterns.forEach(pattern => {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match: RegExpExecArray | null;
      
      while ((match = regex.exec(content)) !== null) {
        const fullMatch = match[0];
        const groups = match.slice(1);
        
        // Применяем фиксер
        const fixedMatch = pattern.fixer(fullMatch, ...groups);
        if (fixedMatch !== fullMatch) {
          content = content.substring(0, match.index) + 
                   fixedMatch + 
                   content.substring(match.index + fullMatch.length);
          changed = true;
          regex.lastIndex = match.index + fixedMatch.length;
        }
      }
    });
    
    // Если файл был изменен, сохраняем
    if (changed) {
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

function main(): void {
  console.log('🔧 Исправление конкретных синтаксических ошибок...\n');
  
  let totalFixed = 0;
  
  filesToFix.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      if (fixFile(filePath)) {
        totalFixed++;
      }
    } else {
      console.log(`⚠️  Файл не найден: ${filePath}`);
    }
  });
  
  console.log(`\n🎉 Исправлено ${totalFixed} файлов`);
  
  // Проверяем результат
  console.log('\n🔍 Проверка оставшихся ошибок...');
  try {
    const { execSync } = require('child_process');
    const tscOutput = execSync('npx tsc --noEmit --strict false 2>&1', { 
      encoding: 'utf8', 
      stdio: 'pipe' 
    });
    
    const errorCount = tscOutput.split('\n').filter(line => line.includes('error TS')).length;
    console.log(`Всего ошибок TypeScript: ${errorCount}`);
    
    if (errorCount < 1000) {
      console.log('✅ Значительное улучшение!');
    }
  } catch (error: any) {
    console.error('❌ Ошибка при проверке TypeScript:', error.message);
  }
}

if (require.main === module) {
  main();
}