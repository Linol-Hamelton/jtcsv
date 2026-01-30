import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  createJsonToCsvStream,
  saveJsonStreamAsCsv,
  createJsonReadableStream
} from '../stream-json-to-csv';
import { createSchemaValidators } from '../src/utils/schema-validator';
import { ValidationError } from '../errors';

describe('stream-json-to-csv additional coverage', () => {
  const tempDir = path.join(__dirname, 'tmp-stream-json');

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('formats date-time values via schema', (done) => {
    const stream = createJsonToCsvStream({
      delimiter: ',',
      includeHeaders: true,
      schema: {
        properties: {
          id: { type: 'integer' },
          created: { type: 'string', format: 'date-time' }
        }
      }
    });

    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk.toString()));
    stream.on('end', () => {
      const csv = chunks.join('');
      expect(csv).toContain('id,created');
      expect(csv).toContain('1,2020-01-01T00:00:00.000Z');
      done();
    });

    stream.write({ id: 1, created: new Date('2020-01-01T00:00:00Z') });
    stream.end();
  });

  test('rejects invalid values with schema validation', (done) => {
    const stream = createJsonToCsvStream({
      schema: {
        properties: {
          id: { type: 'integer', minimum: 1 },
          name: { type: 'string', minLength: 2 }
        }
      }
    });

    stream.on('error', (error) => {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('Invalid value for field');
      done();
    });

    stream.write({ id: 0, name: 'A' });
  });

  test('writes template headers on flush when no data', (done) => {
    const stream = createJsonToCsvStream({
      template: { id: null, name: null },
      includeHeaders: true
    });

    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk.toString()));
    stream.on('end', () => {
      expect(chunks.join('')).toBe('id;name\n');
      done();
    });

    stream.end();
  });

  test('rejects invalid transform results', (done) => {
    const stream = createJsonToCsvStream({
      transform: () => 'bad'
    });

    stream.on('error', (error) => {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('Transform function must return an object');
      done();
    });

    stream.write({ id: 1 });
  });

  test('rejects transform errors', (done) => {
    const stream = createJsonToCsvStream({
      transform: () => {
        throw new Error('boom');
      }
    });

    stream.on('error', (error) => {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('Transform function error');
      done();
    });

    stream.write({ id: 1 });
  });

  test('escapes values and protects against CSV injection', (done) => {
    const stream = createJsonToCsvStream({
      delimiter: ',',
      includeHeaders: true
    });

    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk.toString()));
    stream.on('end', () => {
      const output = chunks.join('');
      expect(output.startsWith('a,b,c,d,e,f\n')).toBe(true);
       expect(output).toContain('\n,,\'=1+1,');
      expect(output).toContain('"a,b"');
      expect(output).toContain('"He said ""hi"""');
      expect(output).toContain('"Line1\nLine2"');
      done();
    });

    stream.write({
      a: null,
      b: '',
      c: '=1+1',
      d: 'a,b',
      e: 'He said "hi"',
      f: 'Line1\nLine2'
    });
    stream.end();
  });

  test('orders headers using template and keeps extra fields', (done) => {
    const stream = createJsonToCsvStream({
      template: { id: null },
      includeHeaders: true
    });

    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk.toString()));
    stream.on('end', () => {
      const output = chunks.join('');
      expect(output.startsWith('id;extra\n')).toBe(true);
      done();
    });

    stream.write({ extra: 'x', id: 1 });
    stream.end();
  });

  test('rejects invalid options', () => {
    expect(() => createJsonToCsvStream({ delimiter: 1 }))
      .toThrow('Delimiter must be a string');
    expect(() => createJsonToCsvStream({ delimiter: ',,' }))
      .toThrow('Delimiter must be a single character');
    expect(() => createJsonToCsvStream({ renameMap: 'bad' }))
      .toThrow('renameMap must be an object');
    expect(() => createJsonToCsvStream({ template: 'bad' }))
      .toThrow('template must be an object');
    expect(() => createJsonToCsvStream({ maxRecords: 0 }))
      .toThrow('maxRecords must be a positive number or Infinity');
    expect(() => createJsonToCsvStream({ transform: 'bad' }))
      .toThrow('transform must be a function');
    expect(() => createJsonToCsvStream({ schema: 'bad' }))
      .toThrow('schema must be an object');
  });

  test('saveJsonStreamAsCsv writes BOM by default and supports disabling', async () => {
    const data = [{ id: 1, name: 'Jane' }];
    const inputStream = createJsonReadableStream(data);
    const defaultPath = path.join(tempDir, 'default.csv');
    const noBomPath = path.join(tempDir, 'no-bom.csv');

    await saveJsonStreamAsCsv(inputStream, defaultPath, { delimiter: ',' });
    const withBom = fs.readFileSync(defaultPath, 'utf8');
    expect(withBom[0]).toBe('\uFEFF');

    const noBomStream = createJsonReadableStream(data);
    await saveJsonStreamAsCsv(noBomStream, noBomPath, { delimiter: ',', addBOM: false });
    const withoutBom = fs.readFileSync(noBomPath, 'utf8');
    expect(withoutBom[0]).not.toBe('\uFEFF');
  });

  test('saveJsonStreamAsCsv rejects invalid paths', async () => {
    const data = [{ id: 1 }];
    const inputStream = createJsonReadableStream(data);

    await expect(saveJsonStreamAsCsv(inputStream, ''))
      .rejects
      .toThrow('File path must be a non-empty string');

    const inputStream2 = createJsonReadableStream(data);
    await expect(saveJsonStreamAsCsv(inputStream2, 'data.txt'))
      .rejects
      .toThrow('File must have .csv extension');

    const inputStream3 = createJsonReadableStream(data);
    await expect(saveJsonStreamAsCsv(inputStream3, '../data.csv'))
      .rejects
      .toThrow('Directory traversal detected in file path');
  });

  test('createSchemaValidators handles formats and constraints', () => {
    const validators = createSchemaValidators({
      properties: {
        created: { type: 'string', format: 'date-time' },
        name: { type: 'string', minLength: 2, maxLength: 5, pattern: '^[A-Z]' },
        age: { type: 'integer', minimum: 18, maximum: 30 },
        score: { type: 'number' },
        active: { type: 'boolean' }
      },
      required: ['name']
    });

    expect(validators.created.format(new Date('2020-01-01T00:00:00Z')))
      .toBe('2020-01-01T00:00:00.000Z');
    expect(validators.created.format('2020-01-02T00:00:00Z'))
      .toBe('2020-01-02T00:00:00.000Z');
    expect(validators.created.format('not-a-date')).toBe('not-a-date');

    expect(validators.name.validate(null)).toBe(false);
    expect(validators.name.validate(123)).toBe(false);
    expect(validators.name.validate('A')).toBe(false);
    expect(validators.name.validate('TOOLONG')).toBe(false);
    expect(validators.name.validate('john')).toBe(false);
    expect(validators.name.validate('John')).toBe(true);

    expect(validators.age.validate(17)).toBe(false);
    expect(validators.age.validate(31)).toBe(false);
    expect(validators.age.validate(20)).toBe(true);
    expect(validators.age.validate(1.2)).toBe(false);

    expect(validators.score.validate('3')).toBe(false);
    expect(validators.active.validate('true')).toBe(false);
  });

  test('createSchemaValidators returns empty validators without properties', () => {
    expect(createSchemaValidators({})).toEqual({});
  });

  test('createJsonReadableStream handles backpressure', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    const stream = createJsonReadableStream(data);
    const originalPush = stream.push.bind(stream);
    let pushCalls = 0;

    stream.push = (chunk) => {
      pushCalls += 1;
      if (pushCalls === 1) {
        originalPush(chunk);
        return false;
      }
      return originalPush(chunk);
    };

    stream.read();
    expect(stream._index).toBe(1);
  });
});
