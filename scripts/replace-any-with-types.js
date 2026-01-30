#!/usr/bin/env node

/**
 * Скрипт для замены 'any' на конкретные типы в очевидных случаях
 */

const fs = require('fs');
const path = require('path');

// Файлы для обработки (основные модули)
const filesToProcess = [
  'src/engines/fast-path-engine.ts',
  'src/browser/workers/worker-pool.ts',
  'src/utils/schema-validator.ts',
  'json-to-csv.ts',
  'csv-to-json.ts',
  'errors.ts'
];

// Правила замены
const replacementRules = [
  // Замена параметров функций
  {
    pattern: /function (\w+)\((\w+): any\)/g,
    replacement: (match, funcName, paramName) => {
      // На основе имени параметра определяем тип
      if (paramName.includes('data') || paramName.includes('array') || paramName.includes('items')) {
        return `function ${funcName}(${paramName}: any[])`;
      } else if (paramName.includes('str') || paramName.includes('text') || paramName.includes('csv') || paramName.includes('json')) {
        return `function ${funcName}(${paramName}: string)`;
      } else if (paramName.includes('num') || paramName.includes('count') || paramName.includes('index')) {
        return `function ${funcName}(${paramName}: number)`;
      } else if (paramName.includes('obj') || paramName.includes('options') || paramName.includes('config')) {
        return `function ${funcName}(${paramName}: Record<string, any>)`;
      }
      return match;
    }
  },
  
  // Замена возвращаемых значений
  {
    pattern: /function (\w+)\([^)]*\): any/g,
    replacement: (match, funcName) => {
      // На основе имени функции определяем тип возвращаемого значения
      if (funcName.includes('parse') || funcName.includes('convert') || funcName.includes('toJson')) {
        return `function ${funcName}(...args: any[]): any[]`;
      } else if (funcName.includes('validate') || funcName.includes('check') || funcName.includes('isValid')) {
        return `function ${funcName}(...args: any[]): boolean`;
      } else if (funcName.includes('create') || funcName.includes('build') || funcName.includes('generate')) {
        return `function ${funcName}(...args: any[]): any`;
      }
      return match;
    }
  },
  
  // Замена переменных
  {
    pattern: /const (\w+): any =/g,
    replacement: (match, varName) => {
      if (varName.includes('result') || varName.includes('output') || varName.includes('data')) {
        return `const ${varName}: any[] =`;
      } else if (varName.includes('error') || varName.includes('err')) {
        return `const ${varName}: Error =`;
      } else if (varName.includes('count') || varName.includes('total') || varName.includes('size')) {
        return `const ${varName}: number =`;
      }
      return match;
    }
  }
];

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`Файл не найден: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changesMade = 0;

  // Применяем правила замены
  for (const rule of replacementRules) {
    if (typeof rule.replacement === 'function') {
      content = content.replace(rule.pattern, rule.replacement);
    } else {
      content = content.replace(rule.pattern, rule.replacement);
    }
  }

  // Дополнительные замены для конкретных паттернов
  // Замена: let something: any; -> let something: unknown;
  content = content.replace(/let (\w+): any;/g, 'let $1: unknown;');
  
  // Замена: ...args: any[] -> ...args: unknown[]
  content = content.replace(/\.\.\.args: any\[\]/g, '...args: unknown[]');
  
  // Замена: Promise<any> -> Promise<unknown>
  content = content.replace(/Promise<any>/g, 'Promise<unknown>');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Обновлен файл: ${filePath}`);
    return true;
  }

  return false;
}

function main() {
  console.log('Начинаем замену any на конкретные типы...');
  
  let processedCount = 0;
  
  for (const filePath of filesToProcess) {
    if (processFile(filePath)) {
      processedCount++;
    }
  }
  
  console.log(`Обработано файлов: ${processedCount}`);
  
  // Также обработаем все файлы в src/types если они есть
  const typesDir = 'src/types';
  if (fs.existsSync(typesDir)) {
    const typeFiles = fs.readdirSync(typesDir).filter(f => f.endsWith('.ts'));
    for (const file of typeFiles) {
      const filePath = path.join(typesDir, file);
      if (processFile(filePath)) {
        processedCount++;
      }
    }
  }
  
  console.log(`Всего обработано файлов: ${processedCount}`);
}

if (require.main === module) {
  main();
}

module.exports = { processFile };