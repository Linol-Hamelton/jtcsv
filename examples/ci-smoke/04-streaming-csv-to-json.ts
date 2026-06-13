// 04-streaming-csv-to-json.ts — Readable -> createCsvToJsonStream -> collector
import { strict as assert } from 'node:assert';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createCsvToJsonStream } from 'jtcsv/streams';

(async () => {
  const csv = 'a,b\n1,2\n3,4\n5,6\n';
  const src = Readable.from(csv);
  const transform = createCsvToJsonStream({ parseNumbers: true });

  const rows: any[] = [];
  transform.on('data', (row) => rows.push(row));

  await pipeline(src, transform);

  assert.equal(rows.length, 3);
  assert.deepStrictEqual(rows[0], { a: 1, b: 2 });
  console.log('count=' + rows.length);
  console.log('ok');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
