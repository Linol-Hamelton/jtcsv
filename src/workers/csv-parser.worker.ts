/**
 * Worker для парсинга CSV данных
 * 
 * Выполняется в отдельном потоке для многопоточной обработки
 */

import { parentPort, workerData, isMainThread } from 'worker_threads';
import { WorkerTask, WorkerResult } from '../types';

// Импортируем функции парсинга из основных модулей
// Используем динамический импорт чтобы избежать циклических зависимостей
let csvToJson: any = null;
let jsonToCsv: any = null;

/**
 * Инициализирует функции парсинга
 */
async function initializeParserFunctions(): Promise<void> {
  if (!csvToJson) {
    // Динамический импорт чтобы избежать проблем с циклическими зависимостями
    const csvModule = await import('../../csv-to-json');
    csvToJson = csvModule.csvToJson;
  }
  
  if (!jsonToCsv) {
    const jsonModule = await import('../../json-to-csv');
    jsonToCsv = jsonModule.jsonToCsv;
  }
}

/**
 * Обрабатывает задачу парсинга CSV
 */
async function processCsvParsing(task: WorkerTask): Promise<any> {
  await initializeParserFunctions();
  
  const { data, options } = task;
  
  if (typeof data !== 'string') {
    throw new Error('CSV data must be a string');
  }
  
  return csvToJson(data, options);
}

/**
 * Обрабатывает задачу конвертации JSON в CSV
 */
async function processJsonToCsv(task: WorkerTask): Promise<any> {
  await initializeParserFunctions();
  
  const { data, options } = task;
  
  if (!Array.isArray(data) && (typeof data !== 'object' || data === null)) {
    throw new Error('JSON data must be an array or object');
  }
  
  return jsonToCsv(data, options);
}

/**
 * Обрабатывает задачу обработки чанка данных
 */
async function processDataChunk(task: WorkerTask): Promise<any> {
  const { type, data, options } = task;
  
  switch (type) {
    case 'csv_parse':
      return processCsvParsing(task);
      
    case 'json_to_csv':
      return processJsonToCsv(task);
      
    case 'transform_data':
      // Простая трансформация данных
      if (Array.isArray(data)) {
        return data.map((item, index) => ({
          ...item,
          _workerId: workerData?.workerId || 0,
          _chunkIndex: index
        }));
      }
      return data;
      
    case 'validate_data':
      // Валидация данных
      if (Array.isArray(data)) {
        const invalidItems = data.filter(item => 
          item === null || item === undefined || 
          (typeof item === 'object' && Object.keys(item).length === 0)
        );
        
        return {
          valid: invalidItems.length === 0,
          totalItems: data.length,
          invalidItems: invalidItems.length,
          invalidIndexes: data
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => 
              item === null || item === undefined || 
              (typeof item === 'object' && Object.keys(item).length === 0)
            )
            .map(({ index }) => index)
        };
      }
      return { valid: true, totalItems: 1 };
      
    default:
      throw new Error(`Unknown task type: ${type}`);
  }
}

/**
 * Основная функция воркера
 */
async function main() {
  if (isMainThread) {
    console.error('Worker script should not be run in main thread');
    process.exit(1);
  }
  
  // Регистрируем обработчик сообщений
  parentPort?.on('message', async (task: WorkerTask) => {
    const startTime = Date.now();
    
    try {
      const result = await processDataChunk(task);
      const duration = Date.now() - startTime;
      
      const workerResult: WorkerResult = {
        id: task.id,
        result,
        duration
      };
      
      parentPort?.postMessage(workerResult);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      const workerResult: WorkerResult = {
        id: task.id,
        result: null,
        error: error instanceof Error ? error : new Error(String(error)),
        duration
      };
      
      parentPort?.postMessage(workerResult);
    }
  });
  
  // Отправляем сообщение о готовности
  parentPort?.postMessage({
    type: 'worker_ready',
    workerId: workerData?.workerId || 0,
    pid: process.pid
  });
  
  // Обрабатываем сигналы завершения
  process.on('SIGTERM', () => {
    parentPort?.postMessage({
      type: 'worker_shutdown',
      workerId: workerData?.workerId || 0
    });
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    parentPort?.postMessage({
      type: 'worker_shutdown',
      workerId: workerData?.workerId || 0
    });
    process.exit(0);
  });
}

// Запускаем воркер
main().catch(error => {
  console.error('Worker initialization failed:', error);
  process.exit(1);
});

/**
 * Утилитарные функции для воркера
 */

/**
 * Разделяет данные на чанки для параллельной обработки
 */
export function chunkData<T>(data: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }
  
  return chunks;
}

/**
 * Объединяет результаты обработки чанков
 */
export function mergeChunkResults<T>(chunkResults: T[][]): T[] {
  return chunkResults.flat();
}

/**
 * Создает задачи для обработки чанков
 */
export function createChunkTasks<T, R>(
  data: T[],
  chunkSize: number,
  taskType: string,
  options?: Record<string, any>
): WorkerTask<T[], R>[] {
  const chunks = chunkData(data, chunkSize);
  
  return chunks.map((chunk, index) => ({
    id: `chunk_${index}_${Date.now()}`,
    type: taskType,
    data: chunk,
    options: {
      ...options,
      chunkIndex: index,
      totalChunks: chunks.length
    }
  }));
}