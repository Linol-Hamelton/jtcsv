import {
  ValidationError,
  ConfigurationError,
  LimitError
} from './errors-browser.js';
import { csvToJsonIterator } from './csv-to-json-browser.js';

const DEFAULT_MAX_CHUNK_SIZE = 64 * 1024;

function isReadableStream(value) {
  return value && typeof value.getReader === 'function';
}

function isAsyncIterable(value) {
  return value && typeof value[Symbol.asyncIterator] === 'function';
}

function isIterable(value) {
  return value && typeof value[Symbol.iterator] === 'function';
}

function createReadableStreamFromIterator(iterator) {
  return new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      if (iterator.return) {
        iterator.return();
      }
    }
  });
}

function detectInputFormat(input, options) {
  if (options && options.inputFormat) {
    return options.inputFormat;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('[')) {
      return 'json-array';
    }
    if (trimmed.includes('\n')) {
      return 'ndjson';
    }
    return 'json-array';
  }

  if (input instanceof Blob || isReadableStream(input)) {
    return 'ndjson';
  }

  return 'json-array';
}

async function* parseNdjsonText(text) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    yield JSON.parse(trimmed);
  }
}

async function* parseNdjsonStream(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      yield JSON.parse(trimmed);
    }
  }

  if (buffer.trim()) {
    yield JSON.parse(buffer.trim());
  }
}

async function* normalizeJsonInput(input, options = {}) {
  const format = detectInputFormat(input, options);

  if (Array.isArray(input)) {
    for (const item of input) {
      yield item;
    }
    return;
  }

  if (isAsyncIterable(input)) {
    for await (const item of input) {
      yield item;
    }
    return;
  }

  if (isIterable(input)) {
    for (const item of input) {
      yield item;
    }
    return;
  }

  if (typeof input === 'string') {
    if (format === 'ndjson') {
      yield* parseNdjsonText(input);
      return;
    }

    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        yield item;
      }
      return;
    }
    yield parsed;
    return;
  }

  if (input instanceof Blob) {
    if (format === 'ndjson') {
      yield* parseNdjsonStream(input.stream());
      return;
    }

    const text = await input.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        yield item;
      }
      return;
    }
    yield parsed;
    return;
  }

  if (isReadableStream(input)) {
    if (format !== 'ndjson') {
      throw new ValidationError('ReadableStream input requires inputFormat="ndjson"');
    }
    yield* parseNdjsonStream(input);
    return;
  }

  throw new ValidationError('Input must be an array, iterable, string, Blob, or ReadableStream');
}

function validateStreamOptions(options) {
  if (options && typeof options !== 'object') {
    throw new ConfigurationError('Options must be an object');
  }

  if (options?.delimiter && typeof options.delimiter !== 'string') {
    throw new ConfigurationError('Delimiter must be a string');
  }

  if (options?.delimiter && options.delimiter.length !== 1) {
    throw new ConfigurationError('Delimiter must be a single character');
  }

  if (options?.renameMap && typeof options.renameMap !== 'object') {
    throw new ConfigurationError('renameMap must be an object');
  }

  if (options?.maxRecords !== undefined) {
    if (typeof options.maxRecords !== 'number' || options.maxRecords <= 0) {
      throw new ConfigurationError('maxRecords must be a positive number');
    }
  }
}

function escapeCsvValue(value, options) {
  const {
    delimiter,
    preventCsvInjection = true,
    rfc4180Compliant = true
  } = options;

  if (value === null || value === undefined || value === '') {
    return '';
  }

  const stringValue = String(value);
  let escapedValue = stringValue;
  if (preventCsvInjection) {
    // Dangerous prefixes: =, +, -, @, tab (\t), carriage return (\r)
    if (/^[=+\-@\t\r]/.test(stringValue)) {
      escapedValue = "'" + stringValue;
    }
    // Unicode Bidi override characters
    const bidiChars = ['\u202A', '\u202B', '\u202C', '\u202D', '\u202E'];
    for (const bidi of bidiChars) {
      if (stringValue.includes(bidi)) {
        escapedValue = escapedValue.replace(new RegExp(bidi, 'g'), '');
      }
    }
  }

  const needsQuoting = rfc4180Compliant
    ? (escapedValue.includes(delimiter) ||
       escapedValue.includes('"') ||
       escapedValue.includes('\n') ||
       escapedValue.includes('\r'))
    : (escapedValue.includes(delimiter) ||
       escapedValue.includes('"') ||
       escapedValue.includes('\n') ||
       escapedValue.includes('\r'));

  if (needsQuoting) {
    return `"${escapedValue.replace(/"/g, '""')}"`;
  }

  return escapedValue;
}

function buildHeaderState(keys, options) {
  const renameMap = options.renameMap || {};
  const template = options.template || {};
  const originalKeys = Array.isArray(options.headers) ? options.headers : keys;
  const headers = originalKeys.map((key) => renameMap[key] || key);

  const reverseRenameMap = {};
  originalKeys.forEach((key, index) => {
    reverseRenameMap[headers[index]] = key;
  });

  let finalHeaders = headers;
  if (Object.keys(template).length > 0) {
    const templateHeaders = Object.keys(template).map(key => renameMap[key] || key);
    const extraHeaders = headers.filter(h => !templateHeaders.includes(h));
    finalHeaders = [...templateHeaders, ...extraHeaders];
  }

  return {
    headers: finalHeaders,
    reverseRenameMap
  };
}

async function* jsonToCsvChunkIterator(input, options = {}) {
  validateStreamOptions(options);

  const opts = options && typeof options === 'object' ? options : {};
  const {
    delimiter = ';',
    includeHeaders = true,
    maxRecords,
    maxChunkSize = DEFAULT_MAX_CHUNK_SIZE,
    headerMode
  } = opts;

  let headerState = null;
  let buffer = '';
  let recordCount = 0;
  const lineEnding = opts.rfc4180Compliant === false ? '\n' : '\r\n';

  if (Array.isArray(input) && !opts.headers && (!headerMode || headerMode === 'all')) {
    const allKeys = new Set();
    for (const item of input) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      Object.keys(item).forEach((key) => allKeys.add(key));
    }
    headerState = buildHeaderState(Array.from(allKeys), opts);
    if (includeHeaders && headerState.headers.length > 0) {
      buffer += headerState.headers.join(delimiter) + lineEnding;
    }
  } else if (Array.isArray(opts.headers)) {
    headerState = buildHeaderState(opts.headers, opts);
    if (includeHeaders && headerState.headers.length > 0) {
      buffer += headerState.headers.join(delimiter) + lineEnding;
    }
  }

  for await (const item of normalizeJsonInput(input, opts)) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    if (!headerState) {
      headerState = buildHeaderState(Object.keys(item), opts);
      if (includeHeaders && headerState.headers.length > 0) {
        buffer += headerState.headers.join(delimiter) + lineEnding;
      }
    }

    recordCount += 1;
    if (maxRecords && recordCount > maxRecords) {
      throw new LimitError(
        `Data size exceeds maximum limit of ${maxRecords} records`,
        maxRecords,
        recordCount
      );
    }

    const row = headerState.headers.map((header) => {
      const originalKey = headerState.reverseRenameMap[header] || header;
      return escapeCsvValue(item[originalKey], {
        delimiter,
        preventCsvInjection: opts.preventCsvInjection !== false,
        rfc4180Compliant: opts.rfc4180Compliant !== false
      });
    }).join(delimiter);

    buffer += row + lineEnding;

    if (buffer.length >= maxChunkSize) {
      yield buffer;
      buffer = '';
    }
  }

  if (buffer.length > 0) {
    yield buffer;
  }
}

async function* jsonToNdjsonChunkIterator(input, options = {}) {
  validateStreamOptions(options);
  for await (const item of normalizeJsonInput(input, options)) {
    if (item === undefined) {
      continue;
    }
    yield JSON.stringify(item) + '\n';
  }
}

async function* csvToJsonChunkIterator(input, options = {}) {
  const outputFormat = options.outputFormat || 'ndjson';
  const asArray = outputFormat === 'json-array' || outputFormat === 'array' || outputFormat === 'json';
  let first = true;

  if (asArray) {
    yield '[';
  }

  for await (const row of csvToJsonIterator(input, options)) {
    const payload = JSON.stringify(row);
    if (asArray) {
      yield (first ? '' : ',') + payload;
    } else {
      yield payload + '\n';
    }
    first = false;
  }

  if (asArray) {
    yield ']';
  }
}

export function jsonToCsvStream(input, options = {}) {
  const iterator = jsonToCsvChunkIterator(input, options);
  return createReadableStreamFromIterator(iterator);
}

export function jsonToNdjsonStream(input, options = {}) {
  const iterator = jsonToNdjsonChunkIterator(input, options);
  return createReadableStreamFromIterator(iterator);
}

export function csvToJsonStream(input, options = {}) {
  const iterator = csvToJsonChunkIterator(input, options);
  return createReadableStreamFromIterator(iterator);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    jsonToCsvStream,
    jsonToNdjsonStream,
    csvToJsonStream
  };
}
