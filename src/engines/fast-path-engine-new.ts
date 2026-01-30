/**
 * Fast-Path Engine для оптимизации CSV парсинга
 * Автоматически выбирает оптимальный парсер на основе структуры CSV
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

class FastPathEngine {
  compilers: Map<any, any>;
  stats: {
    simpleParserCount: number;
    quoteAwareParserCount: number;
    standardParserCount: number;
    cacheHits: number;
    cacheMisses: number;
  };

  constructor() {
    this.compilers = new Map();
    this.stats = {
      simpleParserCount: 0,
      quoteAwareParserCount: 0,
      standardParserCount: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Анализирует структуру CSV и определяет оптимальный парсер
   */
  analyzeStructure(sample, options: any = {}) {
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
  _selectEngine(hasQuotes, hasNewlinesInFields, fieldConsistency) {
    if (!hasQuotes && !hasNewlinesInFields && fieldConsistency) {
      return 'SIMPLE';
    }
    
    if (hasQuotes && !hasNewlinesInFields) {
      return 'QUOTE_AWARE';
    }
    
    return 'STANDARD';
  }

  /**
   * Компилирует специализированный парсер для конкретной структуры
   */
  compileParser(structure) {
    const cacheKey = JSON.stringify(structure);
    
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
    default:
      parser = this._createStandardParser(structure);
      this.stats.standardParserCount++;
    }

    this.compilers.set(cacheKey, parser);
    return parser;
  }

  /**
   * Regex-based парсер для простых CSV (без кавычек)
   */
  _createSimpleParser(structure) {
    const { delimiter } = structure;
    
    return (csv) => {
      const rows = [];
      const lines = csv.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '') {
          continue;
        }
        
        const fields = line.split(delimiter).map(field => field.trim());
        if (fields.length > 0 && fields.some(field => field !== '')) {
          rows.push(fields);
        }
      }
      
      return rows;
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
            if (nextChar === '"' && hasEscapedQuotes) {
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
   * Парсит CSV с использованием оптимального парсера
   */
  parse(csv, options = {}) {
    const sampleSize = Math.min(1000, csv.length);
    const sample = csv.substring(0, sampleSize);
    
    const structure = this.analyzeStructure(sample, options);
    const parser = this.compileParser(structure);
    
    return parser(csv);
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
    this.stats = {
      simpleParserCount: 0,
      quoteAwareParserCount: 0,
      standardParserCount: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }
}

export default FastPathEngine;
