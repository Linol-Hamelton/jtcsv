#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Исправление синтаксических ошибок после замен...');

const filesToFix = [
  '__tests__/additional-coverage.test.ts',
  '__tests__/coverage-100.test.ts',
  '__tests__/csv-to-json-edge-cases.test.ts',
  'src/browser/workers/worker-pool.ts',
  'src/engines/fast-path-engine.ts',
  'src/web-server/index.ts'
];

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`Файл не найден: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Исправляем некорректный синтаксис error.(code as string)
  content = content.replace(/error\.\(code as string\)/g, '(error as any).code');
  content = content.replace(/error\.\(code as any\)/g, '(error as any).code');
  content = content.replace(/error\.\(details as any\)/g, '(error as any).details');
  content = content.replace(/error\.\(lineNumber as number\)/g, '(error as any).lineNumber');
  content = content.replace(/error\.\(stack as string\)/g, '(error as any).stack');
  
  // Общий паттерн для любого объекта
  content = content.replace(/(\w+)\.\((\w+) as (\w+)\)/g, '($1 as any).$2');
  
  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Исправлен синтаксис в: ${filePath}`);
    modified = true;
  }
  
  // Также исправляем другие распространенные ошибки
  // Заменяем any на конкретные типы где это очевидно
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Заменяем : any на : string для очевидных строк
    if (line.includes("= '") && line.includes(': any')) {
      line = line.replace(': any', ': string');
    }
    
    // Заменяем : any на : number для очевидных чисел
    if (line.includes('= 0') || line.includes('= 1') || line.includes('= 2') || line.includes('= 3')) {
      if (line.includes(': any')) {
        line = line.replace(': any', ': number');
      }
    }
    
    if (line !== lines[i]) {
      lines[i] = line;
      modified = true;
    }
  }
  
  if (modified) {
    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Добавлены конкретные типы в: ${filePath}`);
  }
});

console.log('\nИсправление завершено');