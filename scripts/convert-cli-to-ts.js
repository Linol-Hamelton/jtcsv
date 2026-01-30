#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', 'bin', 'jtcsv.js');
const targetFile = path.join(__dirname, '..', 'bin', 'jtcsv.ts');

let content = fs.readFileSync(sourceFile, 'utf8');

// 1. Заменить require на import
content = content.replace(/const fs = require\('fs'\);/g, "import * as fs from 'fs';");
content = content.replace(/const path = require\('path'\);/g, "import * as path from 'path';");
content = content.replace(/const \{ spawn \} = require\('child_process'\);/g, "import { spawn } from 'child_process';");
content = content.replace(/const readline = require\('readline'\);/g, "import * as readline from 'readline';");

// 2. Заменить require для jtcsv
content = content.replace(/const jtcsv = require\('\.\.\/index\.js'\);/g, "import * as jtcsv from '../index.js';");

// 3. Добавить типы для основных функций
content = content.replace(/function showHelp\(\) \{/g, "function showHelp(): void {");
content = content.replace(/function showVersion\(\) \{/g, "function showVersion(): void {");
content = content.replace(/function parseArguments\(args\) \{/g, "function parseArguments(args: string[]): any {");
content = content.replace(/function validateOptions\(options\) \{/g, "function validateOptions(options: any): void {");
content = content.replace(/async function processFile\(options\) \{/g, "async function processFile(options: any): Promise<void> {");
content = content.replace(/async function processStdin\(options\) \{/g, "async function processStdin(options: any): Promise<void> {");
content = content.replace(/function formatOutput\(data, options\) \{/g, "function formatOutput(data: any, options: any): string {");
content = content.replace(/function handleError\(error, options\) \{/g, "function handleError(error: any, options: any): void {");

// 4. Добавить типы для обработчиков событий
content = content.replace(/rl\.on\('line', \(line\) => \{/g, "rl.on('line', (line: string) => {");
content = content.replace(/stream\.on\('data', \(chunk\) => \{/g, "stream.on('data', (chunk: Buffer) => {");

// 5. Обновить обработку ошибок
content = content.replace(/catch \(error\) \{/g, "catch (error: any) {");

// 6. Добавить типы для переменных
content = content.replace(/let input = '';/g, "let input: string = '';");
content = content.replace(/const chunks = \[\];/g, "const chunks: Buffer[] = [];");

// 7. Обновить использование Promise
content = content.replace(/await new Promise\(resolve => stream\.on\('end', resolve\)\);/g, "await new Promise<void>(resolve => stream.on('end', () => resolve()));");
content = content.replace(/await new Promise\(resolve => setTimeout\(resolve, 100\)\);/g, "await new Promise<void>(resolve => setTimeout(resolve, 100));");

// 8. Обновить main функцию
content = content.replace(/async function main\(\) \{/g, "async function main(): Promise<void> {");

fs.writeFileSync(targetFile, content, 'utf8');
console.log(`✅ Конвертирован ${sourceFile} -> ${targetFile}`);

// Проверим TypeScript ошибки
const { execSync } = require('child_process');
try {
  const result = execSync(`npx tsc --noEmit --strict false bin/jtcsv.ts 2>&1`, { encoding: 'utf8' });
  const errorCount = (result.match(/error TS/g) || []).length;
  console.log(`✅ Проверка TypeScript: ${errorCount} ошибок`);
  if (errorCount > 0 && errorCount < 20) {
    console.log(result);
  } else if (errorCount >= 20) {
    console.log(`⚠️  Слишком много ошибок (${errorCount}), показываю первые 5:`);
    const lines = result.split('\n').filter(line => line.includes('error TS')).slice(0, 5);
    lines.forEach(line => console.log(line));
  }
} catch (error) {
  console.log('❌ Ошибки TypeScript:', error.stdout?.slice(0, 500) || error.message?.slice(0, 500));
}