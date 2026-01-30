#!/usr/bin/env node

/**
 * Скрипт для проверки прогресса миграции на TypeScript
 */

import fs from "fs";
import path from "path";

// Конфигурация проверки
const CONFIG = {
  // Директории для проверки
  directories: [
    '.', // корневая директория
    'src',
    'src/core',
    'src/engines',
    'src/formats',
    'src/utils',
    'src/browser',
    'src/browser/extensions',
    'src/browser/workers',
    'plugins/express-middleware',
    'plugins/fastify-plugin',
    'plugins/nextjs-api',
    'plugins/nestjs',
    'plugins/remix',
    'plugins/sveltekit',
    'plugins/hono',
    'plugins/trpc',
    'plugins/nuxt'
  ],
  
  // Расширения файлов для проверки
  jsExtensions: ['.js', '.jsx'],
  tsExtensions: ['.ts', '.tsx'],
  
  // Игнорируемые файлы и директории
  ignorePatterns: [
    'node_modules',
    'dist',
    'dist-types',
    'coverage',
    'coverage-ts',
    '__tests__',
    '__mocks__',
    '*.test.js',
    '*.spec.js',
    '*.test.ts',
    '*.spec.ts',
    '*.d.ts'
  ]
};

// Результаты проверки
const results = {
  totalJsFiles: 0,
  totalTsFiles: 0,
  convertedFiles: [],
  pendingFiles: [],
  byDirectory: {}
};

/**
 * Проверяет, нужно ли игнорировать файл
 */
function shouldIgnoreFile(filePath) {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  
  // Проверка паттернов игнорирования
  for (const pattern of CONFIG.ignorePatterns) {
    if (pattern.includes('*')) {
      // Паттерн с wildcard
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(fileName) || regex.test(filePath)) {
        return true;
      }
    } else if (fileName === pattern || dirName.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Проверяет, есть ли TypeScript версия для JavaScript файла
 */
function hasTypeScriptVersion(jsFilePath) {
  const dir = path.dirname(jsFilePath);
  const baseName = path.basename(jsFilePath, '.js');
  
  // Проверяем существование .ts файла
  const tsFilePath = path.join(dir, `${baseName}.ts`);
  if (fs.existsSync(tsFilePath)) {
    return tsFilePath;
  }
  
  // Проверяем существование .tsx файла
  const tsxFilePath = path.join(dir, `${baseName}.tsx`);
  if (fs.existsSync(tsxFilePath)) {
    return tsxFilePath;
  }
  
  return null;
}

/**
 * Рекурсивно сканирует директорию
 */
function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (shouldIgnoreFile(fullPath)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      
      if (CONFIG.jsExtensions.includes(ext)) {
        results.totalJsFiles++;
        
        const tsVersion = hasTypeScriptVersion(fullPath);
        if (tsVersion) {
          results.convertedFiles.push({
            js: fullPath,
            ts: tsVersion,
            status: 'converted'
          });
        } else {
          results.pendingFiles.push({
            js: fullPath,
            status: 'pending'
          });
        }
        
        // Записываем статистику по директории
        const relativeDir = path.relative(process.cwd(), path.dirname(fullPath));
        if (!results.byDirectory[relativeDir]) {
          results.byDirectory[relativeDir] = {
            jsFiles: 0,
            tsFiles: 0,
            converted: 0,
            pending: 0
          };
        }
        
        results.byDirectory[relativeDir].jsFiles++;
        if (tsVersion) {
          results.byDirectory[relativeDir].converted++;
        } else {
          results.byDirectory[relativeDir].pending++;
        }
      } else if (CONFIG.tsExtensions.includes(ext)) {
        results.totalTsFiles++;
        
        // Записываем статистику по директории
        const relativeDir = path.relative(process.cwd(), path.dirname(fullPath));
        if (!results.byDirectory[relativeDir]) {
          results.byDirectory[relativeDir] = {
            jsFiles: 0,
            tsFiles: 0,
            converted: 0,
            pending: 0
          };
        }
        
        results.byDirectory[relativeDir].tsFiles++;
      }
    }
  }
}

/**
 * Выводит результаты в консоль
 */
function printResults() {
  console.log('='.repeat(80));
  console.log('ПРОВЕРКА ПРОГРЕССА МИГРАЦИИ НА TYPESCRIPT');
  console.log('='.repeat(80));
  console.log();
  
  // Общая статистика
  const totalFiles = results.totalJsFiles + results.totalTsFiles;
  const conversionRate = results.totalJsFiles > 0 
    ? (results.convertedFiles.length / results.totalJsFiles * 100).toFixed(1)
    : 0;
  
  console.log('📊 ОБЩАЯ СТАТИСТИКА:');
  console.log(`   Всего JavaScript файлов: ${results.totalJsFiles}`);
  console.log(`   Всего TypeScript файлов: ${results.totalTsFiles}`);
  console.log(`   Конвертировано файлов: ${results.convertedFiles.length}`);
  console.log(`   Осталось конвертировать: ${results.pendingFiles.length}`);
  console.log(`   Процент конвертации: ${conversionRate}%`);
  console.log();
  
  // Статистика по директориям
  console.log('📁 СТАТИСТИКА ПО ДИРЕКТОРИЯМ:');
  console.log();
  
  const sortedDirs = Object.keys(results.byDirectory).sort();
  for (const dir of sortedDirs) {
    const stats = results.byDirectory[dir];
    const dirConversionRate = stats.jsFiles > 0 
      ? (stats.converted / stats.jsFiles * 100).toFixed(1)
      : 0;
    
    console.log(`   ${dir || '(корневая)'}:`);
    console.log(`     JS файлов: ${stats.jsFiles}`);
    console.log(`     TS файлов: ${stats.tsFiles}`);
    console.log(`     Конвертировано: ${stats.converted}`);
    console.log(`     Осталось: ${stats.pending}`);
    console.log(`     Прогресс: ${dirConversionRate}%`);
    console.log();
  }
  
  // Список конвертированных файлов
  if (results.convertedFiles.length > 0) {
    console.log('✅ КОНВЕРТИРОВАННЫЕ ФАЙЛЫ:');
    results.convertedFiles.forEach(file => {
      console.log(`   ✓ ${path.relative(process.cwd(), file.js)} → ${path.relative(process.cwd(), file.ts)}`);
    });
    console.log();
  }
  
  // Список файлов для конвертации
  if (results.pendingFiles.length > 0) {
    console.log('⏳ ФАЙЛЫ ДЛЯ КОНВЕРТАЦИИ:');
    results.pendingFiles.forEach(file => {
      console.log(`   ○ ${path.relative(process.cwd(), file.js)}`);
    });
    console.log();
  }
  
  // Рекомендации
  console.log('💡 РЕКОМЕНДАЦИИ:');
  
  if (results.pendingFiles.length > 0) {
    // Группируем файлы по приоритету
    const priorityFiles = results.pendingFiles.filter(file => {
      const fileName = path.basename(file.js);
      return [
        'json-to-csv.js',
        'csv-to-json.js',
        'index.js',
        'index-core.js'
      ].includes(fileName);
    });
    
    const coreFiles = results.pendingFiles.filter(file => 
      file.js.includes('src/core/')
    );
    
    const engineFiles = results.pendingFiles.filter(file => 
      file.js.includes('src/engines/')
    );
    
    if (priorityFiles.length > 0) {
      console.log('   1. Начните с основных модулей:');
      priorityFiles.forEach(file => {
        console.log(`      - ${path.relative(process.cwd(), file.js)}`);
      });
    }
    
    if (coreFiles.length > 0) {
      console.log('   2. Затем конвертируйте ядро:');
      coreFiles.slice(0, 3).forEach(file => {
        console.log(`      - ${path.relative(process.cwd(), file.js)}`);
      });
      if (coreFiles.length > 3) {
        console.log(`      ... и еще ${coreFiles.length - 3} файлов`);
      }
    }
  } else {
    console.log('   🎉 Все файлы конвертированы!');
  }
  
  console.log();
  console.log('='.repeat(80));
}

/**
 * Генерирует отчет в формате JSON
 */
function generateJsonReport() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalJsFiles: results.totalJsFiles,
      totalTsFiles: results.totalTsFiles,
      convertedFiles: results.convertedFiles.length,
      pendingFiles: results.pendingFiles.length,
      conversionRate: results.totalJsFiles > 0 
        ? (results.convertedFiles.length / results.totalJsFiles * 100)
        : 0
    },
    byDirectory: results.byDirectory,
    convertedFiles: results.convertedFiles.map(f => ({
      js: path.relative(process.cwd(), f.js),
      ts: path.relative(process.cwd(), f.ts)
    })),
    pendingFiles: results.pendingFiles.map(f => ({
      js: path.relative(process.cwd(), f.js)
    }))
  };
  
  const reportPath = path.join(process.cwd(), 'migration-progress-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Отчет сохранен в: ${reportPath}`);
}

// Основная функция
function main() {
  console.log('🔍 Сканирование проекта...');
  console.log();
  
  // Сканируем все директории
  for (const dir of CONFIG.directories) {
    if (fs.existsSync(dir)) {
      scanDirectory(dir);
    }
  }
  
  // Выводим результаты
  printResults();
  
  // Генерируем JSON отчет
  generateJsonReport();
  
  // Возвращаем код выхода
  const exitCode = results.pendingFiles.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

// Запуск
if (require.main === module) {
  main();
}

export default {
  scanDirectory,
  printResults,
  generateJsonReport,
  results
};