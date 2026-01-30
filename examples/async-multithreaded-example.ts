/**
 * Пример использования асинхронных многопоточных функций jtcsv
 * 
 * Демонстрация:
 * 1. Асинхронные версии функций
 * 2. Многопоточная обработка через Worker Pool
 * 3. Оптимизация производительности
 */

import { 
  csvToJson, 
  csvToJsonAsync,
  jsonToCsv,
  jsonToCsvAsync,
  saveAsJsonAsync,
  streamCsvToJsonAsync,
  streamJsonToCsvAsync,
  JtcsvError,
  ValidationError
} from '../index-core';

import {
  csvToJsonMultithreaded,
  jsonToCsvMultithreaded,
  benchmarkMultithreaded,
  optimizeChunkSize,
  getResourceUsage
} from '../src/workers/csv-multithreaded';

/**
 * Пример 1: Базовое асинхронное использование
 */
async function exampleBasicAsync() {
  console.log('=== Пример 1: Базовое асинхронное использование ===\n');
  
  // Создаем тестовые данные
  const testData = [
    { id: 1, name: 'Alice', age: 30, email: 'alice@example.com' },
    { id: 2, name: 'Bob', age: 25, email: 'bob@example.com' },
    { id: 3, name: 'Charlie', age: 35, email: 'charlie@example.com' }
  ];
  
  // 1. Конвертация JSON в CSV (асинхронно)
  console.log('1. Конвертация JSON в CSV (асинхронно):');
  const csv = await jsonToCsvAsync(testData, {
    delimiter: ',',
    includeHeaders: true,
    onProgress: (progress) => {
      console.log(`  Прогресс: ${progress.percentage}% (${progress.processed}/${progress.total})`);
    }
  });
  console.log(`Результат:\n${csv}\n`);
  
  // 2. Конвертация CSV в JSON (асинхронно)
  console.log('2. Конвертация CSV в JSON (асинхронно):');
  const json = await csvToJsonAsync(csv, {
    delimiter: ',',
    hasHeaders: true,
    parseNumbers: true,
    onProgress: (progress) => {
      console.log(`  Прогресс: ${progress.percentage}% (${progress.processed}/${progress.total})`);
    }
  });
  console.log(`Результат:`, JSON.stringify(json, null, 2), '\n');
  
  // 3. Сохранение JSON в файл (асинхронно)
  console.log('3. Сохранение JSON в файл (асинхронно):');
  try {
    await saveAsJsonAsync(testData, './test-output.json', {
      prettyPrint: true,
      maxSize: 1024 * 1024 // 1MB
    });
    console.log('  Файл успешно сохранен: ./test-output.json\n');
  } catch (error) {
    if (error instanceof JtcsvError) {
      console.log(`  Ошибка сохранения: ${error.message}\n`);
    }
  }
}

/**
 * Пример 2: Многопоточная обработка больших данных
 */
async function exampleMultithreaded() {
  console.log('=== Пример 2: Многопоточная обработка больших данных ===\n');
  
  // Создаем большой CSV файл для тестирования
  const largeCsv = generateLargeCsv(10000);
  
  console.log('Размер данных:', formatBytes(largeCsv.length));
  console.log('Количество строк: 10,000\n');
  
  // 1. Однопоточная обработка
  console.log('1. Однопоточная обработка:');
  const singleThreadStart = Date.now();
  const singleThreadResult = await csvToJsonAsync(largeCsv, {
    delimiter: ',',
    hasHeaders: true,
    useWorkers: false // Отключаем многопоточность
  });
  const singleThreadTime = Date.now() - singleThreadStart;
  console.log(`  Время выполнения: ${singleThreadTime}ms\n`);
  
  // 2. Многопоточная обработка
  console.log('2. Многопоточная обработка:');
  const multiThreadStart = Date.now();
  const multiThreadResult = await csvToJsonMultithreaded(largeCsv, {
    delimiter: ',',
    hasHeaders: true,
    useWorkers: true,
    workerCount: 4, // Используем 4 worker'а
    chunkSize: optimizeChunkSize(10000, 4),
    onProgress: (progress) => {
      process.stdout.write(`\r  Прогресс: ${progress.percentage}% (${progress.processed}/${progress.total})`);
    }
  });
  const multiThreadTime = Date.now() - multiThreadStart;
  console.log(`\n  Время выполнения: ${multiThreadTime}ms`);
  console.log(`  Ускорение: ${(singleThreadTime / multiThreadTime).toFixed(2)}x\n`);
  
  // 3. Бенчмарк производительности
  console.log('3. Бенчмарк производительности:');
  const benchmark = await benchmarkMultithreaded(largeCsv, 5);
  console.log(`  Однопоточное время: ${benchmark.singleThread}ms`);
  console.log(`  Многопоточное время: ${benchmark.multiThread}ms`);
  console.log(`  Ускорение: ${benchmark.speedup.toFixed(2)}x`);
  console.log(`  Эффективность: ${benchmark.efficiency.toFixed(1)}%\n`);
  
  // 4. Мониторинг ресурсов
  console.log('4. Мониторинг ресурсов:');
  const resources = getResourceUsage();
  console.log(`  Использование памяти:`, formatBytes(resources.memoryUsage.heapUsed));
  console.log(`  Всего worker'ов: ${resources.workerStats.totalWorkers}`);
  console.log(`  Активных worker'ов: ${resources.workerStats.activeWorkers}`);
  console.log(`  Выполнено задач: ${resources.workerStats.completedTasks}\n`);
}

/**
 * Пример 3: Streaming с асинхронной обработкой
 */
async function exampleStreaming() {
  console.log('=== Пример 3: Streaming с асинхронной обработкой ===\n');
  
  // Создаем большой массив данных
  const largeData = generateLargeJson(5000);
  
  console.log('Размер данных:', largeData.length, 'записей\n');
  
  // 1. Streaming конвертация JSON в CSV
  console.log('1. Streaming конвертация JSON в CSV:');
  const csvStream = await streamJsonToCsvAsync(largeData, {
    delimiter: ',',
    includeHeaders: true,
    bufferSize: 1024 * 64 // 64KB буфер
  });
  
  let csvChunks: string[] = [];
  for await (const chunk of csvStream) {
    csvChunks.push(chunk);
    process.stdout.write(`\r  Получено чанков: ${csvChunks.length}, размер: ${formatBytes(chunk.length)}`);
  }
  console.log(`\n  Общий размер CSV: ${formatBytes(csvChunks.join('').length)}\n`);
  
  // 2. Streaming конвертация CSV в JSON
  console.log('2. Streaming конвертация CSV в JSON:');
  const csvData = csvChunks.join('');
  const jsonStream = await streamCsvToJsonAsync(csvData, {
    delimiter: ',',
    hasHeaders: true,
    bufferSize: 1024 * 64
  });
  
  let jsonRecords = 0;
  for await (const record of jsonStream) {
    jsonRecords++;
    if (jsonRecords % 1000 === 0) {
      process.stdout.write(`\r  Обработано записей: ${jsonRecords}`);
    }
  }
  console.log(`\n  Всего обработано записей: ${jsonRecords}\n`);
}

/**
 * Пример 4: Обработка ошибок и валидация
 */
async function exampleErrorHandling() {
  console.log('=== Пример 4: Обработка ошибок и валидация ===\n');
  
  // 1. Некорректные данные
  console.log('1. Обработка некорректных данных:');
  try {
    await csvToJsonAsync('invalid,csv\n1,2,3\n4,5', {
      delimiter: ',',
      hasHeaders: true
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`  Поймана ValidationError: ${error.message}`);
    } else if (error instanceof JtcsvError) {
      console.log(`  Поймана JtcsvError: ${error.message} (код: ${error.code})`);
    }
  }
  console.log();
  
  // 2. Безопасное выполнение с обработкой ошибок
  console.log('2. Безопасное выполнение:');
  const result = await csvToJsonAsync('id,name\n1,Alice\n2,Bob', {
    delimiter: ',',
    hasHeaders: true,
    maxRows: 1 // Ограничиваем количество строк
  }).catch(error => {
    console.log(`  Ошибка обработана: ${error.message}`);
    return [];
  });
  console.log(`  Результат: ${result.length} записей\n`);
  
  // 3. Валидация путей файлов
  console.log('3. Валидация путей файлов:');
  try {
    // Попытка сохранить в системную директорию
    await saveAsJsonAsync([{ test: 'data' }], 'C:\\Windows\\test.json', {
      validatePath: true
    });
  } catch (error) {
    if (error instanceof SecurityError) {
      console.log(`  Поймана SecurityError: ${error.message}`);
    }
  }
}

/**
 * Генератор большого CSV файла
 */
function generateLargeCsv(rows: number): string {
  const headers = ['id', 'name', 'email', 'age', 'salary', 'department', 'join_date', 'active'];
  let csv = headers.join(',') + '\n';
  
  for (let i = 1; i <= rows; i++) {
    const row = [
      i,
      `User${i}`,
      `user${i}@example.com`,
      Math.floor(Math.random() * 50) + 20,
      Math.floor(Math.random() * 100000) + 30000,
      ['Engineering', 'Marketing', 'Sales', 'HR'][Math.floor(Math.random() * 4)],
      `2023-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      Math.random() > 0.5 ? 'true' : 'false'
    ];
    csv += row.join(',') + '\n';
  }
  
  return csv;
}

/**
 * Генератор большого JSON массива
 */
function generateLargeJson(rows: number): any[] {
  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];
  const data = [];
  
  for (let i = 1; i <= rows; i++) {
    data.push({
      id: i,
      name: `User${i}`,
      email: `user${i}@example.com`,
      age: Math.floor(Math.random() * 50) + 20,
      salary: Math.floor(Math.random() * 100000) + 30000,
      department: departments[Math.floor(Math.random() * departments.length)],
      join_date: `2023-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      active: Math.random() > 0.5,
      metadata: {
        level: Math.floor(Math.random() * 5) + 1,
        skills: ['JavaScript', 'TypeScript', 'Node.js'].slice(0, Math.floor(Math.random() * 3) + 1)
      }
    });
  }
  
  return data;
}

/**
 * Форматирование байтов в читаемый вид
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Основная функция
 */
async function main() {
  console.log('🚀 ДЕМОНСТРАЦИЯ АСИНХРОННЫХ МНОГОПОТОЧНЫХ ФУНКЦИЙ JTCSV\n');
  console.log('='.repeat(80) + '\n');
  
  try {
    await exampleBasicAsync();
    await exampleMultithreaded();
    await exampleStreaming();
    await exampleErrorHandling();
    
    console.log('='.repeat(80));
    console.log('\n✅ Все примеры успешно выполнены!');
    console.log('\n📊 ИТОГИ:');
    console.log('  • Реализованы асинхронные версии всех основных функций');
    console.log('  • Создана система Worker Pool для многопоточной обработки');
    console.log('  • Добавлена оптимизация размера чанков и мониторинг ресурсов');
    console.log('  • Сохранена обратная совместимость с синхронным API');
    console.log('  • Улучшена производительность для больших данных');
    
  } catch (error) {
    console.error('\n❌ Ошибка выполнения примеров:', error);
    process.exit(1);
  }
}

// Запуск демонстрации
if (require.main === module) {
  main().catch(console.error);
}

export {
  exampleBasicAsync,
  exampleMultithreaded,
  exampleStreaming,
  exampleErrorHandling,
  generateLargeCsv,
  generateLargeJson
};