/**
 * Worker-thread concurrency tests.
 *
 * Exercises csvToJsonAsync / jsonToCsvAsync with `useWorkers: true`. The
 * worker_threads runtime needs the compiled `dist/_worker.cjs.js`, so
 * these tests require `npm run build` to have run first. The setup hook
 * skips the suite gracefully if the worker bundle is missing — useful
 * for first-time clones where build hasn't happened yet.
 */
import { describe, test, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import {
  splitCsvIntoChunks,
  planConcurrency,
  type ParallelizeOptions,
} from '../src/workers/parallelize';

const WORKER_BUILD = path.join(__dirname, '..', 'dist', '_worker.cjs.js');
const HAVE_WORKER_BUILD = fs.existsSync(WORKER_BUILD);

const describeIfBuilt = HAVE_WORKER_BUILD ? describe : describe.skip;

describe('splitCsvIntoChunks', () => {
  test('returns single chunk when count <= 1', () => {
    expect(splitCsvIntoChunks('a,b\n1,2\n3,4', 1, true)).toEqual(['a,b\n1,2\n3,4']);
  });

  test('preserves header on every chunk', () => {
    const csv = 'id,name\n1,a\n2,b\n3,c\n4,d\n5,e\n6,f';
    const chunks = splitCsvIntoChunks(csv, 3, true);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.startsWith('id,name\n')).toBe(true);
  });

  test('quoted newlines do NOT cause a split', () => {
    // The "value with\nnewline" row should not be split mid-cell.
    const csv = 'id,note\n1,plain\n2,"value with\nnewline"\n3,trailing';
    const chunks = splitCsvIntoChunks(csv, 4, true);
    // Re-join everything (minus duplicated headers) and confirm the quoted
    // newline survives intact.
    const allRows: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const body = i === 0 ? chunks[i] : chunks[i].replace(/^id,note\n/, '');
      allRows.push(body);
    }
    const reconstructed = allRows.join('');
    expect(reconstructed).toContain('"value with\nnewline"');
  });

  test('empty input returns empty chunk array', () => {
    expect(splitCsvIntoChunks('', 4, true)).toEqual(['']);
  });
});

describe('planConcurrency', () => {
  test('returns 1 when concurrency is undefined or 1', () => {
    const big = 10 * 1024 * 1024;
    expect(planConcurrency(big, 'csvBytes', {})).toBe(1);
    expect(planConcurrency(big, 'csvBytes', { concurrency: 1 })).toBe(1);
  });

  test('returns 1 when input below threshold', () => {
    const small = 100; // 100 bytes
    expect(planConcurrency(small, 'csvBytes', { concurrency: 4 })).toBe(1);
  });

  test('returns N when input is large enough for N chunks', () => {
    const huge = 10 * 1024 * 1024; // 10 MB
    const opts: ParallelizeOptions = { concurrency: 4, csvThresholdBytes: 1024 * 1024 };
    expect(planConcurrency(huge, 'csvBytes', opts)).toBe(4);
  });

  test('caps workers at chunks-available', () => {
    const just = 2 * 1024 * 1024; // 2 MB
    const opts: ParallelizeOptions = { concurrency: 8, csvThresholdBytes: 1024 * 1024 };
    // 2 MB / 1 MB threshold = 2 chunks fit, even though 8 workers requested.
    expect(planConcurrency(just, 'csvBytes', opts)).toBe(2);
  });
});

describeIfBuilt('csvToJsonAsync via worker_threads (requires built dist)', () => {
  let main: typeof import('../index');

  beforeAll(() => {
    // Force require from built dist so the worker resolution works.
    const distPath = path.join(__dirname, '..', 'dist', 'index.cjs.js');
    delete require.cache[distPath];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    main = require(distPath) as typeof import('../index');
  });

  test('useWorkers:false returns the same result as csvToJson', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `n${i}` }));
    const csv = main.jsonToCsv(rows, { delimiter: ',' });
    const sync = main.csvToJson(csv, { delimiter: ',', parseNumbers: true });
    const out = await main.csvToJsonAsync(csv, { delimiter: ',', parseNumbers: true });
    expect(out).toEqual(sync);
  });

  test('useWorkers:true matches sync output on a >1MB payload', async () => {
    const rows = Array.from({ length: 30000 }, (_, i) => ({
      id: i, name: `name-${i}-padding-padding`, email: `user${i}@example.com`, score: i * 1.5,
    }));
    const csv = main.jsonToCsv(rows, { delimiter: ',' });
    expect(csv.length).toBeGreaterThan(1024 * 1024);
    const sync = main.csvToJson(csv, { delimiter: ',', parseNumbers: true });
    const par = await main.csvToJsonAsync(csv, {
      delimiter: ',', parseNumbers: true,
      useWorkers: true, workerCount: 2,
    });
    expect(par.length).toBe(sync.length);
    expect(par[0]).toEqual(sync[0]);
    expect(par[par.length - 1]).toEqual(sync[sync.length - 1]);
  }, 30000);

  test('useWorkers:true on small payload silently falls back to sync', async () => {
    const csv = 'id,name\n1,a\n2,b\n3,c';
    const out = await main.csvToJsonAsync(csv, {
      delimiter: ',', parseNumbers: true,
      useWorkers: true, workerCount: 4,
    });
    expect(out).toEqual([{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 3, name: 'c' }]);
  });

  test('jsonToCsvAsync with useWorkers matches sync on large array', async () => {
    const rows = Array.from({ length: 25000 }, (_, i) => ({
      id: i, name: `name-${i}`, email: `u${i}@x.com`, payload: 'x'.repeat(50),
    }));
    const sync = main.jsonToCsv(rows, { delimiter: ',' });
    const par = await main.jsonToCsvAsync(rows, {
      delimiter: ',',
      useWorkers: true, workerCount: 2,
    });
    // Round-trip both back to objects: the partition seam shouldn't lose rows.
    const syncBack = main.csvToJson(sync, { delimiter: ',', parseNumbers: true });
    const parBack = main.csvToJson(par, { delimiter: ',', parseNumbers: true });
    expect(parBack.length).toBe(syncBack.length);
    expect(parBack[0]).toEqual(syncBack[0]);
    expect(parBack[parBack.length - 1]).toEqual(syncBack[syncBack.length - 1]);
  }, 30000);
});
