/**
 * Regression: the CLI silently corrupted every standard comma CSV.
 *
 * `parseOptions` hardcoded `delimiter: ';'`, and the parser only auto-detects
 * when that option is falsy. So `jtcsv csv-to-json data.csv` parsed
 *
 *     id,name,city
 *     1,Alice,Berlin
 *
 * into a single column literally named "id,name,city" — and printed
 * "✓ Converted 2 rows" while doing it. Comma files are the overwhelming
 * majority of CSV in the wild, so this hit almost every first-time user of
 * the documented entry point.
 *
 * These tests drive the built CLI the way a user does, through argv and the
 * filesystem, because the bug lived in argument parsing rather than in any
 * function the library tests already cover.
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);
const CLI = path.join(__dirname, '..', 'dist', 'bin', 'jtcsv.js');

let dir: string;

async function convert(csv: string, args: string[] = []): Promise<any> {
  const stamp = Math.random().toString(36).slice(2);
  const input = path.join(dir, `in-${stamp}.csv`);
  const output = path.join(dir, `out-${stamp}.json`);
  await fs.writeFile(input, csv, 'utf8');
  await execFileAsync(process.execPath, [CLI, 'csv-to-json', input, '--output', output, ...args]);
  return JSON.parse(await fs.readFile(output, 'utf8'));
}

describe('CLI delimiter handling', () => {
  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jtcsv-cli-'));
    // The suite needs the built CLI; skip loudly rather than fail cryptically.
    await fs.access(CLI);
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('parses a plain comma CSV into separate columns', async () => {
    expect(await convert('id,name\n1,Alice\n2,Bob\n')).toEqual([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' }
    ]);
  });

  test('keeps a comma inside a quoted field together', async () => {
    expect(await convert('id,name,city\n1,Alice,Berlin\n2,Bob,"Paris, France"\n')).toEqual([
      { id: '1', name: 'Alice', city: 'Berlin' },
      { id: '2', name: 'Bob', city: 'Paris, France' }
    ]);
  });

  test('still auto-detects a semicolon file', async () => {
    expect(await convert('a;b\n1;2\n')).toEqual([{ a: '1', b: '2' }]);
  });

  test('still auto-detects a tab file', async () => {
    expect(await convert('a\tb\n1\t2\n')).toEqual([{ a: '1', b: '2' }]);
  });

  test('an explicit --delimiter overrides detection', async () => {
    // The user asked for semicolons on a comma file, so one column is correct.
    expect(await convert('id,name\n1,Alice\n', ['--delimiter=;'])).toEqual([
      { 'id,name': '1,Alice' }
    ]);
  });

  test('never collapses a comma file into one column', async () => {
    const rows = await convert('a,b,c\n1,2,3\n');
    expect(Object.keys(rows[0])).toEqual(['a', 'b', 'c']);
  });
});
