/**
 * Worker-thread parallelization orchestrator.
 *
 * Closes the seven `// TODO: Implement worker thread support` markers in
 * csv-to-json.ts, json-to-csv.ts, json-save.ts, stream-csv-to-json.ts,
 * stream-json-to-csv.ts. Strategy:
 *
 *  - opt-in via `options.concurrency`: 1 (default) = sync; N>1 = N workers;
 *    0 = `os.availableParallelism()` workers.
 *  - threshold: only spawn workers when the work is big enough to amortize
 *    spawn overhead (~10-20ms per worker). 256 KB CSV / 5000 JSON rows.
 *  - browser builds: silent sync fallback (worker_threads unavailable).
 *  - the rollup config emits `dist/_worker.cjs.js` from
 *    `src/workers/parser-worker.ts`. We resolve it via the package metadata.
 */

import * as path from 'path';
import * as fs from 'fs';
import type { WorkerTaskMessage, WorkerTaskResult } from './parser-worker';

export type ConcurrencyOption = number | undefined;

export interface ParallelizeOptions {
  /** 1 = sync (default); N>1 = N workers; 0 = auto (CPU count). */
  concurrency?: ConcurrencyOption;
  /** Override CSV byte threshold below which we always go sync. */
  csvThresholdBytes?: number;
  /** Override JSON row threshold below which we always go sync. */
  jsonRowThreshold?: number;
}

// Thresholds below which we skip workers and run sync. Worker spawn +
// postMessage round-trip costs ~30-80ms on typical hardware; data
// serialization across the thread boundary adds more for big result sets.
// Empirically (on Node 22, 4 cores), workers only beat sync once the
// payload is large enough that parsing time exceeds that overhead. We
// pick conservative defaults — useWorkers is mainly about freeing the
// main event loop for concurrent requests, not single-call speed.
const DEFAULT_CSV_THRESHOLD = 1024 * 1024;
const DEFAULT_JSON_THRESHOLD = 20000;

/* ------------------------------------------------------------------------- */
/* Capability detection                                                      */
/* ------------------------------------------------------------------------- */

function isWorkerThreadsAvailable(): boolean {
  // Browser bundles get a `process` shim from rollup but no worker_threads.
  // require() inside try/catch lets us probe without crashing the browser.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('worker_threads');
    return typeof process !== 'undefined' && !!process.versions?.node;
  } catch {
    return false;
  }
}

function resolveWorkerCount(concurrency: ConcurrencyOption): number {
  if (concurrency === undefined || concurrency === 1) return 1;
  if (concurrency === 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const os = require('os') as typeof import('os');
      return Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1);
    } catch {
      return 1;
    }
  }
  return Math.max(1, Math.floor(concurrency));
}

/* ------------------------------------------------------------------------- */
/* Worker-script path resolution                                             */
/* ------------------------------------------------------------------------- */

let cachedWorkerPath: string | null | undefined;

function resolveWorkerScriptPath(): string | null {
  if (cachedWorkerPath !== undefined) return cachedWorkerPath;

  // Try common locations relative to this file's runtime location.
  // After rollup build: dist/_shared/parallelize-*.cjs.js → dist/_worker.cjs.js
  // is one directory up.
  const candidates = [
    path.join(__dirname, '..', '_worker.cjs.js'),       // from dist/_shared/
    path.join(__dirname, '_worker.cjs.js'),             // from dist/
    path.join(__dirname, '..', '..', 'dist', '_worker.cjs.js'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        cachedWorkerPath = p;
        return p;
      }
    } catch {
      // ignore
    }
  }
  cachedWorkerPath = null;
  return null;
}

/* ------------------------------------------------------------------------- */
/* CSV row-boundary chunking                                                 */
/* ------------------------------------------------------------------------- */

/**
 * Split CSV content into N approximately equal chunks at row boundaries.
 * The first chunk keeps the header; subsequent chunks get the header
 * prepended so each is a self-parsable CSV.
 *
 * Quotes spanning a newline (RFC 4180) would break naive splitting, so we
 * track quote state while scanning for split points.
 */
export function splitCsvIntoChunks(
  csv: string,
  chunkCount: number,
  hasHeaders: boolean,
): string[] {
  if (chunkCount <= 1 || csv.length === 0) return [csv];

  // Find header end (first unquoted newline).
  let headerEnd = 0;
  if (hasHeaders) {
    let inQuotes = false;
    for (let i = 0; i < csv.length; i++) {
      const ch = csv[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === '\n' && !inQuotes) {
        headerEnd = i + 1;
        break;
      }
    }
  }

  const header = hasHeaders ? csv.slice(0, headerEnd) : '';
  const body = csv.slice(headerEnd);
  const targetSize = Math.ceil(body.length / chunkCount);

  const chunks: string[] = [];
  let start = 0;
  while (start < body.length) {
    let end = Math.min(start + targetSize, body.length);
    // Walk forward to next unquoted newline.
    if (end < body.length) {
      let inQuotes = false;
      // First, get the quote state up to `end`.
      for (let i = start; i < end; i++) {
        if (body[i] === '"') inQuotes = !inQuotes;
      }
      while (end < body.length) {
        const ch = body[end];
        if (ch === '"') inQuotes = !inQuotes;
        if (ch === '\n' && !inQuotes) {
          end++;
          break;
        }
        end++;
      }
    }
    const chunkBody = body.slice(start, end);
    chunks.push(header + chunkBody);
    start = end;
  }
  return chunks.length === 0 ? [csv] : chunks;
}

/* ------------------------------------------------------------------------- */
/* Worker pool — one Worker per task, terminated on completion               */
/* ------------------------------------------------------------------------- */

type WorkerCtor = typeof import('worker_threads').Worker;

async function runOneWorkerTask(
  WorkerClass: WorkerCtor,
  scriptPath: string,
  message: WorkerTaskMessage,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const worker = new WorkerClass(scriptPath);
    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      worker.terminate().catch(() => { /* ignore */ });
    };
    worker.once('message', (raw: WorkerTaskResult) => {
      cleanup();
      // strictNullChecks is off in the main tsconfig, so discriminated-union
      // narrowing is unreliable; cast to a permissive shape and inspect ok.
      const msg = raw as { ok: boolean; result?: unknown; error?: string; code?: string };
      if (msg.ok) {
        resolve(msg.result);
      } else {
        const err = new Error(msg.error || 'Worker task failed');
        if (msg.code) (err as Error & { code?: string }).code = msg.code;
        reject(err);
      }
    });
    worker.once('error', (err) => {
      cleanup();
      reject(err);
    });
    worker.once('exit', (code) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Worker exited with code ${code} before posting a result`));
      }
    });
    worker.postMessage(message);
  });
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const lanes = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await task(items[i], i);
    }
  });
  await Promise.all(lanes);
  return results;
}

/* ------------------------------------------------------------------------- */
/* Public API                                                                */
/* ------------------------------------------------------------------------- */

/**
 * Decide whether the given input is worth parallelizing.
 * Returns the worker count to use (1 = sync, N>=2 = parallel).
 */
export function planConcurrency(
  inputSize: number,
  itemKind: 'csvBytes' | 'jsonRows',
  opts: ParallelizeOptions,
): number {
  if (!isWorkerThreadsAvailable()) return 1;
  const requested = resolveWorkerCount(opts.concurrency);
  if (requested === 1) return 1;
  const threshold =
    itemKind === 'csvBytes'
      ? (opts.csvThresholdBytes ?? DEFAULT_CSV_THRESHOLD)
      : (opts.jsonRowThreshold ?? DEFAULT_JSON_THRESHOLD);
  if (inputSize < threshold) return 1;
  return Math.min(requested, Math.ceil(inputSize / threshold));
}

/**
 * Parallel CSV → JSON. Falls back to syncFn when parallelization is not
 * worthwhile or workers are unavailable.
 */
export async function parallelCsvToJson<R = unknown[]>(
  csv: string,
  options: Record<string, unknown> | undefined,
  parallelOpts: ParallelizeOptions,
  syncFn: (csv: string, options?: Record<string, unknown>) => R,
): Promise<R> {
  const workers = planConcurrency(csv.length, 'csvBytes', parallelOpts);
  if (workers === 1) return syncFn(csv, options);

  const scriptPath = resolveWorkerScriptPath();
  if (!scriptPath) return syncFn(csv, options);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Worker } = require('worker_threads') as typeof import('worker_threads');
  const hasHeaders = options?.hasHeaders !== false;
  const chunks = splitCsvIntoChunks(csv, workers, hasHeaders);
  if (chunks.length === 1) return syncFn(csv, options);

  try {
    const partials = await runWithConcurrency(chunks, workers, (chunk) =>
      runOneWorkerTask(Worker, scriptPath, { type: 'csvToJson', payload: chunk, options }),
    );
    // Concatenate row arrays preserving order.
    const merged: unknown[] = [];
    for (const p of partials) {
      if (Array.isArray(p)) merged.push(...p);
    }
    return merged as R;
  } catch {
    // Hard fallback to sync on any worker failure — better to be slow than wrong.
    return syncFn(csv, options);
  }
}

/**
 * Parallel JSON → CSV. Splits the input array into N chunks, asks each
 * worker to emit headerless CSV, then prepends the header from chunk 0.
 */
export async function parallelJsonToCsv<R = string>(
  data: unknown[],
  options: Record<string, unknown> | undefined,
  parallelOpts: ParallelizeOptions,
  syncFn: (data: unknown[], options?: Record<string, unknown>) => R,
): Promise<R> {
  if (!Array.isArray(data)) return syncFn(data, options);
  const workers = planConcurrency(data.length, 'jsonRows', parallelOpts);
  if (workers === 1) return syncFn(data, options);

  const scriptPath = resolveWorkerScriptPath();
  if (!scriptPath) return syncFn(data, options);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Worker } = require('worker_threads') as typeof import('worker_threads');

  const includeHeaders = options?.includeHeaders !== false;
  const chunkSize = Math.ceil(data.length / workers);
  const chunks: unknown[][] = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    chunks.push(data.slice(i, i + chunkSize));
  }

  // First chunk gets headers; rest are headerless to avoid duplication.
  try {
    const partials = await runWithConcurrency(chunks, workers, (chunk, idx) =>
      runOneWorkerTask(Worker, scriptPath, {
        type: 'jsonToCsv',
        payload: chunk,
        options: { ...options, includeHeaders: idx === 0 ? includeHeaders : false },
      }),
    );
    return partials.filter((p) => typeof p === 'string').join('\n') as unknown as R;
  } catch {
    return syncFn(data, options);
  }
}
