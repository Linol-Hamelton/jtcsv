#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'benchmarks', 'independent-suite.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Исправить все обращения к results.property на results['property']
const patterns = [
  { regex: /results\.jtcsv/g, replacement: "results['jtcsv']" },
  { regex: /results\.papaparse/g, replacement: "results['papaparse']" },
  { regex: /results\.csvParser/g, replacement: "results['csvParser']" },
  { regex: /results\.csvtojson/g, replacement: "results['csvtojson']" },
  { regex: /results\.json2csv/g, replacement: "results['json2csv']" },
  { regex: /results\.csvToJson/g, replacement: "results['csvToJson']" },
  { regex: /results\.jsonToCsv/g, replacement: "results['jsonToCsv']" },
  { regex: /results\.streaming/g, replacement: "results['streaming']" },
];

patterns.forEach(({ regex, replacement }) => {
  content = content.replace(regex, replacement);
});

// Исправить объявление results в других методах
content = content.replace(
  /async runJsonToCsvBenchmark\(jsonData: any\[\], libraries: any, iterations: number\): Promise<any> \{\s+const results = \{\};/g,
  "async runJsonToCsvBenchmark(jsonData: any[], libraries: any, iterations: number): Promise<any> {\n    const results: Record<string, any> = {};"
);

content = content.replace(
  /async runStreamingBenchmark\(filePath: string, libraries: any, iterations: number\): Promise<any> \{\s+const results = \{\};/g,
  "async runStreamingBenchmark(filePath: string, libraries: any, iterations: number): Promise<any> {\n    const results: Record<string, any> = {};"
);

// Удалить ошибочный импорт внутри функции
content = content.replace(/\s+import \* as fs from 'fs';/, '');

// Исправить scenarios[scenarioName] на scenarios[scenarioName as keyof typeof scenarios]
content = content.replace(/scenarios\[scenarioName\]/g, 'scenarios[scenarioName as keyof typeof scenarios]');

// Исправить allResults[scenarioName]
content = content.replace(/allResults\[scenarioName\]/g, 'allResults[scenarioName as string]');

// Исправить obj[key] на (obj as any)[key]
content = content.replace(/obj\[key\]/g, '(obj as any)[key]');

// Исправить параметры функций
content = content.replace(/complete: \(results\) => \{/g, 'complete: (results: any) => {');
content = content.replace(/parser\.on\('data', \(data\) => results\.push\(data\)\);/g, "parser.on('data', (data: any) => results.push(data));");

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Исправлены обращения к results и другие TypeScript ошибки');

// Проверим результат
const { execSync } = require('child_process');
try {
  const result = execSync(`npx tsc --noEmit --strict false benchmarks/independent-suite.ts 2>&1`, { encoding: 'utf8' });
  const errorCount = (result.match(/error TS/g) || []).length;
  console.log(`✅ Осталось ошибок TypeScript: ${errorCount}`);
  if (errorCount > 0) {
    console.log(result);
  }
} catch (error) {
  console.log('❌ Ошибки TypeScript:', error.stdout || error.message);
}