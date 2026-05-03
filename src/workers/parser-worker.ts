/**
 * Worker-thread entry point.
 *
 * Loaded into a worker_threads.Worker by parallelize.ts. Receives a task
 * over postMessage, runs the synchronous parser, and posts the result back.
 *
 * Compiled by rollup to dist/_worker.cjs.js. Path is resolved via
 * `require.resolve('jtcsv/dist/_worker.cjs.js')` from the main thread.
 */

import { parentPort } from 'worker_threads';
import { csvToJson } from '../../csv-to-json';
import { jsonToCsv } from '../../json-to-csv';

export type WorkerTaskMessage =
  | { type: 'csvToJson'; payload: string; options?: Record<string, unknown> }
  | { type: 'jsonToCsv'; payload: unknown; options?: Record<string, unknown> };

export type WorkerTaskResult =
  | { ok: true; result: unknown }
  | { ok: false; error: string; code?: string };

if (parentPort) {
  parentPort.on('message', (msg: WorkerTaskMessage) => {
    try {
      let result: unknown;
      switch (msg.type) {
        case 'csvToJson':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = csvToJson(msg.payload, msg.options as any);
          break;
        case 'jsonToCsv':
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = jsonToCsv(msg.payload as any, msg.options as any);
          break;
        default:
          throw new Error(`Unknown worker task type: ${(msg as { type: string }).type}`);
      }
      parentPort!.postMessage({ ok: true, result } satisfies WorkerTaskResult);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.code;
      parentPort!.postMessage({ ok: false, error, code } satisfies WorkerTaskResult);
    }
  });
}
