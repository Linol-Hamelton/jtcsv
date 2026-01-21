const {
  createJsonToCsvStream,
  createCsvToJsonStream,
  streamJsonToCsv,
  streamCsvToJson,
  createJsonReadableStream,
  createCsvCollectorStream,
  createJsonCollectorStream,
  ValidationError,
  ParsingError,
  LimitError
} = require('../index');

const { Readable, Writable } = require('stream');
const { pipeline } = require('stream/promises');

// Mock console to avoid output in tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Streaming JSON to CSV', () => {
  describe('createJsonToCsvStream', () => {
    test('should convert JSON objects to CSV rows', (done) => {
      const transformStream = createJsonToCsvStream({
        delimiter: ',',
        includeHeaders: true
      });
      
      const results = [];
      
      transformStream.on('data', (chunk) => {
        results.push(chunk.toString());
      });
      
      transformStream.on('end', () => {
        const csv = results.join('');
        expect(csv).toContain('id,name,email');
        expect(csv).toContain('1,John,john@example.com');
        expect(csv).toContain('2,Jane,jane@example.com');
        done();
      });
      
      transformStream.write({ id: 1, name: 'John', email: 'john@example.com' });
      transformStream.write({ id: 2, name: 'Jane', email: 'jane@example.com' });
      transformStream.end();
    });

    test('should respect maxRecords limit', (done) => {
      const transformStream = createJsonToCsvStream({
        delimiter: ',',
        maxRecords: 2
      });
      
      transformStream.on('error', (error) => {
        expect(error).toBeInstanceOf(LimitError);
        expect(error.message).toContain('Data size exceeds maximum limit of 2 records');
        done();
      });
      
      transformStream.write({ id: 1, name: 'John' });
      transformStream.write({ id: 2, name: 'Jane' });
      transformStream.write({ id: 3, name: 'Bob' }); // This should trigger error
    });

    test('should apply renameMap', (done) => {
      const transformStream = createJsonToCsvStream({
        delimiter: ',',
        includeHeaders: true,
        renameMap: { id: 'ID', name: 'Full Name' }
      });
      
      const results = [];
      
      transformStream.on('data', (chunk) => {
        results.push(chunk.toString());
      });
      
      transformStream.on('end', () => {
        const csv = results.join('');
        expect(csv).toContain('ID,Full Name');
        expect(csv).toContain('1,John');
        done();
      });
      
      transformStream.write({ id: 1, name: 'John' });
      transformStream.end();
    });

    test('should escape CSV injection attempts', (done) => {
      const transformStream = createJsonToCsvStream({
        delimiter: ',',
        includeHeaders: false
      });
      
      const results = [];
      
      transformStream.on('data', (chunk) => {
        results.push(chunk.toString());
      });
      
      transformStream.on('end', () => {
        const csv = results.join('');
        expect(csv).toContain("'=cmd|");
        expect(csv).toContain("'@SUM(A1:A10)");
        done();
      });
      
      transformStream.write({ formula: '=cmd|"/c calc.exe"', function: '@SUM(A1:A10)' });
      transformStream.end();
    });
  });

  describe('createJsonReadableStream', () => {
    test('should create readable stream from array', (done) => {
      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ];
      
      const stream = createJsonReadableStream(data);
      const results = [];
      
      stream.on('data', (chunk) => {
        results.push(chunk);
      });
      
      stream.on('end', () => {
        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({ id: 1, name: 'John' });
        expect(results[1]).toEqual({ id: 2, name: 'Jane' });
        done();
      });
    });

    test('should handle empty array', (done) => {
      const stream = createJsonReadableStream([]);
      const results = [];
      
      stream.on('data', (chunk) => {
        results.push(chunk);
      });
      
      stream.on('end', () => {
        expect(results).toHaveLength(0);
        done();
      });
    });
  });

  describe('createCsvCollectorStream', () => {
    test('should collect CSV data', (done) => {
      const collector = createCsvCollectorStream();
      
      collector.write('id,name\n');
      collector.write('1,John\n');
      collector.write('2,Jane\n');
      
      collector.end(() => {
        expect(collector._collectedData).toBe('id,name\n1,John\n2,Jane\n');
        done();
      });
    });
  });
});

describe('Streaming CSV to JSON', () => {
  describe('createCsvToJsonStream', () => {
    test('should convert CSV text to JSON objects', (done) => {
      const transformStream = createCsvToJsonStream({
        delimiter: ',',
        hasHeaders: true
      });
      
      const results = [];
      
      transformStream.on('data', (chunk) => {
        results.push(chunk);
      });
      
      transformStream.on('end', () => {
        expect(results).toHaveLength(2);
        expect(results[0]).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
        expect(results[1]).toEqual({ id: '2', name: 'Jane', email: 'jane@example.com' });
        done();
      });
      
      transformStream.write('id,name,email\n');
      transformStream.write('1,John,john@example.com\n');
      transformStream.write('2,Jane,jane@example.com');
      transformStream.end();
    });

    test('should parse numbers and booleans', (done) => {
      const transformStream = createCsvToJsonStream({
        delimiter: ',',
        hasHeaders: true,
        parseNumbers: true,
        parseBooleans: true
      });
      
      const results = [];
      
      transformStream.on('data', (chunk) => {
        results.push(chunk);
      });
      
      transformStream.on('end', () => {
        expect(results[0].id).toBe(1); // Number
        expect(results[0].active).toBe(true); // Boolean
        expect(results[0].name).toBe('John'); // String
        done();
      });
      
      transformStream.write('id,name,active\n');
      transformStream.write('1,John,true\n');
      transformStream.end();
    });

    test('should handle quoted fields', (done) => {
      const transformStream = createCsvToJsonStream({
        delimiter: ',',
        hasHeaders: true
      });
      
      const results = [];
      
      transformStream.on('data', (chunk) => {
        results.push(chunk);
      });
      
      transformStream.on('end', () => {
        expect(results[0].text).toBe('Hello, World!');
        expect(results[0].quote).toBe('He said "Hi"');
        done();
      });
      
      transformStream.write('text,quote\n');
      transformStream.write('"Hello, World!","He said ""Hi"""\n');
      transformStream.end();
    });

    test('should respect maxRows limit', (done) => {
      const transformStream = createCsvToJsonStream({
        delimiter: ',',
        hasHeaders: true,
        maxRows: 2
      });
      
      transformStream.on('error', (error) => {
        expect(error).toBeInstanceOf(LimitError);
        expect(error.message).toContain('CSV size exceeds maximum limit of 2 rows');
        done();
      });
      
      transformStream.write('id,name\n');
      transformStream.write('1,John\n');
      transformStream.write('2,Jane\n');
      transformStream.write('3,Bob\n'); // This should trigger error
      transformStream.end();
    });

    test('should handle CSV without headers', (done) => {
      const transformStream = createCsvToJsonStream({
        delimiter: ',',
        hasHeaders: false
      });
      
      const results = [];
      
      transformStream.on('data', (chunk) => {
        results.push(chunk);
      });
      
      transformStream.on('end', () => {
        expect(results[0]).toEqual({ column1: '1', column2: 'John', column3: 'true' });
        done();
      });
      
      transformStream.write('1,John,true\n');
      transformStream.end();
    });
  });

  describe('createJsonCollectorStream', () => {
    test('should collect JSON objects', (done) => {
      const collector = createJsonCollectorStream();
      
      collector.write({ id: 1, name: 'John' });
      collector.write({ id: 2, name: 'Jane' });
      
      collector.end(() => {
        expect(collector._collectedData).toHaveLength(2);
        expect(collector._collectedData[0]).toEqual({ id: 1, name: 'John' });
        expect(collector._collectedData[1]).toEqual({ id: 2, name: 'Jane' });
        done();
      });
    });
  });
});

describe('Stream Pipeline Functions', () => {
  test('streamJsonToCsv should pipe through transform', async () => {
    const inputStream = new Readable({
      objectMode: true,
      read() {
        this.push({ id: 1, name: 'John' });
        this.push({ id: 2, name: 'Jane' });
        this.push(null);
      }
    });
    
    const outputChunks = [];
    const outputStream = new Writable({
      write(chunk, encoding, callback) {
        outputChunks.push(chunk.toString());
        callback();
      }
    });
    
    await streamJsonToCsv(inputStream, outputStream, {
      delimiter: ',',
      includeHeaders: true
    });
    
    const csv = outputChunks.join('');
    expect(csv).toContain('id,name');
    expect(csv).toContain('1,John');
    expect(csv).toContain('2,Jane');
  });

  test('streamCsvToJson should pipe through transform', async () => {
    const inputStream = new Readable({
      read() {
        this.push('id,name\n');
        this.push('1,John\n');
        this.push('2,Jane\n');
        this.push(null);
      }
    });
    
    const outputChunks = [];
    const outputStream = new Writable({
      objectMode: true,
      write(chunk, encoding, callback) {
        outputChunks.push(chunk);
        callback();
      }
    });
    
    await streamCsvToJson(inputStream, outputStream, {
      delimiter: ',',
      hasHeaders: true
    });
    
    expect(outputChunks).toHaveLength(2);
    expect(outputChunks[0]).toEqual({ id: '1', name: 'John' });
    expect(outputChunks[1]).toEqual({ id: '2', name: 'Jane' });
  });
});

describe('Error Handling', () => {
  test('should handle invalid JSON objects in stream', (done) => {
    const transformStream = createJsonToCsvStream({
      delimiter: ','
    });
    
    transformStream.on('error', (error) => {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('Input data must be objects');
      done();
    });
    
    transformStream.write('not an object'); // Invalid input
  });

  test('should handle malformed CSV in stream', (done) => {
    const transformStream = createCsvToJsonStream({
      delimiter: ','
    });
    
    transformStream.on('error', (error) => {
      expect(error).toBeInstanceOf(ParsingError);
      done();
    });
    
    transformStream.write('id,"name\n'); // Unclosed quotes
    transformStream.end();
  });
});