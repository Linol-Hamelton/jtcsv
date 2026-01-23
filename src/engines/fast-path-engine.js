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

  _getStructureForParse(csv, options) {
    const sampleSize = Math.min(1000, csv.length);
    const sample = csv.substring(0, sampleSize);
    const structure = this.analyzeStructure(sample, options);

    if (structure.recommendedEngine === 'SIMPLE' && this._hasQuotes(csv)) {
      return {
        ...structure,
        hasQuotes: true,
        hasEscapedQuotes: this._hasEscapedQuotes(csv),
        hasNewlinesInFields: true,
        recommendedEngine: 'QUOTE_AWARE'
      };
    }

    return structure;
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
    const { delimiter } = structure;
    
    return (csv) => {
      const rows = [];
      this._emitSimpleRows(csv, delimiter, (row) => rows.push(row));

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

  /**
   * Simple row emitter that avoids storing all rows in memory.
   */
  _createSimpleRowEmitter(structure) {
    const { delimiter } = structure;

    return (csv, onRow) => {
      this._emitSimpleRows(csv, delimiter, onRow);
    };
  }

  /**
   * State machine парсер для CSV с кавычками (RFC 4180)
   */
  _createQuoteAwareParser(structure) {
    const { delimiter, hasEscapedQuotes } = structure;
    
    return (csv) => {
      const rows = [];
      let currentRow = [];
      let currentField = '';
      let insideQuotes = false;
      let i = 0;

      while (i < csv.length) {
        const char = csv[i];
        const nextChar = csv[i + 1];

        if (char === '"') {
          if (insideQuotes) {
            if (hasEscapedQuotes && nextChar === '"') {
              currentField += '"';
              i += 2;
            } else {
              insideQuotes = false;
              i++;
            }
          } else {
            insideQuotes = true;
            i++;
          }
        } else if (char === delimiter && !insideQuotes) {
          currentRow.push(currentField);
          currentField = '';
          i++;
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
          currentRow.push(currentField);
          if (currentRow.length > 0 && currentRow.some(field => field !== '')) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
          i += (char === '\r' && nextChar === '\n') ? 2 : 1;
        } else {
          currentField += char;
          i++;
        }
      }

      if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.length > 0 && currentRow.some(field => field !== '')) {
          rows.push(currentRow);
        }
      }

      return rows;
    };
  }

  /**
   * Quote-aware row emitter that avoids storing all rows in memory.
   */
  _createQuoteAwareRowEmitter(structure) {
    const { delimiter, hasEscapedQuotes } = structure;

    return (csv, onRow) => {
      let currentRow = [];
      let currentField = '';
      let rowHasData = false;
      let insideQuotes = false;
      let i = 0;

      while (i < csv.length) {
        const char = csv[i];
        const nextChar = csv[i + 1];

        if (char === '"') {
          if (insideQuotes) {
            if (hasEscapedQuotes && nextChar === '"') {
              currentField += '"';
              i += 2;
            } else {
              insideQuotes = false;
              i++;
            }
          } else {
            insideQuotes = true;
            i++;
          }
        } else if (char === delimiter && !insideQuotes) {
          if (currentField.length > 0) {
            rowHasData = true;
          }
          currentRow.push(currentField);
          currentField = '';
          i++;
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
          if (currentField.length > 0) {
            rowHasData = true;
          }
          currentRow.push(currentField);
          if (rowHasData) {
            onRow(currentRow);
          }
          currentRow = [];
          currentField = '';
          rowHasData = false;
          i += (char === '\r' && nextChar === '\n') ? 2 : 1;
        } else {
          currentField += char;
          i++;
        }
      }

      if (currentField.length > 0) {
        rowHasData = true;
      }
      if (currentField !== '' || currentRow.length > 0) {
        currentRow.push(currentField);
        if (rowHasData) {
          onRow(currentRow);
        }
      }
    };
  }

  /**
   * Стандартный парсер (fallback)
   */
  _createStandardParser(structure) {
    const { delimiter } = structure;
    
    return (csv) => {
      const rows = [];
      const lines = csv.split('\n');
      let insideQuotes = false;
      let currentLine = '';
      
      for (const line of lines) {
        const quoteCount = (line.match(/"/g) || []).length;
        
        if (insideQuotes) {
          currentLine += '\n' + line;
          if (quoteCount % 2 !== 0) {
            insideQuotes = false;
            rows.push(this._parseLineWithQuotes(currentLine, delimiter));
            currentLine = '';
          }
        } else {
          if (quoteCount % 2 !== 0) {
            insideQuotes = true;
            currentLine = line;
          } else {
            rows.push(this._parseLineWithQuotes(line, delimiter));
          }
        }
      }
      
      return rows;
    };
  }

  /**
   * Парсит строку с учетом кавычек
   */
  _parseLineWithQuotes(line, delimiter) {
    const fields = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i += 2;
        } else {
          insideQuotes = !insideQuotes;
          i++;
        }
      } else if (char === delimiter && !insideQuotes) {
        fields.push(currentField);
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }

    fields.push(currentField);
    return fields;
  }

  /**
   * Компилирует парсер на основе структуры CSV
   */
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
      parser = this._createStandardParser(structure);
      this.stats.standardParserCount++;
      break;
    default:
      parser = this._createStandardParser(structure);
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
    const structure = this._getStructureForParse(csv, options);
    const emitter = this.compileRowEmitter(structure);

    emitter(csv, onRow);
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
