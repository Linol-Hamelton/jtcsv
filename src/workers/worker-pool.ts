/**
 * Worker Pool для многопоточной обработки данных
 * 
 * Система управления воркерами для параллельной обработки больших наборов данных
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { EventEmitter } from 'events';
import { WorkerTask, WorkerResult, WorkerPoolStats } from '../types';

/**
 * Класс для управления пулом воркеров
 */
export class WorkerPool extends EventEmitter {
  private workers: Worker[] = [];
  private idleWorkers: Worker[] = [];
  private taskQueue: Array<{
    task: WorkerTask;
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private stats: WorkerPoolStats = {
    totalWorkers: 0,
    activeWorkers: 0,
    idleWorkers: 0,
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageTaskDuration: 0
  };
  
  private taskDurations: number[] = [];
  
  /**
   * Создает пул воркеров
   * 
   * @param workerCount - Количество воркеров (по умолчанию: количество ядер CPU - 1)
   * @param workerScript - Путь к скрипту воркера
   */
  constructor(
    workerCount: number = Math.max(1, require('os').cpus().length - 1),
    workerScript: string = __dirname + '/csv-parser.worker.js'
  ) {
    super();
    
    this.stats.totalWorkers = workerCount;
    
    // Создаем воркеры
    for (let i = 0; i < workerCount; i++) {
      this.createWorker(workerScript, i);
    }
    
    // Обновляем статистику каждые 5 секунд
    setInterval(() => this.updateStats(), 5000);
  }
  
  /**
   * Создает нового воркера
   */
  private createWorker(workerScript: string, id: number): void {
    const worker = new Worker(workerScript, {
      workerData: { workerId: id }
    });
    
    worker.on('message', (result: WorkerResult) => {
      this.handleWorkerResult(worker, result);
    });
    
    worker.on('error', (error: Error) => {
      this.handleWorkerError(worker, error);
    });
    
    worker.on('exit', (code: number) => {
      this.handleWorkerExit(worker, code);
    });
    
    this.workers.push(worker);
    this.idleWorkers.push(worker);
    this.stats.idleWorkers++;
    
    this.emit('workerCreated', { workerId: id });
  }
  
  /**
   * Обрабатывает результат выполнения задачи воркером
   */
  private handleWorkerResult(worker: Worker, result: WorkerResult): void {
    // Находим задачу в очереди
    const taskIndex = this.taskQueue.findIndex(item => item.task.id === result.id);
    
    if (taskIndex !== -1) {
      const { task, resolve, reject } = this.taskQueue[taskIndex];
      
      // Удаляем задачу из очереди
      this.taskQueue.splice(taskIndex, 1);
      
      // Обновляем статистику
      this.stats.completedTasks++;
      this.taskDurations.push(result.duration);
      this.updateAverageDuration();
      
      if (result.error) {
        this.stats.failedTasks++;
        reject(result.error);
        this.emit('taskFailed', { task, error: result.error });
      } else {
        resolve(result.result);
        this.emit('taskCompleted', { task, result: result.result, duration: result.duration });
      }
    }
    
    // Возвращаем воркер в пул ожидания
    this.idleWorkers.push(worker);
    this.stats.activeWorkers--;
    this.stats.idleWorkers++;
    
    // Обрабатываем следующую задачу из очереди
    this.processNextTask();
  }
  
  /**
   * Обрабатывает ошибку воркера
   */
  private handleWorkerError(worker: Worker, error: Error): void {
    const workerIndex = this.workers.indexOf(worker);
    const idleIndex = this.idleWorkers.indexOf(worker);
    
    if (idleIndex !== -1) {
      this.idleWorkers.splice(idleIndex, 1);
    }
    
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1);
      this.stats.totalWorkers--;
      this.stats.idleWorkers--;
    }
    
    this.emit('workerError', { worker, error });
    
    // Перезапускаем воркер
    setTimeout(() => {
      this.createWorker(worker.threadId.toString(), this.workers.length);
    }, 1000);
  }
  
  /**
   * Обрабатывает завершение работы воркера
   */
  private handleWorkerExit(worker: Worker, code: number): void {
    const workerIndex = this.workers.indexOf(worker);
    const idleIndex = this.idleWorkers.indexOf(worker);
    
    if (idleIndex !== -1) {
      this.idleWorkers.splice(idleIndex, 1);
    }
    
    if (workerIndex !== -1) {
      this.workers.splice(workerIndex, 1);
      this.stats.totalWorkers--;
      this.stats.idleWorkers--;
    }
    
    this.emit('workerExit', { worker, code });
  }
  
  /**
   * Обрабатывает следующую задачу из очереди
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0 || this.idleWorkers.length === 0) {
      return;
    }
    
    const nextTask = this.taskQueue[0];
    const worker = this.idleWorkers.shift()!;
    
    // Удаляем задачу из начала очереди
    this.taskQueue.shift();
    
    // Отправляем задачу воркеру
    worker.postMessage(nextTask.task);
    
    this.stats.activeWorkers++;
    this.stats.idleWorkers--;
    this.stats.totalTasks++;
    
    this.emit('taskStarted', { task: nextTask.task, workerId: worker.threadId });
  }
  
  /**
   * Обновляет среднюю продолжительность выполнения задач
   */
  private updateAverageDuration(): void {
    if (this.taskDurations.length === 0) {
      this.stats.averageTaskDuration = 0;
      return;
    }
    
    const sum = this.taskDurations.reduce((a, b) => a + b, 0);
    this.stats.averageTaskDuration = sum / this.taskDurations.length;
    
    // Ограничиваем историю до последних 100 задач
    if (this.taskDurations.length > 100) {
      this.taskDurations = this.taskDurations.slice(-100);
    }
  }
  
  /**
   * Обновляет статистику
   */
  private updateStats(): void {
    // Обновляем использование памяти
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.stats.memoryUsage = process.memoryUsage();
    }
    
    this.emit('statsUpdated', this.stats);
  }
  
  /**
   * Выполняет задачу через пул воркеров
   * 
   * @param task - Задача для выполнения
   * @returns Promise с результатом
   */
  async executeTask<T = any, R = any>(task: WorkerTask<T, R>): Promise<R> {
    return new Promise((resolve, reject) => {
      // Добавляем ID задачи если не указан
      if (!task.id) {
        task.id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Добавляем задачу в очередь
      this.taskQueue.push({ task, resolve, reject });
      
      // Пытаемся обработать задачу сразу
      this.processNextTask();
    });
  }
  
  /**
   * Выполняет несколько задач параллельно
   * 
   * @param tasks - Массив задач
   * @param concurrency - Максимальное количество параллельных задач
   * @returns Promise с результатами
   */
  async executeTasks<T = any, R = any>(
    tasks: WorkerTask<T, R>[],
    concurrency?: number
  ): Promise<R[]> {
    const results: R[] = [];
    const errors: Error[] = [];
    
    // Ограничиваем параллелизм если указано
    const maxConcurrency = concurrency || this.workers.length;
    const taskChunks = this.chunkArray(tasks, maxConcurrency);
    
    for (const chunk of taskChunks) {
      const chunkPromises = chunk.map(task => this.executeTask(task));
      
      try {
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      } catch (error: any) {
        errors.push(error);
      }
    }
    
    if (errors.length > 0) {
      throw new AggregateError(errors, `Failed to execute ${errors.length} tasks`);
    }
    
    return results;
  }
  
  /**
   * Разделяет массив на чанки
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    
    return chunks;
  }
  
  /**
   * Возвращает статистику пула
   */
  getStats(): WorkerPoolStats {
    return { ...this.stats };
  }
  
  /**
   * Останавливает пул воркеров
   */
  async shutdown(): Promise<void> {
    // Завершаем все воркеры
    const terminationPromises = this.workers.map(worker => {
      return worker.terminate();
    });
    
    await Promise.all(terminationPromises);
    
    this.workers = [];
    this.idleWorkers = [];
    this.taskQueue = [];
    
    this.emit('shutdown');
  }
  
  /**
   * Перезапускает пул воркеров
   */
  async restart(): Promise<void> {
    await this.shutdown();
    
    // Создаем новых воркеров
    const workerCount = this.stats.totalWorkers;
    for (let i = 0; i < workerCount; i++) {
      this.createWorker(__dirname + '/csv-parser.worker.js', i);
    }
    
    this.emit('restart');
  }
}

/**
 * Утилитарные функции для работы с воркерами
 */

/**
 * Создает задачу для воркера
 */
export function createWorkerTask<T = any, R = any>(
  type: string,
  data: T,
  options?: Record<string, any>
): WorkerTask<T, R> {
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    options
  };
}

/**
 * Создает результат выполнения задачи
 */
export function createWorkerResult<R = any>(
  id: string,
  result: R,
  duration: number,
  error?: Error
): WorkerResult<R> {
  return {
    id,
    result,
    error,
    duration
  };
}

/**
 * Глобальный экземпляр пула воркеров (синглтон)
 */
let globalWorkerPool: WorkerPool | null = null;

/**
 * Возвращает глобальный экземпляр пула воркеров
 */
export function getWorkerPool(
  workerCount?: number,
  workerScript?: string
): WorkerPool {
  if (!globalWorkerPool) {
    globalWorkerPool = new WorkerPool(workerCount, workerScript);
  }
  
  return globalWorkerPool;
}

/**
 * Останавливает глобальный пул воркеров
 */
export async function shutdownWorkerPool(): Promise<void> {
  if (globalWorkerPool) {
    await globalWorkerPool.shutdown();
    globalWorkerPool = null;
  }
}

/**
 * Класс для агрегированных ошибок
 */
export class AggregateError extends Error {
  errors: Error[];
  
  constructor(errors: Error[], message: string) {
    super(message);
    this.name = 'AggregateError';
    this.errors = errors;
  }
}