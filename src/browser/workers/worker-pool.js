// Worker Pool для параллельной обработки CSV
// Использует Comlink для простой коммуникации с Web Workers

import { ValidationError, ConfigurationError } from '../errors-browser.js';

// Проверка поддержки Web Workers
const WORKERS_SUPPORTED = typeof Worker !== 'undefined';

/**
 * Опции для Worker Pool
 * @typedef {Object} WorkerPoolOptions
 * @property {number} [workerCount=4] - Количество workers в pool
 * @property {number} [maxQueueSize=100] - Максимальный размер очереди задач
 * @property {boolean} [autoScale=true] - Автоматическое масштабирование pool
 * @property {number} [idleTimeout=60000] - Таймаут простоя worker (мс)
 */

/**
 * Статистика Worker Pool
 * @typedef {Object} WorkerPoolStats
 * @property {number} totalWorkers - Всего workers
 * @property {number} activeWorkers - Активные workers
 * @property {number} idleWorkers - Простаивающие workers
 * @property {number} queueSize - Размер очереди
 * @property {number} tasksCompleted - Завершенные задачи
 * @property {number} tasksFailed - Неудачные задачи
 */

/**
 * Прогресс обработки задачи
 * @typedef {Object} TaskProgress
 * @property {number} processed - Обработано элементов
 * @property {number} total - Всего элементов
 * @property {number} percentage - Процент выполнения
 * @property {number} speed - Скорость обработки (элементов/сек)
 */

/**
 * Worker Pool для параллельной обработки CSV
 */
export class WorkerPool {
  /**
   * Создает новый Worker Pool
   * @param {string} workerScript - URL скрипта worker
   * @param {WorkerPoolOptions} [options] - Опции pool
   */
  constructor(workerScript, options = {}) {
    if (!WORKERS_SUPPORTED) {
      throw new ValidationError('Web Workers не поддерживаются в этом браузере');
    }
    
    this.workerScript = workerScript;
    this.options = {
      workerCount: 4,
      maxQueueSize: 100,
      autoScale: true,
      idleTimeout: 60000,
      ...options
    };
    
    this.workers = [];
    this.taskQueue = [];
    this.activeTasks = new Map();
    this.stats = {
      totalWorkers: 0,
      activeWorkers: 0,
      idleWorkers: 0,
      queueSize: 0,
      tasksCompleted: 0,
      tasksFailed: 0
    };
    
    this.initializeWorkers();
  }
  
  /**
   * Инициализация workers
   * @private
   */
  initializeWorkers() {
    const { workerCount } = this.options;
    
    for (let i = 0; i < workerCount; i++) {
      this.createWorker();
    }
    
    this.updateStats();
  }
  
  /**
   * Создает нового worker
   * @private
   */
  createWorker() {
    try {
      const worker = new Worker(this.workerScript, { type: 'module' });
      
      worker.id = `worker-${this.workers.length}`;
      worker.status = 'idle';
      worker.lastUsed = Date.now();
      worker.taskId = null;
      
      // Обработчики событий
      worker.onmessage = (event) => this.handleWorkerMessage(worker, event);
      worker.onerror = (error) => this.handleWorkerError(worker, error);
      worker.onmessageerror = (error) => this.handleWorkerMessageError(worker, error);
      
      this.workers.push(worker);
      this.stats.totalWorkers++;
      this.stats.idleWorkers++;
      
      return worker;
    } catch (error) {
      throw new ConfigurationError(`Не удалось создать worker: ${error.message}`);
    }
  }
  
  /**
   * Обработка сообщений от worker
   * @private
   */
  handleWorkerMessage(worker, event) {
    const { data } = event;
    
    if (data.type === 'PROGRESS') {
      this.handleProgress(worker, data);
    } else if (data.type === 'RESULT') {
      this.handleResult(worker, data);
    } else if (data.type === 'ERROR') {
      this.handleWorkerTaskError(worker, data);
    }
  }
  
  /**
   * Обработка прогресса задачи
   * @private
   */
  handleProgress(worker, progressData) {
    const taskId = worker.taskId;
    if (taskId && this.activeTasks.has(taskId)) {
      const task = this.activeTasks.get(taskId);
      if (task.onProgress) {
        task.onProgress({
          processed: progressData.processed,
          total: progressData.total,
          percentage: (progressData.processed / progressData.total) * 100,
          speed: progressData.speed || 0
        });
      }
    }
  }
  
  /**
   * Обработка результата задачи
   * @private
   */
  handleResult(worker, resultData) {
    const taskId = worker.taskId;
    if (taskId && this.activeTasks.has(taskId)) {
      const task = this.activeTasks.get(taskId);
      
      // Освобождение worker
      worker.status = 'idle';
      worker.lastUsed = Date.now();
      worker.taskId = null;
      this.stats.activeWorkers--;
      this.stats.idleWorkers++;
      
      // Завершение задачи
      task.resolve(resultData.data);
      this.activeTasks.delete(taskId);
      this.stats.tasksCompleted++;
      
      // Обработка следующей задачи в очереди
      this.processQueue();
      this.updateStats();
    }
  }
  
  /**
   * Обработка ошибки задачи
   * @private
   */
  handleWorkerTaskError(worker, errorData) {
    const taskId = worker.taskId;
    if (taskId && this.activeTasks.has(taskId)) {
      const task = this.activeTasks.get(taskId);
      
      // Освобождение worker
      worker.status = 'idle';
      worker.lastUsed = Date.now();
      worker.taskId = null;
      this.stats.activeWorkers--;
      this.stats.idleWorkers++;
      
      // Завершение с ошибкой
      task.reject(new Error(errorData.message || 'Ошибка в worker'));
      this.activeTasks.delete(taskId);
      this.stats.tasksFailed++;
      
      // Обработка следующей задачи
      this.processQueue();
      this.updateStats();
    }
  }
  
  /**
   * Обработка ошибок worker
   * @private
   */
  handleWorkerError(worker, error) {
    console.error(`Worker ${worker.id} error:`, error);
    
    // Перезапуск worker
    this.restartWorker(worker);
  }
  
  /**
   * Обработка ошибок сообщений
   * @private
   */
  handleWorkerMessageError(worker, error) {
    console.error(`Worker ${worker.id} message error:`, error);
  }
  
  /**
   * Перезапуск worker
   * @private
   */
  restartWorker(worker) {
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      // Завершение старого worker
      worker.terminate();
      
      // Удаление из статистики
      if (worker.status === 'active') {
        this.stats.activeWorkers--;
      } else {
        this.stats.idleWorkers--;
      }
      this.stats.totalWorkers--;
      
      // Создание нового worker
      const newWorker = this.createWorker();
      this.workers[index] = newWorker;
      
      // Перезапуск задачи если была активна
      if (worker.taskId && this.activeTasks.has(worker.taskId)) {
        const task = this.activeTasks.get(worker.taskId);
        this.executeTask(newWorker, task);
      }
    }
  }
  
  /**
   * Выполнение задачи на worker
   * @private
   */
  executeTask(worker, task) {
    worker.status = 'active';
    worker.lastUsed = Date.now();
    worker.taskId = task.id;
    
    this.stats.idleWorkers--;
    this.stats.activeWorkers++;
    
    // Отправка задачи в worker
    worker.postMessage({
      type: 'EXECUTE',
      taskId: task.id,
      method: task.method,
      args: task.args,
      options: task.options
    });
  }
  
  /**
   * Обработка очереди задач
   * @private
   */
  processQueue() {
    if (this.taskQueue.length === 0) {
      return;
    }
    
    // Поиск свободного worker
    const idleWorker = this.workers.find(w => w.status === 'idle');
    if (!idleWorker) {
      // Автомасштабирование если включено
      if (this.options.autoScale && this.workers.length < this.options.maxQueueSize) {
        this.createWorker();
        this.processQueue();
      }
      return;
    }
    
    // Получение задачи из очереди
    const task = this.taskQueue.shift();
    this.stats.queueSize--;
    
    // Выполнение задачи
    this.executeTask(idleWorker, task);
    this.updateStats();
  }
  
  /**
   * Обновление статистики
   * @private
   */
  updateStats() {
    this.stats.queueSize = this.taskQueue.length;
  }
  
  /**
   * Выполнение задачи через pool
   * @param {string} method - Метод для вызова в worker
   * @param {Array} args - Аргументы метода
   * @param {Object} [options] - Опции задачи
   * @param {Function} [onProgress] - Callback прогресса
   * @returns {Promise<any>} Результат выполнения
   */
  async exec(method, args = [], options = {}, onProgress = null) {
    return new Promise((resolve, reject) => {
      // Проверка размера очереди
      if (this.taskQueue.length >= this.options.maxQueueSize) {
        reject(new Error('Очередь задач переполнена'));
        return;
      }
      
      // Создание задачи
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const task = {
        id: taskId,
        method,
        args,
        options,
        onProgress,
        resolve,
        reject,
        createdAt: Date.now()
      };
      
      // Добавление в очередь
      this.taskQueue.push(task);
      this.stats.queueSize++;
      
      // Запуск обработки очереди
      this.processQueue();
      this.updateStats();
    });
  }
  
  /**
   * Получение статистики pool
   * @returns {WorkerPoolStats} Статистика
   */
  getStats() {
    return { ...this.stats };
  }
  
  /**
   * Очистка простаивающих workers
   */
  cleanupIdleWorkers() {
    const now = Date.now();
    const { idleTimeout } = this.options;
    
    for (let i = this.workers.length - 1; i >= 0; i--) {
      const worker = this.workers[i];
      if (worker.status === 'idle' && (now - worker.lastUsed) > idleTimeout) {
        // Сохранение минимального количества workers
        if (this.workers.length > 1) {
          worker.terminate();
          this.workers.splice(i, 1);
          this.stats.totalWorkers--;
          this.stats.idleWorkers--;
        }
      }
    }
  }
  
  /**
   * Завершение всех workers
   */
  terminate() {
    this.workers.forEach(worker => {
      worker.terminate();
    });
    
    this.workers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
    
    // Сброс статистики
    this.stats = {
      totalWorkers: 0,
      activeWorkers: 0,
      idleWorkers: 0,
      queueSize: 0,
      tasksCompleted: 0,
      tasksFailed: 0
    };
  }
}

/**
 * Создает Worker Pool для обработки CSV
 * @param {WorkerPoolOptions} [options] - Опции pool
 * @returns {WorkerPool} Worker Pool
 */
export function createWorkerPool(options = {}) {
  // Используем встроенный worker скрипт
  const workerScript = new URL('./csv-parser.worker.js', import.meta.url).href;
  return new WorkerPool(workerScript, options);
}

/**
 * Парсит CSV с использованием Web Workers
 * @param {string|File} csvInput - CSV строка или File объект
 * @param {Object} [options] - Опции парсинга
 * @param {Function} [onProgress] - Callback прогресса
 * @returns {Promise<Array<Object>>} JSON данные
 */
export async function parseCSVWithWorker(csvInput, options = {}, onProgress = null) {
  // Создание pool если нужно
  if (!parseCSVWithWorker.pool) {
    parseCSVWithWorker.pool = createWorkerPool();
  }
  
  const pool = parseCSVWithWorker.pool;
  
  // Подготовка CSV строки
  let csvString;
  if (csvInput instanceof File) {
    csvString = await readFileAsText(csvInput);
  } else if (typeof csvInput === 'string') {
    csvString = csvInput;
  } else {
    throw new ValidationError('Input must be a CSV string or File object');
  }
  
  // Выполнение через pool
  return pool.exec('parseCSV', [csvString, options], {}, onProgress);
}

/**
 * Чтение файла как текст
 * @private
 */
async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file, 'UTF-8');
  });
}

// Экспорт для Node.js совместимости
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WorkerPool,
    createWorkerPool,
    parseCSVWithWorker
  };
}