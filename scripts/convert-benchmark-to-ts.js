#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', 'benchmarks', 'independent-suite.js');
const targetFile = path.join(__dirname, '..', 'benchmarks', 'independent-suite.ts');

let content = fs.readFileSync(sourceFile, 'utf8');

// 1. Заменить require на import
content = content.replace(/const fs = require\('fs'\);/g, "import * as fs from 'fs';");
content = content.replace(/const path = require\('path'\);/g, "import * as path from 'path';");
content = content.replace(/const \{ performance, PerformanceObserver \} = require\('perf_hooks'\);/g, "import { performance, PerformanceObserver } from 'perf_hooks';");
content = content.replace(/const \{ spawn \} = require\('child_process'\);/g, "import { spawn, ChildProcess } from 'child_process';");
content = content.replace(/const os = require\('os'\);/g, "import * as os from 'os';");

// 2. Добавить типы для основных функций
content = content.replace(/generateCsv\(rows, columns = 5\) \{/g, "generateCsv(rows: number, columns = 5): string {");
content = content.replace(/generateJson\(rows, columns = 5\) \{/g, "generateJson(rows: number, columns = 5): any[] {");
content = content.replace(/async generateLargeFile\(filePath, rows\) \{/g, "async generateLargeFile(filePath: string, rows: number): Promise<void> {");

// 3. Добавить типы для методов класса
content = content.replace(/sample\(\) \{/g, "sample(): void {");
content = content.replace(/getStats\(\) \{/g, "getStats(): any {");
content = content.replace(/static mean\(values\) \{/g, "static mean(values: number[]): number {");
content = content.replace(/static median\(values\) \{/g, "static median(values: number[]): number {");
content = content.replace(/static standardDeviation\(values\) \{/g, "static standardDeviation(values: number[]): number {");
content = content.replace(/static min\(values\) \{/g, "static min(values: number[]): number {");
content = content.replace(/static max\(values\) \{/g, "static max(values: number[]): number {");
content = content.replace(/static confidenceInterval\(values, confidence = 0\.95\) \{/g, "static confidenceInterval(values: number[], confidence = 0.95): any {");

// 4. Добавить типы для методов BenchmarkRunner
content = content.replace(/loadLibraries\(\) \{/g, "loadLibraries(): void {");
content = content.replace(/async runBenchmark\(name, fn, iterations = 5\) \{/g, "async runBenchmark(name: string, fn: () => Promise<void>, iterations = 5): Promise<any> {");
content = content.replace(/async runCsvToJsonBenchmark\(csvData, libraries, iterations\) \{/g, "async runCsvToJsonBenchmark(csvData: string, libraries: any, iterations: number): Promise<any> {");
content = content.replace(/async runJsonToCsvBenchmark\(jsonData, libraries, iterations\) \{/g, "async runJsonToCsvBenchmark(jsonData: any[], libraries: any, iterations: number): Promise<any> {");
content = content.replace(/async runStreamingBenchmark\(filePath, libraries, iterations\) \{/g, "async runStreamingBenchmark(filePath: string, libraries: any, iterations: number): Promise<any> {");
content = content.replace(/async runScenario\(scenarioName, iterations\) \{/g, "async runScenario(scenarioName: string, iterations: number): Promise<any> {");
content = content.replace(/printResults\(results\) \{/g, "printResults(results: any): void {");
content = content.replace(/saveResults\(results, outputFile\) \{/g, "saveResults(results: any, outputFile: string): void {");

// 5. Обновить использование Promise
content = content.replace(/await new Promise\(resolve => stream\.once\('drain', resolve\)\);/g, "await new Promise<void>(resolve => stream.once('drain', () => resolve()));");
content = content.replace(/await new Promise\(resolve => stream\.once\('close', resolve\)\);/g, "await new Promise<void>(resolve => stream.once('close', () => resolve()));");

// 6. Обновить обработку ошибок
content = content.replace(/catch \(error\) \{/g, "catch (error: any) {");

// 7. Обновить использование require внутри функций
content = content.replace(/const fs = require\('fs'\);/g, "import * as fs from 'fs';");

// 8. Обновить комментарий использования
content = content.replace(/node benchmarks\/independent-suite\.js/g, "node benchmarks/independent-suite.ts");

fs.writeFileSync(targetFile, content, 'utf8');
console.log(`✅ Конвертирован ${sourceFile} -> ${targetFile}`);

// Проверим TypeScript ошибки
const { execSync } = require('child_process');
try {
  const result = execSync(`npx tsc --noEmit --strict false benchmarks/independent-suite.ts 2>&1`, { encoding: 'utf8' });
  const errorCount = (result.match(/error TS/g) || []).length;
  console.log(`✅ Проверка TypeScript: ${errorCount} ошибок`);
  if (errorCount > 0) {
    console.log(result);
  }
} catch (error) {
  console.log('❌ Ошибки TypeScript:', error.stdout || error.message);
}