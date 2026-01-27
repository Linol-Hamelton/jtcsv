const NdjsonParser = require('../src/formats/ndjson-parser');

function createStreamFromString(text, chunkSize = 8) {
  let index = 0;
  return {
    async read() {
      if (index >= text.length) {
        return { done: true };
      }
      const chunk = text.slice(index, index + chunkSize);
      index += chunkSize;
      return {
        done: false,
        value: new TextEncoder().encode(chunk)
      };
    },
    releaseLock() {},
    getReader() {
      return this;
    }
  };
}

async function collectTransformOutput(transform, chunks) {
  const writer = transform.writable.getWriter();
  const reader = transform.readable.getReader();

  const writePromise = (async () => {
    for (const chunk of chunks) {
      await writer.write(chunk);
    }
    await writer.close();
  })();

  const readPromise = (async () => {
    let output = '';
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (typeof value === 'string') {
        output += value;
      } else {
        output += Buffer.from(value).toString();
      }
    }
    return output;
  })();

  const [, output] = await Promise.all([writePromise, readPromise]);
  return output;
}

describe('NdjsonParser additional coverage', () => {
  test('parseStream logs errors without onError', async () => {
    const input = '{"id":1}\ninvalid\n{"id":2}';
    const results = [];
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    for await (const obj of NdjsonParser.parseStream(input)) {
      results.push(obj);
    }

    expect(results).toEqual([{ id: 1 }, { id: 2 }]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test('parseStream enforces maxLineLength for streams', async () => {
    const stream = createStreamFromString('{"id":1}', 16);
    const iterator = NdjsonParser.parseStream(stream, { maxLineLength: 2 });
    await expect(iterator.next()).rejects.toThrow();
  });

  test('parseStream stream calls onError for trailing buffer errors', async () => {
    const stream = createStreamFromString('{"id":1}\ninvalid', 16);
    const errors = [];
    const results = [];

    for await (const obj of NdjsonParser.parseStream(stream, {
      onError: (error, line, lineNumber) => {
        errors.push({ error: error.message, line, lineNumber });
      }
    })) {
      results.push(obj);
    }

    expect(results).toEqual([{ id: 1 }]);
    expect(errors).toHaveLength(1);
  });

  test('parseStream stream logs errors when onError is missing', async () => {
    const stream = createStreamFromString('{"id":1}\ninvalid\n{"id":2}\n', 8);
    const results = [];
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    for await (const obj of NdjsonParser.parseStream(stream)) {
      results.push(obj);
    }

    expect(results).toEqual([{ id: 1 }, { id: 2 }]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test('parseStream stream calls onError for invalid lines', async () => {
    const stream = createStreamFromString('{"id":1}\ninvalid\n{"id":2}\n', 8);
    const errors = [];

    for await (const _ of NdjsonParser.parseStream(stream, {
      onError: (error, line, lineNumber) => {
        errors.push({ error: error.message, line, lineNumber });
      }
    })) {
      // consume output
    }

    expect(errors).toHaveLength(1);
  });

  test('createNdjsonToCsvStream converts and escapes fields', async () => {
    const transform = NdjsonParser.createNdjsonToCsvStream({ delimiter: ',' });
    const output = await collectTransformOutput(transform, [
      '{"name":"Alice","note":"Hello, world"}',
      '{"name":"Bob","note":"He said \\"hi\\""}',
      '{"name":"Cara","note":"Line1\\nLine2"}',
      '{"name":"Zero","note":null}'
    ]);

    expect(output.startsWith('name,note\n')).toBe(true);
    expect(output).toContain('Alice,"Hello, world"\n');
    expect(output).toContain('Bob,"He said ""hi"""\n');
    expect(output).toContain('Cara,"Line1\nLine2"\n');
    expect(output).toContain('Zero,\n');
  });

  test('createNdjsonToCsvStream supports includeHeaders false', async () => {
    const transform = NdjsonParser.createNdjsonToCsvStream({
      delimiter: ',',
      includeHeaders: false
    });
    const output = await collectTransformOutput(transform, [
      '{"a":1,"b":2}'
    ]);

    expect(output.trim()).toBe('1,2');
  });

  test('createNdjsonToCsvStream logs invalid JSON chunks', async () => {
    const transform = NdjsonParser.createNdjsonToCsvStream();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await collectTransformOutput(transform, ['{not-json']);

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test('createCsvToNdjsonStream parses headers and quoted fields', async () => {
    const transform = NdjsonParser.createCsvToNdjsonStream({
      delimiter: ',',
      hasHeaders: true
    });
    const output = await collectTransformOutput(transform, [
      'name,note\nAlice,"Hello, world"\nBob,"He said ""hi"""'
    ]);
    const lines = output.trim().split('\n');

    expect(lines[0]).toBe('{"name":"Alice","note":"Hello, world"}');
    expect(lines[1]).toBe('{"name":"Bob","note":"He said \\"hi\\""}');
  });

  test('createCsvToNdjsonStream supports hasHeaders false', async () => {
    const transform = NdjsonParser.createCsvToNdjsonStream({
      delimiter: ',',
      hasHeaders: false
    });
    const output = await collectTransformOutput(transform, [
      '1,2\n\n3,4'
    ]);
    const lines = output.trim().split('\n');

    expect(lines).toEqual([
      '{"field_0":"1","field_1":"2"}',
      '{"field_0":"3","field_1":"4"}'
    ]);
  });

  test('getStats reports error lines for stream input', async () => {
    const stream = createStreamFromString('{"id":1}\ninvalid\n{"id":2}', 12);
    const stats = await NdjsonParser.getStats(stream);

    expect(stats.totalLines).toBe(3);
    expect(stats.validLines).toBe(2);
    expect(stats.errorLines).toBe(1);
    expect(stats.errors).toHaveLength(1);
  });

  test('getStats counts trailing buffer errors', async () => {
    const stream = createStreamFromString('{"id":1}\ninvalid', 12);
    const stats = await NdjsonParser.getStats(stream);

    expect(stats.totalLines).toBe(2);
    expect(stats.validLines).toBe(1);
    expect(stats.errorLines).toBe(1);
  });
});

describe('NdjsonParser environment fallbacks', () => {
  test('uses util TextDecoder when global TextDecoder is missing', async () => {
    const originalTextDecoder = global.TextDecoder;
    global.TextDecoder = undefined;
    try {
      const stream = createStreamFromString('{"id":1}\n{"id":2}', 8);
      const results = [];
      for await (const obj of NdjsonParser.parseStream(stream)) {
        results.push(obj);
      }
      expect(results).toEqual([{ id: 1 }, { id: 2 }]);
    } finally {
      global.TextDecoder = originalTextDecoder;
    }
  });

  test('throws when TextDecoder is unavailable', async () => {
    const originalTextDecoder = global.TextDecoder;
    global.TextDecoder = undefined;
    let LocalNdjsonParser;

    jest.resetModules();
    jest.doMock('util', () => ({}));
    jest.isolateModules(() => {
      LocalNdjsonParser = require('../src/formats/ndjson-parser');
    });

    try {
      const stream = createStreamFromString('{"id":1}', 8);
      const iterator = LocalNdjsonParser.parseStream(stream);
      await expect(iterator.next()).rejects.toThrow('TextDecoder is not available');
    } finally {
      jest.dontMock('util');
      jest.resetModules();
      global.TextDecoder = originalTextDecoder;
    }
  });

  test('getStats throws when TextDecoder is unavailable', async () => {
    const originalTextDecoder = global.TextDecoder;
    global.TextDecoder = undefined;
    let LocalNdjsonParser;

    jest.resetModules();
    jest.doMock('util', () => ({}));
    jest.isolateModules(() => {
      LocalNdjsonParser = require('../src/formats/ndjson-parser');
    });

    try {
      const stream = createStreamFromString('{"id":1}', 8);
      await expect(LocalNdjsonParser.getStats(stream)).rejects.toThrow(
        'TextDecoder is not available'
      );
    } finally {
      jest.dontMock('util');
      jest.resetModules();
      global.TextDecoder = originalTextDecoder;
    }
  });

  test('uses stream/web TransformStream when global is missing', () => {
    const originalTransformStream = global.TransformStream;
    global.TransformStream = undefined;
    try {
      const transform = NdjsonParser.createNdjsonToCsvStream();
      const WebTransformStream = require('stream/web').TransformStream;
      expect(transform).toBeInstanceOf(WebTransformStream);
    } finally {
      global.TransformStream = originalTransformStream;
    }
  });

  test('throws when TransformStream is unavailable', () => {
    const originalTransformStream = global.TransformStream;
    global.TransformStream = undefined;
    let LocalNdjsonParser;

    jest.resetModules();
    jest.doMock('stream/web', () => {
      throw new Error('missing');
    });
    jest.isolateModules(() => {
      LocalNdjsonParser = require('../src/formats/ndjson-parser');
    });

    try {
      expect(() => LocalNdjsonParser.createNdjsonToCsvStream()).toThrow(
        'TransformStream is not available'
      );
      expect(() => LocalNdjsonParser.createCsvToNdjsonStream()).toThrow(
        'TransformStream is not available'
      );
    } finally {
      jest.dontMock('stream/web');
      jest.resetModules();
      global.TransformStream = originalTransformStream;
    }
  });
});
