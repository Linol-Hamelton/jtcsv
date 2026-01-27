/**
 * Node.js Runtime Optimizations
 *
 * Detects Node.js version and provides optimized implementations
 * for modern runtimes while maintaining backward compatibility.
 *
 * Optimized for: Node 20, 22, 24
 * Compatible with: Node 12+
 */

// Parse Node.js version
const nodeVersion = process.versions?.node || '12.0.0';
const [major, minor] = nodeVersion.split('.').map(Number);

// Feature detection flags
const features = {
  // Node 14.17+ / 16+
  hasAbortController: typeof AbortController !== 'undefined',

  // Node 15+
  hasPromiseAny: typeof Promise.any === 'function',

  // Node 16+
  hasArrayAt: typeof Array.prototype.at === 'function',
  hasObjectHasOwn: typeof Object.hasOwn === 'function',

  // Node 17+
  hasStructuredClone: typeof globalThis.structuredClone === 'function',

  // Node 18+
  hasFetch: typeof globalThis.fetch === 'function',

  // Node 20+
  hasWebStreams: typeof globalThis.ReadableStream !== 'undefined' && major >= 20,
  hasArrayGroup: typeof Array.prototype.group === 'function',

  // Node 21+
  hasSetMethods: typeof Set.prototype.union === 'function',

  // Node 22+
  hasImportMeta: major >= 22,
  hasExplicitResourceManagement: major >= 22,

  // Version checks
  isNode20Plus: major >= 20,
  isNode22Plus: major >= 22,
  isNode24Plus: major >= 24
};

/**
 * Optimized Object.hasOwn polyfill for older Node versions
 */
const hasOwn = features.hasObjectHasOwn
  ? Object.hasOwn
  : (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

/**
 * Optimized deep clone function
 * Uses structuredClone on Node 17+ for best performance
 */
const deepClone = features.hasStructuredClone
  ? (obj) => structuredClone(obj)
  : (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Optimized array access with at() method
 */
const arrayAt = features.hasArrayAt
  ? (arr, index) => arr.at(index)
  : (arr, index) => {
    const len = arr.length;
    const normalizedIndex = index < 0 ? len + index : index;
    return normalizedIndex >= 0 && normalizedIndex < len ? arr[normalizedIndex] : undefined;
  };

/**
 * High-performance string builder for large CSV generation
 * Uses different strategies based on Node version
 */
class StringBuilderOptimized {
  constructor(initialCapacity = 1024) {
    this.parts = [];
    this.length = 0;
    this.initialCapacity = initialCapacity;

    // Node 20+ uses more aggressive chunking
    this.chunkSize = features.isNode20Plus ? 65536 : 16384;
  }

  append(str) {
    if (str) {
      this.parts.push(str);
      this.length += str.length;
    }
    return this;
  }

  toString() {
    return this.parts.join('');
  }

  clear() {
    this.parts = [];
    this.length = 0;
  }
}

/**
 * Optimized row buffer for streaming CSV parsing
 * Minimizes allocations on modern Node versions
 */
class RowBuffer {
  constructor(initialSize = 100) {
    this.rows = [];
    this.currentRow = [];
    this.rowCount = 0;

    // Pre-allocate on Node 20+
    if (features.isNode20Plus) {
      this.rows = new Array(initialSize);
      this.rows.length = 0;
    }
  }

  addField(field) {
    this.currentRow.push(field);
  }

  commitRow() {
    if (this.currentRow.length > 0) {
      this.rows.push(this.currentRow);
      this.rowCount++;
      this.currentRow = [];
    }
  }

  getRows() {
    return this.rows;
  }

  clear() {
    this.rows = features.isNode20Plus ? new Array(100) : [];
    this.rows.length = 0;
    this.currentRow = [];
    this.rowCount = 0;
  }
}

/**
 * Optimized field parser with char code comparisons
 * Faster than string comparisons on all Node versions
 */
const CHAR_CODES = {
  QUOTE: 34,        // "
  COMMA: 44,        // ,
  SEMICOLON: 59,    // ;
  TAB: 9,           // \t
  PIPE: 124,        // |
  NEWLINE: 10,      // \n
  CARRIAGE: 13,     // \r
  SPACE: 32,        // space
  EQUALS: 61,       // =
  PLUS: 43,         // +
  MINUS: 45,        // -
  AT: 64,           // @
  BACKSLASH: 92,    // \
  APOSTROPHE: 39    // '
};

/**
 * Fast delimiter detection using char codes
 */
function fastDetectDelimiter(sample, candidates = [';', ',', '\t', '|']) {
  const firstLineEnd = sample.indexOf('\n');
  const firstLine = firstLineEnd > -1 ? sample.slice(0, firstLineEnd) : sample;

  const candidateCodes = candidates.map(c => c.charCodeAt(0));
  const counts = new Array(candidateCodes.length).fill(0);

  // Use fast char code iteration on Node 20+
  const len = Math.min(firstLine.length, 10000);

  for (let i = 0; i < len; i++) {
    const code = firstLine.charCodeAt(i);
    for (let j = 0; j < candidateCodes.length; j++) {
      if (code === candidateCodes[j]) {
        counts[j]++;
      }
    }
  }

  let maxCount = 0;
  let maxIndex = 0;

  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > maxCount) {
      maxCount = counts[i];
      maxIndex = i;
    }
  }

  return candidates[maxIndex];
}

/**
 * Optimized batch processor for large datasets
 * Uses different chunk sizes based on Node version
 */
function createBatchProcessor(processor, options = {}) {
  const batchSize = options.batchSize || (features.isNode20Plus ? 10000 : 5000);
  const parallelism = options.parallelism || (features.isNode22Plus ? 4 : 2);

  return async function* processBatches(items) {
    const batches = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    // Process batches with limited parallelism
    for (let i = 0; i < batches.length; i += parallelism) {
      const chunk = batches.slice(i, i + parallelism);
      const results = await Promise.all(chunk.map(batch => processor(batch)));

      for (const result of results) {
        yield* result;
      }
    }
  };
}

/**
 * Memory-efficient object pool for row objects
 * Reduces GC pressure on large CSV files
 */
class ObjectPool {
  constructor(factory, initialSize = 100) {
    this.factory = factory;
    this.pool = [];
    this.inUse = 0;

    // Pre-warm pool on Node 20+
    if (features.isNode20Plus) {
      for (let i = 0; i < initialSize; i++) {
        this.pool.push(factory());
      }
    }
  }

  acquire() {
    this.inUse++;
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return this.factory();
  }

  release(obj) {
    this.inUse--;
    // Clear object properties before returning to pool
    for (const key in obj) {
      if (hasOwn(obj, key)) {
        delete obj[key];
      }
    }
    this.pool.push(obj);
  }

  getStats() {
    return {
      poolSize: this.pool.length,
      inUse: this.inUse
    };
  }
}

/**
 * Fast string escape for CSV values
 * Uses pre-computed regex on all versions
 */
const QUOTE_REGEX = /"/g;

function fastEscapeValue(value, delimiterCode) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const str = typeof value === 'string' ? value : String(value);
  const len = str.length;

  // Quick scan for special characters using char codes
  let needsQuoting = false;
  let hasQuote = false;

  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);
    if (code === CHAR_CODES.QUOTE) {
      hasQuote = true;
      needsQuoting = true;
    } else if (code === delimiterCode || code === CHAR_CODES.NEWLINE || code === CHAR_CODES.CARRIAGE) {
      needsQuoting = true;
    }
  }

  if (!needsQuoting) {
    return str;
  }

  const escaped = hasQuote ? str.replace(QUOTE_REGEX, '""') : str;
  return `"${escaped}"`;
}

/**
 * Async iterator utilities for streaming
 */
const asyncIterUtils = {
  /**
   * Map over async iterator with concurrency control (Node 20+)
   */
  async *mapConcurrent(iterator, mapper, concurrency = 4) {
    const pending = [];

    for await (const item of iterator) {
      pending.push(mapper(item));

      if (pending.length >= concurrency) {
        const results = await Promise.all(pending.splice(0, concurrency));
        for (const result of results) {
          yield result;
        }
      }
    }

    if (pending.length > 0) {
      const results = await Promise.all(pending);
      for (const result of results) {
        yield result;
      }
    }
  },

  /**
   * Batch items from async iterator
   */
  async *batch(iterator, size = 1000) {
    let batch = [];

    for await (const item of iterator) {
      batch.push(item);

      if (batch.length >= size) {
        yield batch;
        batch = [];
      }
    }

    if (batch.length > 0) {
      yield batch;
    }
  }
};

/**
 * Get runtime optimization hints
 */
function getOptimizationHints() {
  return {
    nodeVersion: `${major}.${minor}`,
    features,
    recommendations: {
      useWebStreams: features.hasWebStreams,
      useStructuredClone: features.hasStructuredClone,
      useLargerBatches: features.isNode20Plus,
      useHigherParallelism: features.isNode22Plus,
      preferredChunkSize: features.isNode24Plus ? 131072 : (features.isNode20Plus ? 65536 : 16384)
    }
  };
}

module.exports = {
  // Feature detection
  features,
  nodeVersion: { major, minor },

  // Polyfills and optimized functions
  hasOwn,
  deepClone,
  arrayAt,

  // Classes
  StringBuilderOptimized,
  RowBuffer,
  ObjectPool,

  // Constants
  CHAR_CODES,

  // Functions
  fastDetectDelimiter,
  fastEscapeValue,
  createBatchProcessor,

  // Async utilities
  asyncIterUtils,

  // Diagnostics
  getOptimizationHints
};
