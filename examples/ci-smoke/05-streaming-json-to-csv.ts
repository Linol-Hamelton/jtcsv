// 05-streaming-json-to-csv.ts — streamJsonToCsv with in-memory string output
import { strict as assert } from 'node:assert';
import { streamJsonToCsv } from 'jtcsv/streams';

(async () => {
  const data = [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
    { id: 3, name: 'Linus' },
  ];

  // Default delimiter is ';' — pin to ',' for a predictable shape.
  const csv = await streamJsonToCsv(data, { delimiter: ',' });
  assert.equal(typeof csv, 'string');

  const lines = csv.trim().split(/\r?\n/);
  assert.equal(lines[0], 'id,name');
  assert.equal(lines.length, 4);
  assert.equal(lines[1], '1,Ada');

  console.log('ok');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
