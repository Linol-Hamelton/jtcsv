#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', 'packages', 'jtcsv-validator', 'src', 'index.js');
const targetFile = path.join(__dirname, '..', 'packages', 'jtcsv-validator', 'src', 'index.ts');

let content = fs.readFileSync(sourceFile, 'utf8');

// 1. Заменить require на import
content = content.replace(/const jtcsv = require\('\.\.\/\.\.\/\.\.\/index\.js'\);/g, "import * as jtcsv from '../../../index.js';");

// 2. Добавить типы для функций
content = content.replace(/function validateCsv\(csvString, options\) \{/g, "function validateCsv(csvString: string, options: any): any {");
content = content.replace(/function validateJson\(jsonData, options\) \{/g, "function validateJson(jsonData: any, options: any): any {");
content = content.replace(/function validateSchema\(data, schema\) \{/g, "function validateSchema(data: any, schema: any): any {");
content = content.replace(/function validateFile\(filePath, options\) \{/g, "function validateFile(filePath: string, options: any): Promise<any> {");
content = content.replace(/async function validateFileAsync\(filePath, options\) \{/g, "async function validateFileAsync(filePath: string, options: any): Promise<any> {");

// 3. Добавить типы для методов класса
content = content.replace(/class CsvValidator \{/g, "class CsvValidator {");
content = content.replace(/constructor\(options\) \{/g, "constructor(options: any) {");
content = content.replace(/validate\(csvString\) \{/g, "validate(csvString: string): any {");
content = content.replace(/validateFile\(filePath\) \{/g, "validateFile(filePath: string): Promise<any> {");

// 4. Добавить типы для вложенных функций
content = content.replace(/function checkDelimiter\(csvString\) \{/g, "function checkDelimiter(csvString: string): any {");
content = content.replace(/function checkLineEndings\(csvString\) \{/g, "function checkLineEndings(csvString: string): any {");
content = content.replace(/function checkQuoting\(csvString\) \{/g, "function checkQuoting(csvString: string): any {");
content = content.replace(/function checkEncoding\(csvString\) \{/g, "function checkEncoding(csvString: string): any {");

// 5. Обновить обработку ошибок
content = content.replace(/catch \(error\) \{/g, "catch (error: any) {");

// 6. Добавить типы для переменных
content = content.replace(/const lines = csvString\.split\(/g, "const lines: string[] = csvString.split(");
content = content.replace(/const result = \{/g, "const result: any = {");

// 7. Добавить экспорт типов
content = content.replace(/module\.exports = \{/g, "export {");
content = content.replace(/validateCsv,/g, "validateCsv,");
content = content.replace(/validateJson,/g, "validateJson,");
content = content.replace(/validateSchema,/g, "validateSchema,");
content = content.replace(/validateFile,/g, "validateFile,");
content = content.replace(/validateFileAsync,/g, "validateFileAsync,");
content = content.replace(/CsvValidator/g, "CsvValidator");

// 8. Добавить default export
content += "\n\nexport default {\n  validateCsv,\n  validateJson,\n  validateSchema,\n  validateFile,\n  validateFileAsync,\n  CsvValidator\n};";

fs.writeFileSync(targetFile, content, 'utf8');
console.log(`✅ Конвертирован ${sourceFile} -> ${targetFile}`);

// Проверим TypeScript ошибки
const { execSync } = require('child_process');
try {
  const result = execSync(`npx tsc --noEmit --strict false packages/jtcsv-validator/src/index.ts 2>&1`, { encoding: 'utf8' });
  const errorCount = (result.match(/error TS/g) || []).length;
  console.log(`✅ Проверка TypeScript: ${errorCount} ошибок`);
  if (errorCount > 0 && errorCount < 10) {
    console.log(result);
  }
} catch (error) {
  console.log('❌ Ошибки TypeScript:', error.stdout?.slice(0, 500) || error.message?.slice(0, 500));
}