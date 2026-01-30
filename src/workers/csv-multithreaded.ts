/**
 * Многопоточная обработка CSV данных
 * 
 * Интеграция Worker Pool с существующими асинхронными функциями
 */

import { getWorkerPool, createWorkerTask } from './worker-pool';
import { CsvToJsonOptions, AsyncCsvToJsonOptions, AnyArray, AnyObject } from '../types';
import { chunkData, createChunkTasks, mergeChunkResults } from './csv-parser.worker';

/**
 * Многопоточная версия csvToJson
 * 
 * @param csv - CSV строка для парсинга
 * @param options - Опции с поддержкой многопоточности
 * @returns Promise с результатом парсинга
 */
export async function csvToJsonMultithreaded(
  csv: string,
  options: AsyncCsvToJsonOptions = {}
): Promise<AnyArray> {
  const {
    useWorkers = true,
    workerCount,
    chunkSize = 1000,
    onProgress,
    ...csvOptions
  } = options;
  
  // Если многопоточность отключена или данные маленькие, используем обычную версию
  if (!useWorkers || csv.length < 10000) {
    const { csvToJson } = await import('../../csv-to-json');
    return csvToJson(csv, csvOptions);
  }
  
  // Разделяем CSV на строки
  const lines = csv.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return [];
  }
  
  // Определяем есть ли заголовки
  const hasHeaders = csvOptions.hasHeaders !== false;
  
  // Разделяем данные на чанки
  let dataChunks: string[][];
  let headers: string[] = [];
  
  if (hasHeaders) {
    headers = lines[0].split(csvOptions.delimiter || ';');
    const dataLines = lines.slice(1);
    dataChunks = chunkData(dataLines, chunkSize);
  } else {
    dataChunks = chunkData(lines, chunkSize);
  }
  
  // Создаем задачи для воркеров
  const tasks = dataChunks.map((chunk, index) => {
    // Восстанавливаем CSV чанк с заголовками если нужно
    let chunkCsv = chunk.join('\n');
    if (hasHeaders && headers.length > 0) {
      chunkCsv = headers.join(csvOptions.delimiter || ';') + '\n' + chunkCsv;
    }
    
    return createWorkerTask('csv_parse', chunkCsv, {
      ...csvOptions,
      chunkIndex: index,
      totalChunks: dataChunks.length,
      hasHeaders: index === 0 ? hasHeaders : false // Только первый чанк получает заголовки
    });
  });
  
  // Получаем пул воркеров
  const workerPool = getWorkerPool(workerCount);
  
  // Отправляем прогресс если есть callback
  if (onProgress) {
    workerPool.on('taskCompleted', ({ task }) => {
      const chunkIndex = task.options?.chunkIndex || 0;
      const totalChunks = task.options?.totalChunks || 1;
      
      onProgress({
        processed: chunkIndex + 1,
        total: totalChunks,
        percentage: Math.round(((chunkIndex + 1) / totalChunks) * 100)
      });
    });
  }
  
  // Выполняем задачи параллельно
  const results = await workerPool.executeTasks(tasks);
  
  // Объединяем результаты
  const mergedResults = mergeChunkResults(results);
  
  return mergedResults;
}

/**
 * Многопоточная версия jsonToCsv
 * 
 * @param data - JSON данные для конвертации
 * @param options - Опции с поддержкой многопоточности
 * @returns Promise с CSV строкой
 */
export async function jsonToCsvMultithreaded(
  data: AnyArray | AnyObject,
  options: any = {} // TODO: Добавить тип AsyncJsonToCsvOptions
): Promise<string> {
  const {
    useWorkers = true,
    workerCount,
    chunkSize = 1000,
    onProgress,
    ...jsonOptions
  } = options;
  
  // Подготавливаем данные
  const dataArray = Array.isArray(data) ? data : [data];
  
  // Если многопоточность отключена или данные маленькие, используем обычную версию
  if (!useWorkers || dataArray.length < 1000) {
    const { jsonToCsv } = await import('../../json-to-csv');
    return jsonToCsv(dataArray, jsonOptions);
  }
  
  // Разделяем данные на чанки
  const dataChunks = chunkData(dataArray, chunkSize);
  
  // Создаем задачи для воркеров
  const tasks = dataChunks.map((chunk, index) => {
    return createWorkerTask('json_to_csv', chunk, {
      ...jsonOptions,
      chunkIndex: index,
      totalChunks: dataChunks.length,
      includeHeaders: index === 0 // Только первый чанк включает заголовки
    });
  });
  
  // Получаем пул воркеров
  const workerPool = getWorkerPool(workerCount);
  
  // Отправляем прогресс если есть callback
  if (onProgress) {
    workerPool.on('taskCompleted', ({ task }) => {
      const chunkIndex = task.options?.chunkIndex || 0;
      const totalChunks = task.options?.totalChunks || 1;
      
      onProgress({
        processed: chunkIndex + 1,
        total: totalChunks,
        percentage: Math.round(((chunkIndex + 1) / totalChunks) * 100)
      });
    });
  }
  
  // Выполняем задачи параллельно
  const results = await workerPool.executeTasks(tasks);
  
  // Объединяем CSV чанки
  let finalCsv = '';
  
  for (let i = 0; i < results.length; i++) {
    const chunkCsv = results[i];
    
    if (i === 0) {
      // Первый чанк включает заголовки
      finalCsv = chunkCsv;
    } else {
      // Последующие чанки - только данные (убираем первую строку если это заголовки)
      const lines = chunkCsv.split('\n');
      if (lines.length > 1 && jsonOptions.includeHeaders !== false) {
        finalCsv += '\n' + lines.slice(1).join('\n');
      } else {
        finalCsv += '\n' + chunkCsv;
      }
    }
  }
  
  return finalCsv;
}

/**
 * Бенчмарк многопоточной обработки
 * 
 * @param data - Данные для тестирования
 * @param iterations - Количество итераций
 * @returns Результаты бенчмарка
 */
export async function benchmarkMultithreaded(
  data: AnyArray | string,
  iterations: number = 10
): Promise<{
  singleThread: number;
  multiThread: number;
  speedup: number;
  efficiency: number;
}> {
  const workerPool = getWorkerPool();
  const cpuCount = require('os').cpus().length;
  
  // Тестируем однопоточную обработку
  const singleThreadStart = Date.now();
  
  if (typeof data === 'string') {
    // CSV парсинг
    const { csvToJson } = await import('../../csv-to-json');
    for (let i = 0; i < iterations; i++) {
      await csvToJson(data);
    }
  } else {
    // JSON to CSV
    const { jsonToCsv } = await import('../../json-to-csv');
    for (let i = 0; i < iterations; i++) {
      await jsonToCsv(data);
    }
  }
  
  const singleThreadTime = Date.now() - singleThreadStart;
  
  // Тестируем многопоточную обработку
  const multiThreadStart = Date.now();
  
  if (typeof data === 'string') {
    for (let i = 0; i < iterations; i++) {
      await csvToJsonMultithreaded(data, {
        useWorkers: true,
        workerCount: cpuCount - 1
      });
    }
  } else {
    for (let i = 0; i < iterations; i++) {
      await jsonToCsvMultithreaded(data, {
        useWorkers: true,
        workerCount: cpuCount - 1
      });
    }
  }
  
  const multiThreadTime = Date.now() - multiThreadStart;
  
  // Вычисляем ускорение и эффективность
  const speedup = singleThreadTime / multiThreadTime;
  const efficiency = (speedup / (cpuCount - 1)) * 100;
  
  return {
    singleThread: singleThreadTime,
    multiThread: multiThreadTime,
    speedup,
    efficiency
  };
}

/**
 * Оптимизирует размер чанка на основе размера данных
 * 
 * @param dataSize - Размер данных (количество строк или байт)
 * @param workerCount - Количество воркеров
 * @returns Оптимальный размер чанка
 */
export function optimizeChunkSize(
  dataSize: number,
  workerCount: number = Math.max(1, require('os').cpus().length - 1)
): number {
  // Базовый размер чанка
  let chunkSize = 1000;
  
  if (dataSize > 1000000) {
    // Очень большие данные - увеличиваем размер чанка
    chunkSize = 10000;
  } else if (dataSize > 100000) {
    // Большие данные
    chunkSize = 5000;
  } else if (dataSize > 10000) {
    // Средние данные
    chunkSize = 2000;
  } else if (dataSize < 1000) {
    // Маленькие данные - уменьшаем размер чанка
    chunkSize = Math.max(100, Math.ceil(dataSize / workerCount));
  }
  
  // Учитываем количество воркеров
  chunkSize = Math.max(chunkSize, Math.ceil(dataSize / (workerCount * 10)));
  
  return chunkSize;
}

/**
 * Мониторинг использования ресурсов
 * 
 * @returns Статистика использования ресурсов
 */
export function getResourceUsage(): {
  cpuUsage: NodeJS.CpuUsage;
  memoryUsage: NodeJS.MemoryUsage;
  workerStats: any;
} {
  const cpuUsage = process.cpuUsage();
  const memoryUsage = process.memoryUsage();
  
  const workerPool = getWorkerPool();
  const workerStats = workerPool.getStats();
  
  return {
    cpuUsage,
    memoryUsage,
    workerStats
  };
}