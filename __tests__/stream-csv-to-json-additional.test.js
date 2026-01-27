const fs = require('fs');
const path = require('path');
const {
  createCsvToJsonStream,
  createCsvFileToJsonStream
} = require('../stream-csv-to-json');
const { createSchemaValidators } = require('../src/utils/schema-validator');
const { ValidationError, FileSystemError } = require('../errors');

describe('stream-csv-to-json additional coverage', () => {
  const tempDir = path.join(__dirname, 'tmp-stream-csv');

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('formats date-time values via schema', (done) => {
    const stream = createCsvToJsonStream({
      delimiter: ',',
      schema: {
        properties: {
          created: { type: 'string', format: 'date-time' }
        }
      }
    });

    const rows = [];
    stream.on('data', (row) => rows.push(row));
    stream.on('end', () => {
      expect(rows[0].created).toBe('2020-01-01T00:00:00.000Z');
      done();
    });

    stream.write('created\n');
    stream.write('2020-01-01T00:00:00Z\n');
    stream.end();
  });

  test('rejects invalid values with schema validation', (done) => {
    const stream = createCsvToJsonStream({
      delimiter: ',',
      schema: {
        properties: {
          age: { type: 'integer', minimum: 18 }
        }
      }
    });

    stream.on('error', (error) => {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('Invalid value for field');
      done();
    });

    stream.write('age\n');
    stream.write('17\n');
    stream.end();
  });

  test('rejects invalid transform results', (done) => {
    const stream = createCsvToJsonStream({
      delimiter: ',',
      transform: () => 'bad'
    });

    stream.on('error', (error) => {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('Transform function must return an object');
      done();
    });

    stream.write('id\n');
    stream.write('1\n');
    stream.end();
  });

  test('respects trim=false option', (done) => {
    const stream = createCsvToJsonStream({
      delimiter: ',',
      trim: false
    });

    const rows = [];
    stream.on('data', (row) => rows.push(row));
    stream.on('end', () => {
      expect(rows[0].name).toBe(' John ');
      done();
    });

    stream.write('name\n');
    stream.write(' John \n');
    stream.end();
  });

  test('parses booleans, empty fields, and removes Excel protection', (done) => {
    const stream = createCsvToJsonStream({
      delimiter: ',',
      parseBooleans: true
    });

    const rows = [];
    stream.on('data', (row) => rows.push(row));
    stream.on('end', () => {
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        name: 'John',
        active: false,
        empty: null,
        formula: '=1+1'
      });
      done();
    });

    stream.write('name,active,empty,formula\n');
    stream.write('\n');
    stream.write("John,false,,\'=1+1\n");
    stream.end();
  });

  test('createCsvFileToJsonStream reads from file', async () => {
    const filePath = path.join(tempDir, 'input.csv');
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(filePath, 'id,name\n1,John\n2,Jane\n', 'utf8');

    const stream = await createCsvFileToJsonStream(filePath, { delimiter: ',' });
    const rows = [];

    for await (const row of stream) {
      rows.push(row);
    }

    expect(rows).toEqual([
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' }
    ]);
  });

  test('createCsvFileToJsonStream handles missing file', async () => {
    const missing = path.join(tempDir, 'missing.csv');

    await expect(createCsvFileToJsonStream(missing))
      .rejects
      .toThrow(FileSystemError);
  });

  test('createCsvFileToJsonStream rejects invalid paths', async () => {
    await expect(createCsvFileToJsonStream('data.txt'))
      .rejects
      .toThrow('File must have .csv extension');

    await expect(createCsvFileToJsonStream('../secret.csv'))
      .rejects
      .toThrow('Directory traversal detected in file path');
  });

  test('createCsvFileToJsonStream rejects empty path', async () => {
    await expect(createCsvFileToJsonStream(''))
      .rejects
      .toThrow('File path must be a non-empty string');
  });

  test('rejects invalid options', () => {
    expect(() => createCsvToJsonStream({ delimiter: 1 }))
      .toThrow('Delimiter must be a string');
    expect(() => createCsvToJsonStream({ delimiter: ',,' }))
      .toThrow('Delimiter must be a single character');
    expect(() => createCsvToJsonStream({ renameMap: 'bad' }))
      .toThrow('renameMap must be an object');
    expect(() => createCsvToJsonStream({ maxRows: 0 }))
      .toThrow('maxRows must be a positive number or Infinity');
    expect(() => createCsvToJsonStream({ transform: 'bad' }))
      .toThrow('transform must be a function');
    expect(() => createCsvToJsonStream({ schema: 'bad' }))
      .toThrow('schema must be an object');
  });

  test('createSchemaValidators covers formats and constraints', () => {
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
});
