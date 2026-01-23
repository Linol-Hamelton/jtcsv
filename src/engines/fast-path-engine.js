/**
 * Fast-Path Engine для оптимизации CSV парсинга
 * Автоматически выбирает оптимальный парсер на основе структуры CSV
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

class FastPathEngine {
  constructor() {
    this.compilers = new Map();
    this.rowCompilers = new Map();
    this.stats = {
      simpleParserCount: 0,
      quoteAwareParserCount: 0,
      standardParserCount: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  _hasQuotes(csv) {
    return csv.indexOf('"') !== -1;
  }

  _hasEscapedQuotes(csv) {
    return csv.indexOf('""') !== -1;
  }

  _hasBackslashes(csv) {
    return csv.indexOf('\\') !== -1;
  }

  _getStructureForParse(csv, options) {
    const sampleSize = Math.min(1000, csv.length);
    const sample = csv.substring(0, sampleSize);
    const structure = this.analyzeStructure(sample, options);
    const hasBackslashes = this._hasBackslashes(csv);
    const hasQuotes = structure.hasQuotes ? true : this._hasQuotes(csv);
    const hasEscapedQuotes = structure.hasEscapedQuotes
      ? true
      : (hasQuotes ? this._hasEscapedQuotes(csv) : false);

    let normalized = {
      ...structure,
      hasQuotes,
      hasEscapedQuotes,
      hasBackslashes
    };

    if (structure.recommendedEngine === 'SIMPLE' && hasQuotes) {
      normalized = {
        ...normalized,
        hasNewlinesInFields: true,
        recommendedEngine: 'QUOTE_AWARE'
      };
    }

    if (options && options.forceEngine) {
      normalized = {
        ...normalized,
        recommendedEngine: options.forceEngine
      };
    }

    return normalized;
  }

  /**
   * Анализирует структуру CSV и определяет оптимальный парсер
   */
  analyzeStructure(sample, options = {}) {
    const delimiter = options.delimiter || this._detectDelimiter(sample);
    const lines = sample.split('\n').slice(0, 10);
    
    let hasQuotes = false;
    let hasNewlinesInFields = false;
    let hasEscapedQuotes = false;
    let maxFields = 0;
    let totalFields = 0;

    for (const line of lines) {
      if (line.includes('"')) {
        hasQuotes = true;
        if (line.includes('""')) {
          hasEscapedQuotes = true;
        }
      }
      
      const quoteCount = (line.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        hasNewlinesInFields = true;
      }

      const fieldCount = line.split(delimiter).length;
      totalFields += fieldCount;
      if (fieldCount > maxFields) {
        maxFields = fieldCount;
      }
    }

    const avgFieldsPerLine = totalFields / lines.length;
    const fieldConsistency = maxFields === avgFieldsPerLine;

    return {
      delimiter,
      hasQuotes,
      hasEscapedQuotes,
      hasNewlinesInFields,
      fieldConsistency,
      avgFieldsPerLine,
      maxFields,
      recommendedEngine: this._selectEngine(hasQuotes, hasNewlinesInFields, fieldConsistency)
    };
  }

  /**
   * Автоматически определяет разделитель
   */
  _detectDelimiter(sample) {
    const candidates = [',', ';', '\t', '|'];
    const firstLine = sample.split('\n')[0];
    
    let bestDelimiter = ',';
    let bestScore = 0;

    for (const delimiter of candidates) {
      const fields = firstLine.split(delimiter);
      const score = fields.length;
      
      // Если разделитель не найден в строке, пропускаем его
      if (score === 1 && !firstLine.includes(delimiter)) {
        continue;
      }
      
      const avgLength = fields.reduce((sum, field) => sum + field.length, 0) / fields.length;
      const variance = fields.reduce((sum, field) => sum + Math.pow(field.length - avgLength, 2), 0) / fields.length;
      
      const finalScore = score / (variance + 1);
      
      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  /**
   * Выбирает оптимальный движок парсинга
   */
  _selectEngine(hasQuotes, hasNewlinesInFields, _fieldConsistency) {
    if (!hasQuotes && !hasNewlinesInFields) {
      return 'SIMPLE';
    }
    
    if (hasQuotes && !hasNewlinesInFields) {
      return 'QUOTE_AWARE';
    }
    
    return 'STANDARD';
  }

  /**
   * Создает простой парсер (разделитель без кавычек)
   */
  _createSimpleParser(structure) {
    const { delimiter, hasBackslashes } = structure;
    
    return (csv) => {
      const rows = [];
      if (hasBackslashes) {
        this._emitSimpleRowsEscaped(csv, delimiter, (row) => rows.push(row));
      } else {
        this._emitSimpleRows(csv, delimiter, (row) => rows.push(row));
      }

      return rows;
    };
  }

  _emitSimpleRows(csv, delimiter, onRow) {
    let currentRow = [];
    let rowHasData = false;
    let fieldStart = 0;
    let i = 0;

    while (i <= csv.length) {
      const char = i < csv.length ? csv[i] : '\n';

      if (char !== '\r' && char !== '\n' && char !== ' ' && char !== '\t') {
        rowHasData = true;
      }

      if (char === delimiter || char === '\n' || char === '\r' || i === csv.length) {
        const field = csv.slice(fieldStart, i);
        currentRow.push(field);

        if (char === '\n' || char === '\r' || i === csv.length) {
          if (rowHasData) {
            onRow(currentRow);
          }
          currentRow = [];
          rowHasData = false;
        }

        if (char === '\r' && csv[i + 1] === '\n') {
          i++;
        }

        fieldStart = i + 1;
      }

      i++;
    }
  }

  _emitSimpleRowsEscaped(csv, delimiter, onRow) {
    let currentRow = [];
    let currentField = '';
    let rowHasData = false;
    let escapeNext = false;
    let i = 0;

    while (i <= csv.length) {
      const char = i < csv.length ? csv[i] : '\n';
      const nextChar = i + 1 < csv.length ? csv[i + 1] : '';

      if (char !== '\r' && char !== '\n' && char !== ' ' && char !== '\t') {
        rowHasData = true;
      }

      if (escapeNext) {
        currentField += char;
        escapeNext = false;
        i++;
        continue;
      }

      if (char === '\\') {
        if (i + 1 >= csv.length) {
          currentField += '\\';
          i++;
          continue;
        }

        if (nextChar === '\\') {
          currentField += '\\';
          i += 2;
          continue;
        }

        if (nextChar === '\n' || nextChar === '\r') {
          currentField += '\\';
          i++;
          continue;
        }

        escapeNext = true;
        i++;
        continue;
      }

      if (char === delimiter || char === '\n' || char === '\r' || i === csv.length) {
        currentRow.push(currentField);
        currentField = '';

        if (char === '\n' || char === '\r' || i === csv.length) {
          if (rowHasData) {
            onRow(currentRow);
          }
          currentRow = [];
          rowHasData = false;
        }

        if (char === '\r' && csv[i + 1] === '\n') {
          i++;
        }

        i++;
        continue;
      }

      currentField += char;
      i++;
    }
  }

  *_simpleRowsGenerator(csv, delimiter) {
    let currentRow = [];
    let rowHasData = false;
    let fieldStart = 0;
    let i = 0;

    while (i <= csv.length) {
      const char = i < csv.length ? csv[i] : '\n';

      if (char !== '\r' && char !== '\n' && char !== ' ' && char !== '\t') {
        rowHasData = true;
      }

      if (char === delimiter || char === '\n' || char === '\r' || i === csv.length) {
        const field = csv.slice(fieldStart, i);
        currentRow.push(field);

        if (char === '\n' || char === '\r' || i === csv.length) {
          if (rowHasData) {
            yield currentRow;
          }
          currentRow = [];
          rowHasData = false;
        }

        if (char === '\r' && csv[i + 1] === '\n') {
          i++;
        }

        fieldStart = i + 1;
      }

      i++;
    }
  }

  *_simpleEscapedRowsGenerator(csv, delimiter) {
    let currentRow = [];
    let currentField = '';
    let rowHasData = false;
    let escapeNext = false;
    let i = 0;

    while (i <= csv.length) {
      const char = i < csv.length ? csv[i] : '\n';
      const nextChar = i + 1 < csv.length ? csv[i + 1] : '';

      if (char !== '\r' && char !== '\n' && char !== ' ' && char !== '\t') {
        rowHasData = true;
      }

      if (escapeNext) {
        currentField += char;
        escapeNext = false;
        i++;
        continue;
      }

      if (char === '\\') {
        if (i + 1 >= csv.length) {
          currentField += '\\';
          i++;
          continue;
        }

        if (nextChar === '\\') {
          currentField += '\\';
          i += 2;
          continue;
        }

        if (nextChar === '\n' || nextChar === '\r') {
          currentField += '\\';
          i++;
          continue;
        }

        escapeNext = true;
        i++;
        continue;
      }

      if (char === delimiter || char === '\n' || char === '\r' || i === csv.length) {
        currentRow.push(currentField);
        currentField = '';

        if (char === '\n' || char === '\r' || i === csv.length) {
          if (rowHasData) {
            yield currentRow;
          }
          currentRow = [];
          rowHasData = false;
        }

        if (char === '\r' && csv[i + 1] === '\n') {
          i++;
        }

        i++;
        continue;
      }

      currentField += char;
      i++;
    }
  }

  /**
   * Simple row emitter that avoids storing all rows in memory.
   */
  _createSimpleRowEmitter(structure) {
    const { delimiter, hasBackslashes } = structure;

    return (csv, onRow) => {
      if (hasBackslashes) {
        this._emitSimpleRowsEscaped(csv, delimiter, onRow);
      } else {
        this._emitSimpleRows(csv, delimiter, onRow);
      }
    };
  }

  /**
   * State machine парсер для CSV с кавычками (RFC 4180)
   */
  _createQuoteAwareParser(structure) {
    const { delimiter, hasEscapedQuotes, hasBackslashes } = structure;

    return (csv) => {
      const rows = [];
      const iterator = hasBackslashes
        ? this._quoteAwareEscapedRowsGenerator(csv, delimiter, hasEscapedQuotes)
        : this._quoteAwareRowsGenerator(csv, delimiter, hasEscapedQuotes);

      for (const row of iterator) {
        rows.push(row);
      }

      return rows;
    };
  }

  /**
   * Quote-aware row emitter that avoids storing all rows in memory.
   */
  _createQuoteAwareRowEmitter(structure) {
    const { delimiter, hasEscapedQuotes, hasBackslashes } = structure;

    return (csv, onRow) => {
      const iterator = hasBackslashes
        ? this._quoteAwareEscapedRowsGenerator(csv, delimiter, hasEscapedQuotes)
        : this._quoteAwareRowsGenerator(csv, delimiter, hasEscapedQuotes);

      for (const row of iterator) {
        onRow(row);
      }
    };
  }

  *_quoteAwareRowsGenerator(csv, delimiter, hasEscapedQuotes) {
    let currentRow = [];
    let currentField = '';
    let rowHasData = false;
    let insideQuotes = false;
    let lineNumber = 1;
    let i = 0;

    while (i < csv.length) {
      const char = csv[i];
      const nextChar = csv[i + 1];

      if (char !== '\r' && char !== '\n' && char !== ' ' && char !== '\t') {
        rowHasData = true;
      }

      if (char === '"') {
        if (insideQuotes) {
          if (hasEscapedQuotes && nextChar === '"') {
            const afterNext = csv[i + 2];
            const isLineEnd = i + 2 >= csv.length || afterNext === '\n' || afterNext === '\r';

            currentField += '"';
            if (isLineEnd) {
              insideQuotes = false;
              i += 2;
              continue;
            }

            i += 2;

            let j = i;
            while (j < csv.length && (csv[j] === ' ' || csv[j] === '\t')) {
              j++;
            }
            if (j >= csv.length || csv[j] === delimiter || csv[j] === '\n' || csv[j] === '\r') {
              insideQuotes = false;
            }
            continue;
          }

          let j = i + 1;
          while (j < csv.length && (csv[j] === ' ' || csv[j] === '\t')) {
            j++;
          }
          if (j >= csv.length || csv[j] === delimiter || csv[j] === '\n' || csv[j] === '\r') {
            insideQuotes = false;
            i++;
            continue;
          }

          currentField += '"';
          i++;
          continue;
        }

        insideQuotes = true;
        i++;
        continue;
      }

      if (!insideQuotes && (char === delimiter || char === '\n' || char === '\r')) {
        currentRow.push(currentField);
        currentField = '';

        if (char === '\n' || char === '\r') {
          if (rowHasData) {
            yield currentRow;
          }
          currentRow = [];
          rowHasData = false;
          lineNumber++;

          if (char === '\r' && nextChar === '\n') {
            i++;
          }
        }

        i++;
        continue;
      }

      currentField += char;
      i++;
    }

    if (insideQuotes) {
      const error = new Error('Unclosed quotes in CSV');
      error.code = 'FAST_PATH_UNCLOSED_QUOTES';
      error.lineNumber = lineNumber;
      throw error;
    }

    if (currentField !== '' || currentRow.length > 0) {
      currentRow.push(currentField);
      if (rowHasData) {
        yield currentRow;
      }
    }
  }

  *_quoteAwareEscapedRowsGenerator(csv, delimiter, hasEscapedQuotes) {
    let currentRow = [];
    let currentField = '';
    let rowHasData = false;
    let insideQuotes = false;
    let escapeNext = false;
    let lineNumber = 1;
    let i = 0;

    while (i < csv.length) {
      const char = csv[i];
      const nextChar = csv[i + 1];

      if (char !== '\r' && char !== '\n' && char !== ' ' && char !== '\t') {
        rowHasData = true;
      }

      if (escapeNext) {
        currentField += char;
        escapeNext = false;
        i++;
        continue;
      }

      if (char === '\\') {
        if (i + 1 >= csv.length) {
          currentField += '\\';
          i++;
          continue;
        }

        if (!insideQuotes && (nextChar === '\n' || nextChar === '\r')) {
          currentField += '\\';
          i++;
          continue;
        }

        if (nextChar === '\\') {
          currentField += '\\';
          i += 2;
          continue;
        }

        escapeNext = true;
        i++;
        continue;
      }

      if (char === '"') {
        if (insideQuotes) {
          if (hasEscapedQuotes && nextChar === '"') {
            const afterNext = csv[i + 2];
            const isLineEnd = i + 2 >= csv.length || afterNext === '\n' || afterNext === '\r';

            currentField += '"';
            if (isLineEnd) {
              insideQuotes = false;
              i += 2;
              continue;
            }

            i += 2;

            let j = i;
            while (j < csv.length && (csv[j] === ' ' || csv[j] === '\t')) {
              j++;
            }
            if (j >= csv.length || csv[j] === delimiter || csv[j] === '\n' || csv[j] === '\r') {
              insideQuotes = false;
            }
            continue;
          }

          let j = i + 1;
          while (j < csv.length && (csv[j] === ' ' || csv[j] === '\t')) {
            j++;
          }
          if (j >= csv.length || csv[j] === delimiter || csv[j] === '\n' || csv[j] === '\r') {
            insideQuotes = false;
            i++;
            continue;
          }

          currentField += '"';
          i++;
          continue;
        }

        insideQuotes = true;
        i++;
        continue;
      }

      if (!insideQuotes && (char === delimiter || char === '\n' || char === '\r')) {
        currentRow.push(currentField);
        currentField = '';

        if (char === '\n' || char === '\r') {
          if (rowHasData) {
            yield currentRow;
          }
          currentRow = [];
          rowHasData = false;
          lineNumber++;

          if (char === '\r' && nextChar === '\n') {
            i++;
          }
        }

        i++;
        continue;
      }

      currentField += char;
      i++;
    }

    if (escapeNext) {
      currentField += '\\';
    }

    if (insideQuotes) {
      const error = new Error('Unclosed quotes in CSV');
      error.code = 'FAST_PATH_UNCLOSED_QUOTES';
      error.lineNumber = lineNumber;
      throw error;
    }

    if (currentField !== '' || currentRow.length > 0) {
      currentRow.push(currentField);
      if (rowHasData) {
        yield currentRow;
      }
    }
  }

  compileParser(structure) {
    const cacheKey = JSON.stringify(structure);
    
    // Проверяем кеш
    if (this.compilers.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.compilers.get(cacheKey);
    }
    
    this.stats.cacheMisses++;
    
    let parser;
    switch (structure.recommendedEngine) {
    case 'SIMPLE':
      parser = this._createSimpleParser(structure);
      this.stats.simpleParserCount++;
      break;
    case 'QUOTE_AWARE':
      parser = this._createQuoteAwareParser(structure);
      this.stats.quoteAwareParserCount++;
      break;
    case 'STANDARD':
      parser = this._createQuoteAwareParser(structure);
      this.stats.standardParserCount++;
      break;
    default:
      parser = this._createQuoteAwareParser(structure);
      this.stats.standardParserCount++;
    }
    
    // Кешируем парсер
    this.compilers.set(cacheKey, parser);
    
    return parser;
  }

  /**
   * Compiles a row-emitter parser for streaming conversion.
   */
  compileRowEmitter(structure) {
    const cacheKey = JSON.stringify(structure);

    if (this.rowCompilers.has(cacheKey)) {
      return this.rowCompilers.get(cacheKey);
    }

    let emitter;
    switch (structure.recommendedEngine) {
    case 'SIMPLE':
      emitter = this._createSimpleRowEmitter(structure);
      break;
    case 'QUOTE_AWARE':
      emitter = this._createQuoteAwareRowEmitter(structure);
      break;
    case 'STANDARD':
      emitter = this._createQuoteAwareRowEmitter(structure);
      break;
    default:
      emitter = this._createQuoteAwareRowEmitter(structure);
    }

    this.rowCompilers.set(cacheKey, emitter);
    return emitter;
  }

  /**
   * Iterates rows without allocating the full result set.
   */
  *iterateRows(csv, options = {}) {
    const structure = this._getStructureForParse(csv, options);
    const useEscapes = structure.hasBackslashes;

    switch (structure.recommendedEngine) {
    case 'SIMPLE':
      if (useEscapes) {
        yield* this._simpleEscapedRowsGenerator(csv, structure.delimiter);
      } else {
        yield* this._simpleRowsGenerator(csv, structure.delimiter);
      }
      break;
    case 'QUOTE_AWARE':
      if (useEscapes) {
        yield* this._quoteAwareEscapedRowsGenerator(csv, structure.delimiter, structure.hasEscapedQuotes);
      } else {
        yield* this._quoteAwareRowsGenerator(csv, structure.delimiter, structure.hasEscapedQuotes);
      }
      break;
    case 'STANDARD':
      if (useEscapes) {
        yield* this._quoteAwareEscapedRowsGenerator(csv, structure.delimiter, structure.hasEscapedQuotes);
      } else {
        yield* this._quoteAwareRowsGenerator(csv, structure.delimiter, structure.hasEscapedQuotes);
      }
      break;
    default:
      if (useEscapes) {
        yield* this._quoteAwareEscapedRowsGenerator(csv, structure.delimiter, structure.hasEscapedQuotes);
      } else {
        yield* this._quoteAwareRowsGenerator(csv, structure.delimiter, structure.hasEscapedQuotes);
      }
    }
  }

  /**
   * Парсит CSV с использованием оптимального парсера
   */
  parse(csv, options = {}) {
    const structure = this._getStructureForParse(csv, options);
    const parser = this.compileParser(structure);
    
    return parser(csv);
  }

  /**
   * Parses CSV and emits rows via a callback to reduce memory usage.
   */
  parseRows(csv, options = {}, onRow) {
    for (const row of this.iterateRows(csv, options)) {
      onRow(row);
    }
  }

  /**
   * Возвращает статистику использования парсеров
   */
  getStats() {
    return {
      ...this.stats,
      totalParsers: this.compilers.size,
      hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0
    };
  }

  /**
   * Сбрасывает статистику и кеш
   */
  reset() {
    this.compilers.clear();
    this.rowCompilers.clear();
    this.stats = {
      simpleParserCount: 0,
      quoteAwareParserCount: 0,
      standardParserCount: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
}

module.exports = FastPathEngine;
