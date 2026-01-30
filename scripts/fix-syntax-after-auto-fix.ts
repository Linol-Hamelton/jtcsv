#!/usr/bin/env node

/**
 * Скрипт для исправления синтаксических ошибок, вызванных автоматическим добавлением типов
 * Исправляет проблемы с неправильным добавлением :any
 */

import * as fs from 'fs';

// Файлы, которые были изменены скриптом fix-implicit-any
const filesToFix = [
  'benchmarks/independent-suite.ts',
  'bin/jtcsv.ts',
  'src/engines/fast-path-engine.ts',
  'packages/jtcsv-validator/src/index.ts',
  'src/formats/ndjson-parser.ts'
];

// Паттерны для исправления
const fixPatterns = [
  // Исправление: function name(param: any) { → function name(param: any) {
  // (уже правильно, но проверяем лишние скобки)
  {
    regex: /function\s+\w+\s*\(([^)]*: any[^)]*)\)\s*{/g,
    fixer: (match: string, params: string) => {
      // Проверяем, нет ли лишних скобок
      if (params.includes('((') || params.includes('))')) {
        const fixedParams = params.replace(/\(\(/g, '(').replace(/\)\)/g, ')');
        return match.replace(params, fixedParams);
      }
      return match;
    }
  },
  // Исправление: (param: any) => { → (param: any) => {
  {
    regex: /\(([^)]*: any[^)]*)\)\s*=>\s*{/g,
    fixer: (match: string, params: string) => {
      if (params.includes('((') || params.includes('))')) {
        const fixedParams = params.replace(/\(\(/g, '(').replace(/\)\)/g, ')');
        return match.replace(params, fixedParams);
      }
      return match;
    }
  },
  // Исправление проблем с запятыми: param1: any, param2: any, → param1: any, param2: any
  {
    regex: /,\s*,/g,
    fixer: (match: string) => ','
  },
  // Исправление: : any: any → : any
  {
    regex: /:\s*any\s*:\s*any/g,
    fixer: () => ': any'
  },
  // Исправление: param: any= defaultValue → param: any = defaultValue
  {
    regex: /:\s*any=/g,
    fixer: () => ': any ='
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
        const params = match[1] || '';
        
        // Применяем фиксер
        const fixedMatch = pattern.fixer(fullMatch, params);
        if (fixedMatch !== fullMatch) {
          content = content.substring(0, match.index) + 
                   fixedMatch + 
                   content.substring(match.index + fullMatch.length);
          changed = true;
          regex.lastIndex = match.index + fixedMatch.length;
        }
      }
    });
    
    // Дополнительные исправления для конкретных файлов
    if (filePath.includes('benchmarks/independent-suite.ts')) {
      // Исправление проблем с switch case
      content = content.replace(/switch\s*\(([^)]*)\)\s*{/g, 'switch ($1) {');
    }
    
    if (filePath.includes('bin/jtcsv.ts')) {
      // Удаление лишних скобок
      content = content.replace(/\(\(/g, '(').replace(/\)\)/g, ')');
    }
    
    // Если файл был изменен, сохраняем
    if (changed || content !== originalContent) {
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
  console.log('🔧 Исправление синтаксических ошибок после автоматического добавления типов...\n');
  
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
  
  // Проверяем, сколько ошибок осталось
  console.log('\n🔍 Проверка оставшихся синтаксических ошибок...');
  try {
    const { execSync } = require('child_process');
    const tscOutput = execSync('npx tsc --noEmit --strict false 2>&1', { 
      encoding: 'utf8', 
      stdio: 'pipe' 
    });
    
    const syntaxErrors = tscOutput.split('\n').filter(line => 
      line.includes('TS1005') || // ')' expected, ',' expected и т.д.
      line.includes('TS1128') || // Declaration or statement expected
      line.includes('TS1434')    // Unexpected keyword or identifier
    );
    
    if (syntaxErrors.length === 0) {
      console.log('✅ Все синтаксические ошибки исправлены!');
    } else {
      console.log(`⚠️  Осталось ${syntaxErrors.length} синтаксических ошибок`);
      
      // Группируем по файлам
      const errorsByFile: Record<string, number> = {};
      syntaxErrors.forEach(line => {
        const match = line.match(/(.+\.ts)\((\d+),(\d+)\):/);
        if (match) {
          const file = match[1];
          errorsByFile[file] = (errorsByFile[file] || 0) + 1;
        }
      });
      
      console.log('📁 Распределение по файлам:');
      Object.entries(errorsByFile)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 5)
        .forEach(([file, count]) => {
          console.log(`  ${file}: ${count} ошибок`);
        });
    }
  } catch (error: any) {
    console.error('❌ Ошибка при проверке TypeScript:', error.message);
  }
}

if (require.main === module) {
  main();
}