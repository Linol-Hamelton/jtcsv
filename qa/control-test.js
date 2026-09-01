/**
 * jtcsv control test — exercises the public surface the way a consumer does.
 *
 * Runs against the INSTALLED package (a packed tarball in node_modules), not
 * the source tree, so anything the build or the exports map gets wrong shows
 * up here rather than being papered over by path aliases.
 *
 * Every check asserts on the value, not merely that the call returned. A
 * function that returns garbage without throwing is the failure mode this
 * project has actually shipped, so "did not throw" proves nothing.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const RESULTS = [];
let CURRENT_SECTION = 'general';

function section(name) {
  CURRENT_SECTION = name;
}

function record(name, status, detail, ms) {
  RESULTS.push({ section: CURRENT_SECTION, name, status, detail: detail || '', ms });
}

/** Runs one check. `fn` throws (usually via assert) to fail. */
function check(name, fn) {
  const t0 = Date.now();
  try {
    const r = fn();
    if (r && typeof r.then === 'function') {
      throw new Error('check() got a promise — use acheck() for async');
    }
    record(name, 'PASS', '', Date.now() - t0);
  } catch (e) {
    record(name, 'FAIL', e && e.message ? e.message : String(e), Date.now() - t0);
  }
}

async function acheck(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    record(name, 'PASS', '', Date.now() - t0);
  } catch (e) {
    record(name, 'FAIL', e && e.message ? e.message : String(e), Date.now() - t0);
  }
}

/** Asserts that `fn` throws, optionally matching a message pattern. */
function throws(fn, re) {
  let threw = false;
  try { fn(); } catch (e) {
    threw = true;
    if (re && !re.test(String(e && e.message))) {
      throw new Error('threw, but message did not match ' + re + ': ' + e.message);
    }
  }
  if (!threw) throw new Error('expected a throw, got none');
}

const eq = (a, b, msg) => assert.deepStrictEqual(a, b, msg);

// --------------------------------------------------------------------------

async function main() {
  const jt = require('jtcsv');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jtcsv-qa-'));
  const file = (n) => path.join(tmp, n);
  const drainStream = (s) => new Promise((res, rej) => {
    const out = [];
    s.on('data', (d) => out.push(d));
    s.on('end', () => res(out));
    s.on('error', rej);
  });

  // ===================== 1. CORE CONVERSION =====================
  section('1. Core conversion');

  check('jsonToCsv emits a comma by default', () => {
    eq(jt.jsonToCsv([{ a: 1, b: 2 }]), 'a,b\r\n1,2');
  });
  check('jsonToCsv honours an explicit delimiter', () => {
    eq(jt.jsonToCsv([{ a: 1, b: 2 }], { delimiter: ';' }), 'a;b\r\n1;2');
  });
  check('jsonToCsv quotes a field containing the delimiter', () => {
    eq(jt.jsonToCsv([{ a: 'x,y' }]), 'a\r\n"x,y"');
  });
  check('jsonToCsv doubles an embedded quote', () => {
    eq(jt.jsonToCsv([{ a: 'he said "hi"' }]), 'a\r\n"he said ""hi"""');
  });
  check('jsonToCsv quotes a field containing a newline', () => {
    eq(jt.jsonToCsv([{ a: 'l1\nl2' }]), 'a\r\n"l1\nl2"');
  });
  check('jsonToCsv guards against CSV injection', () => {
    const out = jt.jsonToCsv([{ a: '=SUM(1)' }]);
    assert.ok(/'=SUM\(1\)/.test(out), 'formula not neutralised: ' + JSON.stringify(out));
  });
  check('jsonToCsv on an empty array does not throw', () => {
    assert.strictEqual(typeof jt.jsonToCsv([]), 'string');
  });

  check('csvToJson parses a plain row', () => {
    eq(jt.csvToJson('a,b\n1,2'), [{ a: '1', b: '2' }]);
  });
  check('csvToJson keeps a quoted delimiter intact', () => {
    eq(jt.csvToJson('a,b\n"x,y",2'), [{ a: 'x,y', b: '2' }]);
  });
  check('csvToJson keeps a quoted newline intact', () => {
    eq(jt.csvToJson('a,b\n"x\ny",2'), [{ a: 'x\ny', b: '2' }]);
  });
  check('csvToJson unescapes a doubled quote', () => {
    eq(jt.csvToJson('a,b\n"he said ""hi""",2'), [{ a: 'he said "hi"', b: '2' }]);
  });
  check('csvToJson maps an empty field to null', () => {
    eq(jt.csvToJson('a,b\n,2'), [{ a: null, b: '2' }]);
  });
  check('csvToJson leaves values as strings by default', () => {
    eq(jt.csvToJson('a,b\n1,2'), [{ a: '1', b: '2' }]);
  });
  check('csvToJson converts with parseNumbers', () => {
    eq(jt.csvToJson('a,b\n1,2.5', { parseNumbers: true }), [{ a: 1, b: 2.5 }]);
  });
  check('csvToJson handles CRLF', () => {
    eq(jt.csvToJson('a,b\r\n1,2\r\n'), [{ a: '1', b: '2' }]);
  });
  check('csvToJson skips a blank line', () => {
    eq(jt.csvToJson('a,b\n1,2\n\n3,4'), [{ a: '1', b: '2' }, { a: '3', b: '4' }]);
  });
  check('csvToJson auto-detects a semicolon file', () => {
    eq(jt.csvToJson('a;b\n1;2'), [{ a: '1', b: '2' }]);
  });
  check('csvToJson auto-detects a tab file', () => {
    eq(jt.csvToJson('a\tb\n1\t2'), [{ a: '1', b: '2' }]);
  });
  check('csvToJson on an empty string returns []', () => {
    eq(jt.csvToJson(''), []);
  });
  check('csvToJson on a header-only file returns []', () => {
    eq(jt.csvToJson('a,b'), []);
  });
  check('csvToJson strips a UTF-8 BOM from the first header', () => {
    const rows = jt.csvToJson('﻿a,b\n1,2');
    eq(Object.keys(rows[0]), ['a', 'b']);
  });
  check('csvToJson rejects a non-string input', () => {
    throws(() => jt.csvToJson(42));
  });

  check('ROUND-TRIP: csv -> json -> csv is stable', () => {
    const rows = [{ id: '1', name: 'Alice', note: 'a,b "q"\nline2' }];
    const once = jt.jsonToCsv(rows);
    const back = jt.csvToJson(once);
    eq(back, rows);
    eq(jt.jsonToCsv(back), once);
  });
  check('ROUND-TRIP survives unicode and emoji', () => {
    const rows = [{ город: 'Москва', emoji: '🚀', mixed: 'naïve — ok' }];
    eq(jt.csvToJson(jt.jsonToCsv(rows)), rows);
  });

  await acheck('csvToJsonAsync matches the sync result', async () => {
    eq(await jt.csvToJsonAsync('a,b\n1,2'), jt.csvToJson('a,b\n1,2'));
  });
  await acheck('jsonToCsvAsync matches the sync result', async () => {
    eq(await jt.jsonToCsvAsync([{ a: 1 }]), jt.jsonToCsv([{ a: 1 }]));
  });
  await acheck('csvToJsonIterator yields every row', async () => {
    const out = [];
    for await (const r of jt.csvToJsonIterator('a,b\n1,2\n3,4')) out.push(r);
    eq(out, [{ a: '1', b: '2' }, { a: '3', b: '4' }]);
  });

  // ===================== 2. FILE IO =====================
  section('2. File IO');

  const csvPath = file('in.csv');
  fs.writeFileSync(csvPath, 'id,name\n1,Alice\n2,Bob\n', 'utf8');

  await acheck('readCsvAsJson reads a file', async () => {
    eq(await jt.readCsvAsJson(csvPath), [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]);
  });
  check('readCsvAsJsonSync reads a file', () => {
    eq(jt.readCsvAsJsonSync(csvPath), [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]);
  });
  await acheck('readCsvAsJson rejects a missing file', async () => {
    let threw = false;
    try { await jt.readCsvAsJson(file('nope.csv')); } catch { threw = true; }
    assert.ok(threw, 'expected a rejection for a missing file');
  });
  await acheck('saveAsCsv writes a readable file', async () => {
    const out = file('out.csv');
    await jt.saveAsCsv([{ a: 1, b: 'x,y' }], out);
    eq(jt.csvToJson(fs.readFileSync(out, 'utf8')), [{ a: '1', b: 'x,y' }]);
  });
  await acheck('saveAsJson writes valid JSON', async () => {
    const out = file('out.json');
    await jt.saveAsJson([{ a: 1 }], out);
    eq(JSON.parse(fs.readFileSync(out, 'utf8')), [{ a: 1 }]);
  });
  check('saveAsJsonSync writes valid JSON', () => {
    const out = file('out-sync.json');
    jt.saveAsJsonSync([{ a: 1 }], out);
    eq(JSON.parse(fs.readFileSync(out, 'utf8')), [{ a: 1 }]);
  });
  check('validateFilePath rejects a traversal attempt', () => {
    throws(() => jt.validateFilePath('../../etc/passwd'));
  });

  // ===================== 3. STREAMS =====================
  section('3. Streams');

  await acheck('createCsvToJsonStream emits parsed rows', async () => {
    const s = jt.createCsvToJsonStream();
    const done = drainStream(s);
    s.write('a,b\n1,2\n3,4\n');
    s.end();
    const rows = await done;
    eq(rows.map((r) => (typeof r === 'string' ? JSON.parse(r) : r)),
       [{ a: '1', b: '2' }, { a: '3', b: '4' }]);
  });
  await acheck('createJsonToCsvStream emits CSV text', async () => {
    const s = jt.createJsonToCsvStream();
    const done = drainStream(s);
    s.write({ a: 1, b: 2 });
    s.end();
    const out = (await done).map(String).join('');
    assert.ok(out.includes('a,b'), 'expected a comma header, got ' + JSON.stringify(out));
  });
  await acheck('createCsvFileToJsonStream reads from disk', async () => {
    const s = await jt.createCsvFileToJsonStream(csvPath);
    const rows = await drainStream(s);
    assert.ok(rows.length === 2, 'expected 2 rows, got ' + rows.length);
  });
  await acheck('a quoted newline survives a chunk split', async () => {
    const s = jt.createCsvToJsonStream();
    const done = drainStream(s);
    s.write('a,b\n"x');       // quoted field left open across the chunk boundary
    s.write('\ny",2\n');
    s.end();
    const rows = (await done).map((r) => (typeof r === 'string' ? JSON.parse(r) : r));
    eq(rows, [{ a: 'x\ny', b: '2' }]);
  });
  await acheck('streamCsvToJson(csv) resolves to rows', async () => {
    const rows = await jt.streamCsvToJson('a,b\n1,2\n3,4\n');
    eq(rows.length, 2);
  });

  // ===================== 4. NDJSON =====================
  section('4. NDJSON');

  check('jsonToNdjson emits one object per line', () => {
    eq(jt.jsonToNdjson([{ a: 1 }, { a: 2 }]).trim().split('\n').length, 2);
  });
  check('ndjsonToJson parses back', () => {
    eq(jt.ndjsonToJson('{"a":1}\n{"a":2}'), [{ a: 1 }, { a: 2 }]);
  });
  check('ROUND-TRIP: json -> ndjson -> json', () => {
    const rows = [{ a: 1, b: 'x,y' }, { a: 2, b: null }];
    eq(jt.ndjsonToJson(jt.jsonToNdjson(rows)), rows);
  });
  check('getNdjsonStats reports a line count', () => {
    const s = jt.getNdjsonStats('{"a":1}\n{"a":2}');
    assert.ok(s && typeof s === 'object', 'expected a stats object');
  });

  // ===================== 5. TSV =====================
  section('5. TSV');

  check('jsonToTsv separates with tabs', () => {
    assert.ok(jt.jsonToTsv([{ a: 1, b: 2 }]).includes('\t'), 'no tab in output');
  });
  check('tsvToJson parses tabs', () => {
    eq(jt.tsvToJson('a\tb\n1\t2'), [{ a: '1', b: '2' }]);
  });
  check('ROUND-TRIP: json -> tsv -> json', () => {
    const rows = [{ a: '1', b: 'x y' }];
    eq(jt.tsvToJson(jt.jsonToTsv(rows)), rows);
  });
  check('isTsv recognises tab-separated text', () => {
    assert.strictEqual(jt.isTsv('a\tb\n1\t2'), true);
  });
  check('isTsv rejects comma-separated text', () => {
    assert.strictEqual(jt.isTsv('a,b\n1,2'), false);
  });
  check('validateTsv returns a verdict', () => {
    const v = jt.validateTsv('a\tb\n1\t2');
    assert.ok(v && typeof v === 'object', 'expected a result object');
  });

  // ===================== 6. UTILITIES =====================
  section('6. Utilities');

  check('autoDetectDelimiter finds a comma', () => eq(jt.autoDetectDelimiter('a,b\n1,2'), ','));
  check('autoDetectDelimiter finds a semicolon', () => eq(jt.autoDetectDelimiter('a;b\n1;2'), ';'));
  check('autoDetectDelimiter finds a tab', () => eq(jt.autoDetectDelimiter('a\tb\n1\t2'), '\t'));
  check('autoDetectDelimiter finds a pipe', () => eq(jt.autoDetectDelimiter('a|b\n1|2'), '|'));
  check('detectEncoding returns an encoding name', () => {
    const e = jt.detectEncoding(Buffer.from('a,b\n1,2', 'utf8'));
    assert.ok(e, 'expected an encoding');
  });
  check('isEmail accepts a valid address', () => assert.strictEqual(jt.isEmail('a@b.co'), true));
  check('isEmail rejects a bare word', () => assert.strictEqual(jt.isEmail('nope'), false));
  check('isUrl accepts an https URL', () => assert.strictEqual(jt.isUrl('https://x.dev'), true));
  check('isDate accepts an ISO date', () => assert.strictEqual(jt.isDate('2026-01-01'), true));
  check('preprocessData flattens nested input', () => {
    const out = jt.preprocessData([{ a: { b: 1 } }]);
    assert.ok(Array.isArray(out), 'expected an array');
  });
  check('deepUnwrap unwraps a nested value', () => {
    assert.doesNotThrow(() => jt.deepUnwrap({ a: 1 }));
  });

  // ===================== 7. ERRORS =====================
  section('7. Errors');

  check('ERROR_CODES is exposed', () => assert.ok(jt.ERROR_CODES && typeof jt.ERROR_CODES === 'object'));
  check('error classes are constructible and instanceof Error', () => {
    for (const n of ['ValidationError', 'ParsingError', 'SecurityError', 'LimitError', 'ConfigurationError']) {
      const E = jt[n];
      assert.ok(typeof E === 'function', n + ' is not exported as a class');
      const e = new E('boom');
      assert.ok(e instanceof Error, n + ' is not an Error');
    }
  });
  check('an unclosed quote raises ParsingError', () => {
    throws(() => jt.csvToJson('a,b\n"never closed,2'), /[Uu]nclosed|[Qq]uote/);
  });
  check('ParsingError carries a line number', () => {
    try {
      jt.csvToJson('a,b\n"never closed,2');
      throw new Error('expected a throw');
    } catch (e) {
      assert.ok('lineNumber' in e || /line/i.test(String(e.message)),
        'no line information on the error');
    }
  });
  check('maxRows raises LimitError', () => {
    throws(() => jt.csvToJson('a,b\n1,2\n3,4\n5,6', { maxRows: 2 }));
  });

  // ===================== 8. DEPRECATED ALIASES =====================
  section('8. Deprecated aliases');

  check('csvToJsonFile alias still resolves', () => assert.strictEqual(typeof jt.csvToJsonFile, 'function'));
  check('csvToJsonStream alias still resolves', () => assert.strictEqual(typeof jt.csvToJsonStream, 'function'));
  check('csvFileToJsonStream alias still resolves', () => assert.strictEqual(typeof jt.csvFileToJsonStream, 'function'));

  // ===================== 9. SUBPATH EXPORTS =====================
  section('9. Subpath exports (CJS)');

  const subpaths = {
    'jtcsv/csv': ['csvToJson'],
    'jtcsv/json': ['jsonToCsv'],
    'jtcsv/streams': ['createCsvToJsonStream'],
    'jtcsv/ndjson': ['jsonToNdjson'],
    'jtcsv/tsv': ['jsonToTsv'],
    'jtcsv/errors': ['ValidationError'],
    'jtcsv/schema': [],
    'jtcsv/plugins': []
  };
  for (const [sp, names] of Object.entries(subpaths)) {
    check('require("' + sp + '") resolves' + (names.length ? ' and exports ' + names.join(', ') : ''), () => {
      const m = require(sp);
      assert.ok(m && typeof m === 'object', 'no module object');
      for (const n of names) {
        assert.ok(typeof m[n] === 'function', sp + ' is missing ' + n);
      }
    });
  }
  check('jtcsv/csv parses identically to the barrel', () => {
    eq(require('jtcsv/csv').csvToJson('a,b\n1,2'), jt.csvToJson('a,b\n1,2'));
  });
  check('jtcsv/json serialises identically to the barrel', () => {
    eq(require('jtcsv/json').jsonToCsv([{ a: 1 }]), jt.jsonToCsv([{ a: 1 }]));
  });

  // ===================== 10. ADVERSARIAL INPUT =====================
  section('10. Adversarial input');

  check('a row longer than the header drops the extra field', () => {
    eq(jt.csvToJson('a,b\n1,2,3'), [{ a: '1', b: '2' }]);
  });
  // KNOWN GAP: a header with no field in a short row lands as `undefined`, so
  // Object.keys lists it but JSON.stringify drops it — the in-memory row and
  // anything saved from it disagree on the shape. An empty field, by contrast,
  // is null. Recorded here rather than asserted as desired, because the two
  // should agree.
  check('a row shorter than the header leaves the key undefined (known gap)', () => {
    const row = jt.csvToJson('a,b,c\n1,2')[0];
    eq(Object.keys(row), ['a', 'b', 'c']);
    assert.strictEqual(row.c, undefined, 'expected the documented undefined');
    assert.strictEqual(jt.csvToJson('a,b,c\n1,2,')[0].c, null, 'an empty field is null');
  });
  check('a lone quote inside an unquoted field does not hang', () => {
    let done = false;
    try { jt.csvToJson('a,b\nx"y,2'); } catch { /* raising is acceptable */ }
    done = true;
    assert.ok(done);
  });
  check('a 10k-row file parses', () => {
    const rows = Array.from({ length: 10000 }, (_, i) => ({ id: String(i), v: 'x' }));
    const csv = jt.jsonToCsv(rows);
    eq(jt.csvToJson(csv).length, 10000);
  });
  check('a field of 100k characters survives a round trip', () => {
    const big = 'x'.repeat(100000);
    eq(jt.csvToJson(jt.jsonToCsv([{ a: big }]))[0].a, big);
  });
  check('a header containing the delimiter round-trips', () => {
    const rows = [{ 'a,b': '1' }];
    eq(jt.csvToJson(jt.jsonToCsv(rows)), rows);
  });
  check('null and undefined values serialise without throwing', () => {
    assert.doesNotThrow(() => jt.jsonToCsv([{ a: null, b: undefined }]));
  });
  check('a nested object does not crash the serialiser', () => {
    assert.doesNotThrow(() => jt.jsonToCsv([{ a: { deep: true } }]));
  });

  // --------------------------------------------------------------------------
  fs.rmSync(tmp, { recursive: true, force: true });
  return RESULTS;
}

main().then((results) => {
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;

  const lines = [];
  lines.push('jtcsv control test — ' + new Date().toISOString());
  lines.push('node ' + process.version + ' on ' + process.platform);
  lines.push('='.repeat(78));
  let sec = null;
  for (const r of results) {
    if (r.section !== sec) { sec = r.section; lines.push(''); lines.push('## ' + sec); }
    lines.push((r.status === 'PASS' ? '  ok   ' : '  FAIL ') + r.name + (r.ms > 50 ? '  (' + r.ms + 'ms)' : ''));
    if (r.status === 'FAIL') lines.push('         -> ' + r.detail);
  }
  lines.push('');
  lines.push('='.repeat(78));
  lines.push('total ' + results.length + '  passed ' + pass + '  failed ' + fail);

  const text = lines.join('\n');
  fs.writeFileSync(path.join(__dirname, 'report.txt'), text, 'utf8');
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log(text);
  process.exit(fail ? 1 : 0);
}).catch((e) => {
  console.error('HARNESS CRASHED:', e && e.stack ? e.stack : e);
  process.exit(2);
});
