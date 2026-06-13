// 08-errors-catch.ts — provoke ParsingError.fieldCountMismatch and assert e.code
import { strict as assert } from 'node:assert';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createCsvToJsonStream } from 'jtcsv/streams';
import { ParsingError } from 'jtcsv/errors';

(async () => {
  let caught: any = null;
  try {
    // 3 headers, 4 fields in the data row -> field count mismatch
    const src = Readable.from('a,b,c\n1,2,3,4\n');
    const t = createCsvToJsonStream({});
    t.on('data', () => { /* drain */ });
    await pipeline(src, t);
  } catch (e: any) {
    caught = e;
  }

  assert.ok(caught, 'expected ParsingError to be thrown');
  assert.ok(caught instanceof ParsingError, 'expected ParsingError instance');
  assert.equal(caught.code, 'PARSING_ERROR');
  console.log('code=' + caught.code);
  console.log('ok');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
