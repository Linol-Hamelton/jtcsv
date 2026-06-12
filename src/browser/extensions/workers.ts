// Расширение Web Workers для jtcsv
// Дополнительный модуль для параллельной обработки больших CSV

import { createWorkerPool, parseCSVWithWorker } from '../workers/worker-pool';

async function createWorkerPoolLazy(options = {}) {
  const mod = await import('../workers/worker-pool');
  return mod.createWorkerPool(options);
}

async function parseCSVWithWorkerLazy(
  csvInput: string | File | ArrayBuffer | ArrayBufferView,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any = {},
  onProgress: ((_p: unknown) => void) | null = null,
): Promise<unknown> {
  const mod = await import('../workers/worker-pool');
  return mod.parseCSVWithWorker(csvInput, options, onProgress);
}

const jtcsvWorkers = {
  createWorkerPool,
  parseCSVWithWorker,
  createWorkerPoolLazy,
  parseCSVWithWorkerLazy
};

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
  module.exports = jtcsvWorkers;
} else if (typeof define === 'function' && define.amd) {
  define([], () => jtcsvWorkers);
} else if (typeof window !== 'undefined' && window.jtcsv) {
  // Расширяем глобальный jtcsv, если он существует
  Object.assign(window.jtcsv, jtcsvWorkers);
}

export default jtcsvWorkers;
export {
  createWorkerPool,
  parseCSVWithWorker,
  createWorkerPoolLazy,
  parseCSVWithWorkerLazy
};
