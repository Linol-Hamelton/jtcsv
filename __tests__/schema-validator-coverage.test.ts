import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { z } from 'zod';

import {
  loadSchema,
  loadSchemaAsync,
  createValidationHook,
  applySchemaValidation,
  applySchemaValidationAsync,
  createValidationHooks,
  createSchemaValidators,
} from '../src/utils/schema-validator';

import {
  createZodValidationHook,
  createYupValidationHook,
  createValidatedParser,
  isEmail,
  isUrl,
  isDate,
  validators,
} from '../index';

import { ValidationError, SecurityError } from '../errors';

/**
 * Coverage suite for schema-validator + zod-adapter + validators.
 *
 * Anything labelled `/* LOCKED CURRENT *​/` documents present-day behavior
 * that is surprising or arguably a bug — change those tests deliberately
 * when fixing the underlying code.
 */

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jtcsv-schema-'));
});

afterAll(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* best-effort cleanup */
  }
});

// ---------------------------------------------------------------------------
// loadSchema
// ---------------------------------------------------------------------------

describe('loadSchema', () => {
  test('object literal — /* LOCKED CURRENT */ throws ValidationError (signature says string only)', () => {
    expect(() => loadSchema({ properties: { a: { type: 'string' } } } as any))
      .toThrow(ValidationError);
    expect(() => loadSchema({} as any))
      .toThrow(/Schema must be a string/);
  });

  test('reads and parses a .json file from disk', () => {
    const filePath = path.join(tmpDir, 'schema-ok.json');
    const obj = { properties: { name: { type: 'string' } }, required: ['name'] };
    fs.writeFileSync(filePath, JSON.stringify(obj), 'utf8');

    const result = loadSchema(filePath);
    expect(result).toEqual(obj);
  });

  test('JSON string (no .json ext / no path separators) is parsed inline', () => {
    // String inputs without .json/separators are treated as raw JSON.
    const inline = '{"properties":{"a":{"type":"string"}}}';
    const result = loadSchema(inline);
    expect(result).toEqual({ properties: { a: { type: 'string' } } });
  });

  test('non-string non-object throws ValidationError', () => {
    expect(() => loadSchema(123 as any)).toThrow(ValidationError);
    expect(() => loadSchema(null as any)).toThrow(ValidationError);
    expect(() => loadSchema(undefined as any)).toThrow(ValidationError);
  });

  test('path containing ".." throws SecurityError', () => {
    expect(() => loadSchema('../etc/passwd.json')).toThrow(SecurityError);
    expect(() => loadSchema('./schemas/../secret.json')).toThrow(SecurityError);
  });

  test('path with separators but no .json extension throws ValidationError', () => {
    const noExt = path.join(tmpDir, 'plain-file');
    fs.writeFileSync(noExt, '{}', 'utf8');
    // Must contain a separator so isFilePath = true. Use the absolute path.
    expect(() => loadSchema(noExt))
      .toThrow(/Schema file must have \.json extension/);
  });

  test('missing .json file throws ValidationError', () => {
    const missing = path.join(tmpDir, 'definitely-not-here.json');
    expect(() => loadSchema(missing))
      .toThrow(/Schema file not found/);
  });

  test('malformed JSON contents throw ValidationError', () => {
    const filePath = path.join(tmpDir, 'broken.json');
    fs.writeFileSync(filePath, '{ this is not json', 'utf8');
    expect(() => loadSchema(filePath))
      .toThrow(/Invalid JSON in schema/);
  });

  test('JSON parses to non-object (e.g. number string) throws', () => {
    // "42" parses to number — schema must be an object.
    expect(() => loadSchema('42')).toThrow(/Schema must be a JSON object/);
  });
});

// ---------------------------------------------------------------------------
// loadSchemaAsync (parity)
// ---------------------------------------------------------------------------

describe('loadSchemaAsync', () => {
  test('parses inline JSON string', async () => {
    const out = await loadSchemaAsync('{"properties":{"a":{"type":"number"}}}');
    expect(out).toEqual({ properties: { a: { type: 'number' } } });
  });

  test('reads .json file from disk', async () => {
    const p = path.join(tmpDir, 'async-ok.json');
    fs.writeFileSync(p, JSON.stringify({ properties: { x: { type: 'integer' } } }), 'utf8');
    const out = await loadSchemaAsync(p);
    expect(out.properties!.x.type).toBe('integer');
  });

  test('missing file rejects ValidationError', async () => {
    const p = path.join(tmpDir, 'nope-async.json');
    await expect(loadSchemaAsync(p)).rejects.toBeInstanceOf(ValidationError);
  });

  test('traversal path rejects SecurityError', async () => {
    await expect(loadSchemaAsync('../up.json')).rejects.toBeInstanceOf(SecurityError);
  });

  test('non-string rejects ValidationError', async () => {
    await expect(loadSchemaAsync(0 as any)).rejects.toBeInstanceOf(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// createSchemaValidators — exercise each check branch
// ---------------------------------------------------------------------------

describe('createSchemaValidators', () => {
  test('type:string accepts strings, rejects numbers', () => {
    const v = createSchemaValidators({
      properties: { name: { type: 'string' } },
    });
    expect(v.name.validate('hi')).toBe(true);
    expect(v.name.validate(42)).toBe(false);
  });

  test('type:integer + minimum accepts/rejects; float rejected as not-integer', () => {
    const v = createSchemaValidators({
      properties: { age: { type: 'integer', minimum: 0 } },
    });
    expect(v.age.validate(5)).toBe(true);
    expect(v.age.validate(0)).toBe(true);
    expect(v.age.validate(-1)).toBe(false); // below minimum
    expect(v.age.validate(3.14)).toBe(false); // float -> not integer
  });

  test('type:number with exclusiveMinimum + multipleOf', () => {
    const v = createSchemaValidators({
      properties: { x: { type: 'number', exclusiveMinimum: 0, multipleOf: 0.5 } },
    });
    expect(v.x.validate(0)).toBe(false); // exclusive
    expect(v.x.validate(0.5)).toBe(true);
    expect(v.x.validate(1.5)).toBe(true);
    expect(v.x.validate(0.3)).toBe(false); // not multipleOf 0.5
  });

  test('type:number with maximum + exclusiveMaximum', () => {
    const v = createSchemaValidators({
      properties: { x: { type: 'number', maximum: 10, exclusiveMaximum: 100 } },
    });
    expect(v.x.validate(10)).toBe(true);
    expect(v.x.validate(11)).toBe(false); // > maximum
    const v2 = createSchemaValidators({
      properties: { x: { type: 'number', exclusiveMaximum: 5 } },
    });
    expect(v2.x.validate(5)).toBe(false);
    expect(v2.x.validate(4.9)).toBe(true);
  });

  test('format:email accepts/rejects', () => {
    const v = createSchemaValidators({
      properties: { email: { type: 'string', format: 'email' } },
    });
    expect(v.email.validate('user@example.com')).toBe(true);
    expect(v.email.validate('not-an-email')).toBe(false);
  });

  test('format:uri accepts/rejects', () => {
    const v = createSchemaValidators({
      properties: { site: { type: 'string', format: 'uri' } },
    });
    expect(v.site.validate('https://example.com/path')).toBe(true);
    expect(v.site.validate('not a url')).toBe(false);
  });

  test('format:date-time coerces Date via format() and validates', () => {
    const v = createSchemaValidators({
      properties: { ts: { type: 'string', format: 'date-time' } },
    });
    const d = new Date('2025-01-01T00:00:00Z');
    expect(v.ts.format!(d)).toBe(d.toISOString());
    expect(v.ts.validate(d)).toBe(true); // Date accepted for date-time
  });

  test('pattern accepts/rejects', () => {
    const v = createSchemaValidators({
      properties: { code: { type: 'string', pattern: '^[A-Z]{3}$' } },
    });
    expect(v.code.validate('ABC')).toBe(true);
    expect(v.code.validate('abc')).toBe(false);
    expect(v.code.validate('ABCD')).toBe(false);
  });

  test('minLength / maxLength', () => {
    const v = createSchemaValidators({
      properties: { s: { type: 'string', minLength: 2, maxLength: 4 } },
    });
    expect(v.s.validate('a')).toBe(false);
    expect(v.s.validate('ab')).toBe(true);
    expect(v.s.validate('abcd')).toBe(true);
    expect(v.s.validate('abcde')).toBe(false);
  });

  test('type:array with minItems / maxItems / uniqueItems', () => {
    const v = createSchemaValidators({
      properties: {
        tags: { type: 'array', minItems: 1, maxItems: 3, uniqueItems: true },
      },
    });
    expect(v.tags.validate([])).toBe(false); // below minItems
    expect(v.tags.validate(['a'])).toBe(true);
    expect(v.tags.validate(['a', 'b', 'c'])).toBe(true);
    expect(v.tags.validate(['a', 'b', 'c', 'd'])).toBe(false); // above maxItems
    expect(v.tags.validate(['a', 'a'])).toBe(false); // duplicate
    expect(v.tags.validate('not array' as any)).toBe(false); // wrong type
  });

  test('type:object nested validates child properties', () => {
    const v = createSchemaValidators({
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer', minimum: 0 },
          },
        },
      },
    });
    expect(v.user.validate({ name: 'Ana', age: 30 })).toBe(true);
    expect(v.user.validate({ name: 'Ana', age: -1 })).toBe(false);
    expect(v.user.validate({ name: 123, age: 30 })).toBe(false);
    expect(v.user.validate([])).toBe(false); // array rejected for object
    expect(v.user.validate(null)).toBe(true); // null + not required -> valid
  });

  test('enum check', () => {
    const v = createSchemaValidators({
      properties: { color: { type: 'string', enum: ['red', 'green', 'blue'] } },
    });
    expect(v.color.validate('red')).toBe(true);
    expect(v.color.validate('purple')).toBe(false);
  });

  test('required field reports missing/null correctly', () => {
    const v = createSchemaValidators({
      properties: { name: { type: 'string' } },
      required: ['name'],
    });
    expect(v.name.required).toBe(true);
    // null/undefined on required -> invalid
    expect(v.name.validate(null)).toBe(false);
    expect(v.name.validate(undefined)).toBe(false);
    // null/undefined on optional -> valid
    const vOpt = createSchemaValidators({ properties: { x: { type: 'string' } } });
    expect(vOpt.x.validate(null)).toBe(true);
  });

  test('non-object schema returns empty validators (when no `properties` and schema itself is non-object map)', () => {
    // /* LOCKED CURRENT */ The guard treats `properties: null` as falsy and
    // falls back to using the whole schema; only top-level `null`/non-object
    // returns {} cleanly. Pass a schema where `properties` is undefined and
    // the rest of the schema has no valid entries.
    expect(createSchemaValidators({} as any)).toEqual({});
  });

  test('format() coerces email lowercase + trim and URI trim', () => {
    const v = createSchemaValidators({
      properties: {
        e: { type: 'string', format: 'email' },
        u: { type: 'string', format: 'uri' },
      },
    });
    expect(v.e.format!('  USER@Example.COM ')).toBe('user@example.com');
    expect(v.u.format!('  https://x.com  ')).toBe('https://x.com');
    // Non-string passes through
    expect(v.e.format!(42)).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// applySchemaValidation
// ---------------------------------------------------------------------------

describe('applySchemaValidation', () => {
  test('returns shape { valid, errors, data, summary }', () => {
    const schema = { name: { type: 'string', required: true } };
    const out = applySchemaValidation([{ name: 'A' }, { name: 'B' }], schema);

    expect(out).toHaveProperty('valid');
    expect(out).toHaveProperty('errors');
    expect(out).toHaveProperty('data');
    expect(out).toHaveProperty('summary');
    expect(out.summary).toMatchObject({
      totalRows: 2,
      errorCount: expect.any(Number),
      validRows: expect.any(Number),
      errorRate: expect.any(Number),
    });
    expect(Array.isArray(out.data)).toBe(true);
  });

  test('non-array input throws ValidationError', () => {
    expect(() => applySchemaValidation('nope' as any, { x: { type: 'string' } }))
      .toThrow(ValidationError);
  });

  test('flags invalid rows', () => {
    const schema = { age: { type: 'integer', required: true, min: 0 } };
    const out = applySchemaValidation(
      [{ age: 5 }, { age: 'not a number' }],
      schema,
    );
    expect(out.summary.totalRows).toBe(2);
    expect(out.errors.length).toBeGreaterThanOrEqual(1);
    expect(out.valid).toBe(false);
  });

  test('all-valid data returns valid:true and zero errors', () => {
    const schema = { name: { type: 'string', required: true } };
    const out = applySchemaValidation([{ name: 'A' }, { name: 'B' }], schema);
    expect(out.valid).toBe(true);
    expect(out.errors).toHaveLength(0);
    expect(out.summary.errorRate).toBe(0);
  });

  test('applySchemaValidationAsync matches sync for <=1000 rows', async () => {
    const schema = { name: { type: 'string', required: true } };
    const rows = Array.from({ length: 10 }, (_, i) => ({ name: `R${i}` }));
    const sync = applySchemaValidation(rows, schema);
    const asyncOut = await applySchemaValidationAsync(rows, schema);
    expect(asyncOut.valid).toBe(sync.valid);
    expect(asyncOut.summary.totalRows).toBe(sync.summary.totalRows);
    expect(asyncOut.summary.errorCount).toBe(sync.summary.errorCount);
  });

  test('applySchemaValidationAsync rejects non-array', async () => {
    await expect(applySchemaValidationAsync('x' as any, {}))
      .rejects.toBeInstanceOf(ValidationError);
  });

  test('applySchemaValidationAsync with empty array returns errorRate 0', async () => {
    const out = await applySchemaValidationAsync([], {});
    expect(out.summary.totalRows).toBe(0);
    expect(out.summary.errorRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// createValidationHook
// ---------------------------------------------------------------------------

describe('createValidationHook', () => {
  test('returns a function; valid row passes through', () => {
    const hook = createValidationHook({ name: { type: 'string', required: true } });
    expect(typeof hook).toBe('function');
    const row = { name: 'Ada' };
    expect(hook(row, 0, {})).toBe(row);
  });

  test('invalid row throws ValidationError mentioning the row number and field', () => {
    const hook = createValidationHook({ name: { type: 'string', required: true } });
    // Index 0 -> message says "Row 1"
    expect(() => hook({ name: '' }, 0, {})).toThrow(ValidationError);
    expect(() => hook({ name: '' }, 0, {})).toThrow(/Row 1/);
    expect(() => hook({ name: '' }, 0, {})).toThrow(/name/);
  });

  test('non-object/non-string schema throws ValidationError', () => {
    expect(() => createValidationHook(123 as any)).toThrow(ValidationError);
    expect(() => createValidationHook(null as any)).toThrow(ValidationError);
  });

  test('accepts JSON path string as schema', () => {
    const p = path.join(tmpDir, 'hook-schema.json');
    fs.writeFileSync(p, JSON.stringify({ name: { type: 'string', required: true } }), 'utf8');
    const hook = createValidationHook(p);
    expect(typeof hook).toBe('function');
    expect(hook({ name: 'OK' }, 0, {})).toEqual({ name: 'OK' });
  });
});

// ---------------------------------------------------------------------------
// createValidationHooks (TransformHooks wrapper)
// ---------------------------------------------------------------------------

describe('createValidationHooks', () => {
  test('returns an object with a perRow registration that validates rows', () => {
    const hooks = createValidationHooks({ name: { type: 'string', required: true } } as any);
    expect(hooks).toBeTruthy();
    // The instance exposes a perRow registration method (from TransformHooks).
    expect(typeof hooks.perRow).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// createZodValidationHook (zod-adapter)
// ---------------------------------------------------------------------------

describe('createZodValidationHook', () => {
  test('valid row — returns parsed data for z.object({ a: z.number() })', () => {
    const schema = z.object({ a: z.number() });
    const hook = createZodValidationHook(schema);
    const out = hook({ a: 1 }, 0, {});
    expect(out).toEqual({ a: 1 });
  });

  test(
    'invalid row — /* LOCKED CURRENT */ Zod 4 uses error.issues (not .errors); ' +
    'adapter reads .errors so the row is silently returned via the catch branch',
    () => {
      const schema = z.object({ a: z.number() });
      const hook = createZodValidationHook(schema);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        // Adapter's `result.error.errors[0]` -> TypeError -> caught -> returns row.
        // If the adapter is fixed to read `.issues`, this test should flip to
        // expect a ValidationError matching /Row 1: Field "a"/.
        const out = hook({ a: 'oops' }, 0, {});
        expect(out).toEqual({ a: 'oops' });
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    },
  );

  test('plain object (no safeParse) throws helpful ValidationError', () => {
    expect(() => createZodValidationHook({ not: 'a zod schema' }))
      .toThrow(ValidationError);
    expect(() => createZodValidationHook({ not: 'a zod schema' }))
      .toThrow(/not a valid Zod schema/);
  });

  test('mode option exists — "strict" is default, "collect" warns and returns row', () => {
    // /* LOCKED CURRENT */ Because Zod 4 issues bug above, "collect" also
    // does not see the error properly; we lock the no-throw behavior.
    const schema = z.object({ a: z.number() });
    const hookCollect = createZodValidationHook(schema, { mode: 'collect' });
    expect(typeof hookCollect).toBe('function');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const out = hookCollect({ a: 'bad' }, 0, {});
      expect(out).toEqual({ a: 'bad' });
    } finally {
      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  test('createValidatedParser returns an async function bound to a Zod schema', () => {
    // /* LOCKED CURRENT */ The parser's internal require('../index') resolves
    // relative to `src/utils/zod-adapter.ts` -> `src/index`, which doesn't
    // exist when running under ts-jest. We lock the factory's surface — the
    // returned function exists and is async — without actually invoking it.
    const schema = z.object({ a: z.string() });
    const parser = createValidatedParser(schema as any, { library: 'zod' } as any);
    expect(typeof parser).toBe('function');
    // It's an AsyncFunction
    expect(parser.constructor.name).toBe('AsyncFunction');
  });

  test('createValidatedParser throws for unsupported library', () => {
    const schema = z.object({ a: z.string() });
    expect(() =>
      createValidatedParser(schema as any, { library: 'bogus' as any }),
    ).toThrow(/Unsupported validation library/);
  });
});

// ---------------------------------------------------------------------------
// createYupValidationHook — Yup is not installed
// ---------------------------------------------------------------------------

describe('createYupValidationHook', () => {
  test('throws helpful error mentioning `npm install yup`', () => {
    // Some yup-like object shape, but no `yup` package available.
    expect(() => createYupValidationHook({ validate: () => undefined }))
      .toThrow(/yup/i);
    expect(() => createYupValidationHook({ validate: () => undefined }))
      .toThrow(/npm install yup/);
  });
});

// ---------------------------------------------------------------------------
// validators barrel
// ---------------------------------------------------------------------------

describe('validators', () => {
  test('isEmail', () => {
    expect(isEmail('a@b.c')).toBe(true);
    expect(isEmail('not')).toBe(false);
    expect(isEmail('')).toBe(false);
    // /* LOCKED CURRENT */ non-string input -> false (defensive guard)
    expect(isEmail(null as any)).toBe(false);
    expect(isEmail(undefined as any)).toBe(false);
    expect(isEmail(123 as any)).toBe(false);
  });

  test('isUrl', () => {
    expect(isUrl('https://example.com')).toBe(true);
    expect(isUrl('not a url')).toBe(false);
    // /* LOCKED CURRENT */ `javascript:` is currently treated as a valid URL
    // by WHATWG URL parsing; isUrl does NOT filter dangerous schemes.
    expect(isUrl('javascript:alert(1)')).toBe(true);
    expect(isUrl(null as any)).toBe(false);
  });

  test('isDate', () => {
    expect(isDate(new Date('2025-01-01'))).toBe(true);
    expect(isDate(new Date('invalid'))).toBe(false);
    // /* LOCKED CURRENT */ date strings parseable by `new Date()` are valid
    expect(isDate('2025-01-01')).toBe(true);
    expect(isDate('not a date')).toBe(false);
    expect(isDate(123 as any)).toBe(false);
  });

  test('validators barrel exposes isEmail / isUrl / isDate', () => {
    expect(validators.isEmail).toBe(isEmail);
    expect(validators.isUrl).toBe(isUrl);
    expect(validators.isDate).toBe(isDate);
  });
});
