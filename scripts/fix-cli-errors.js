#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'bin', 'jtcsv.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Исправить объявление transformedData (добавить let в начале блока)
content = content.replace(
  /if \(options\.transform\) \{[\s\S]*?try \{[\s\S]*?transformedData =/,
  (match) => {
    return match.replace(/try \{/, "let transformedData;\ntry {");
  }
);

// 2. Исправить функцию внутри блока (ошибка ES5 strict mode)
// Найдем функцию внутри блока и вынесем ее
const functionInBlockRegex = /if \(.*?\) \{[\s\S]*?function (\w+)\([^)]*\) \{[\s\S]*?\}[\s\S]*?\}/;
if (functionInBlockRegex.test(content)) {
  // Просто заменим function на const для стрелочной функции
  content = content.replace(
    /if \(true\) \{[\s\S]*?function (\w+)\([^)]*\) \{[\s\S]*?\}[\s\S]*?\}/g,
    (match, funcName) => {
      return match.replace(
        new RegExp(`function ${funcName}\\([^)]*\\) \\{[\\s\\S]*?\\}`, 'g'),
        (funcMatch) => {
          // Преобразуем function в const
          return funcMatch.replace(
            new RegExp(`function ${funcName}\\(([^)]*)\\)`),
            `const ${funcName} = ($1) =>`
          );
        }
      );
    }
  );
}

// 3. Исправить console.log с 3 аргументами
content = content.replace(
  /console\.log\(color\(([^,]+), ([^)]+)\), ([^)]+)\);/g,
  "console.log(color($1, $2) + ' ' + $3);"
);

// 4. Исправить Type 'unknown' ошибку (скорее всего опечатка)
content = content.replace(/unknow/g, 'unknown');

// 5. Удалить дублирующиеся импорты
content = content.replace(/import \* as fs from 'fs';\s+import \* as fs from 'fs';/g, "import * as fs from 'fs';");

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Исправлены основные ошибки в bin/jtcsv.ts');

// Проверим результат
const { execSync } = require('child_process');
try {
  const result = execSync(`npx tsc --noEmit --strict false bin/jtcsv.ts 2>&1`, { encoding: 'utf8' });
  const errorCount = (result.match(/error TS/g) || []).length;
  console.log(`✅ Осталось ошибок TypeScript: ${errorCount}`);
  if (errorCount > 0 && errorCount < 10) {
    console.log(result);
  }
} catch (error) {
  console.log('❌ Ошибки TypeScript:', error.stdout?.slice(0, 500) || error.message?.slice(0, 500));
}