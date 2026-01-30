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
const nodeVersionStr = process.versions?.node || '12.0.0';
const [major, minor] = nodeVersionStr.split('.').map(Number);

// Feature detection flags
export const features = {
  // Node 14.17+ / 16+
  hasAbortController: typeof AbortController !== 'undefined',

  // Node 15+
  hasPromiseAny: typeof (Promise as any).any === 'function',

  // Node 16+
  hasArrayAt: typeof Array.prototype.at === 'function',
  hasObjectHasOwn: typeof (Object as any).hasOwn === 'function',

  // Node 17+
  hasStructuredClone: typeof globalThis.structuredClone === 'function',

  // Node 18+
  hasFetch: typeof globalThis.fetch === 'function',

  // Node 20+
  hasWebStreams: typeof globalThis.ReadableStream !== 'undefined' && major >= 20,
  hasArrayGroup: typeof (Array.prototype as any).group === 'function',

  // Node 21+
  hasSetMethods: typeof (Set.prototype as any).union === 'function',

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
export const hasOwn = features.hasObjectHasOwn
  ? (Object as any).hasOwn
  : (obj: object, prop: string | number | symbol): boolean => 
      Object.prototype.hasOwnProperty.call(obj, prop);

/**
 * Optimized deep clone function
 * Uses structuredClone on Node 17+ for best performance
 */
export const deepClone = features.hasStructuredClone
  ? <T>(obj: T): T => structuredClone(obj)
  : <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

/**
 * Optimized array access with at() method
 */
export const arrayAt = features.hasArrayAt
  ? <T>(arr: T[], index: number): T | undefined => arr.at(index)
  : <T>(arr: T[], index: number): T | undefined => {
    const len = arr.length;
    const normalizedIndex = index < 0 ? len + index : index;
    return normalizedIndex >= 0 && normalizedIndex < len ? arr[normalizedIndex] : undefined;
  };

/**
 * High-performance string builder for large CSV generation
 * Uses different strategies based on Node version
 */
export class StringBuilderOptimized {
  private parts: string[];
  private length: number;
  private initialCapacity: number;
  private chunkSize: number;

  constructor(initialCapacity = 1024) {
    this.parts = [];
    this.length = 0;
    this.initialCapacity = initialCapacity;

    // Node 20+ uses more aggressive chunking
    this.chunkSize = features.isNode20Plus ? 65536 : 16384;
  }

  append(str: string): this {
    if (str) {
      this.parts.push(str);
      this.length += str.length;
    }
    return this;
  }

  toString(): string {
    return this.parts.join('');
  }

  clear(): void {
    this.parts = [];
    this.length = 0;
  }

  getLength(): number {
    return this.length;
  }
}

/**
 * Optimized row buffer for streaming CSV parsing
 * Minimizes allocations on modern Node versions
 */
export class RowBuffer<T = any> {
  private rows: T[][];
  private currentRow: T[];
  private rowCount: number;

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

  addField(field: T): void {
    this.currentRow.push(field);
  }

  commitRow(): void {
    if (this.currentRow.length > 0) {
      this.rows.push(this.currentRow);
      this.rowCount++;
      this.currentRow = [];
    }
  }

  getRows(): T[][] {
    return this.rows;
  }

  clear(): void {
    this.rows = features.isNode20Plus ? new Array(100) : [];
    this.rows.length = 0;
    this.currentRow = [];
    this.rowCount = 0;
  }

  getRowCount(): number {
    return this.rowCount;
  }
}

/**
 * Optimized field parser with char code comparisons
 * Faster than string comparisons on all Node versions
 */
export const CHAR_CODES = {
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
} as const;

/**
 * Fast delimiter detection using char codes
 */
export function fastDetectDelimiter(sample: string, candidates = [';', ',', '\t', '|']): string {
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
export function createBatchProcessor<T, R>(
  processor: (batch: T[]) => Promise<R[]> | R[],
  options: { batchSize?: number; parallelism?: number } = {}
): (items: T[]) => AsyncGenerator<R> {
  const batchSize = options.batchSize || (features.isNode20Plus ? 10000 : 5000);
  const parallelism = options.parallelism || (features.isNode22Plus ? 4 : 2);

  return async function* processBatches(items: T[]): AsyncGenerator<R> {
    const batches: T[][] = [];

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
export class ObjectPool<T> {
  private factory: () => T;
  private pool: T[];
  private inUse: number;

  constructor(factory: () => T, initialSize = 100) {
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

  acquire(): T {
    this.inUse++;
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    this.inUse--;
    // Clear object properties before returning to pool
    for (const key in obj) {
      if (hasOwn(obj, key)) {
        delete (obj as any)[key];
      }
    }
    this.pool.push(obj);
  }

  getStats(): { poolSize: number; inUse: number } {
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

export function fastEscapeValue(value: any, delimiterCode: number): string {
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
export const asyncIterUtils = {
  /**
   * Map over async iterator with concurrency control (Node 20+)
   */
  async *mapConcurrent<T, R>(
    iterator: AsyncIterable<T>,
    mapper: (item: T) => Promise<R> | R,
    concurrency = 4
  ): AsyncGenerator<R> {
    const pending: Promise<R>[] = [];

    for await (const item of iterator) {
      pending.push(Promise.resolve(mapper(item)));

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
  async *batch<T>(iterator: AsyncIterable<T>, size = 1000): AsyncGenerator<T[]> {
    let batch: T[] = [];

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
export function getOptimizationHints(): {
  nodeVersion: string;
  features: typeof features;
  recommendations: {
    useWebStreams: boolean;
    useStructuredClone: boolean;
    useLargerBatches: boolean;
    useHigherParallelism: boolean;
    preferredChunkSize: number;
  };
} {
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

export const nodeVersionInfo = { major, minor };

export default {
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
