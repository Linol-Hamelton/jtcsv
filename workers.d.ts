import { EventEmitter } from 'events';
import type { WorkerTask, WorkerResult, WorkerPoolStats, AsyncCsvToJsonOptions } from './index';

export class WorkerPool extends EventEmitter {
  constructor(workerCount?: number, workerScript?: string);
  getStats(): WorkerPoolStats;
  shutdown(): Promise<void>;
}

export function createWorkerTask<T = any, R = any>(
  type: string,
  data: T,
  options?: Record<string, any>
): WorkerTask<T, R>;

export function createWorkerResult<R = any>(
  id: string,
  result: R,
  duration: number,
  error?: Error
): WorkerResult<R>;

export function getWorkerPool(workerCount?: number, workerScript?: string): WorkerPool;
export function shutdownWorkerPool(): Promise<void>;

export function csvToJsonMultithreaded(
  csv: string,
  options?: AsyncCsvToJsonOptions
): Promise<any[]>;
