// Браузерная версия CSV to JSON конвертера
// Адаптирована для работы в браузере без Node.js API

import {
  ValidationError,
  ParsingError,
  LimitError,
  ConfigurationError,
  safeExecute
} from './errors-browser.js';

/**
 * Валидация опций парсинга
 * @private
 */
function validateCsvOptions(options) {
  // Validate options
  if (options && typeof options !== 'object') {
    throw new ConfigurationError('Options must be an object');
  }
  
  // Validate delimiter
  if (options?.delimiter && typeof options.delimiter !== 'string') {
    throw new ConfigurationError('Delimiter must be a string');
  }
  
  if (options?.delimiter && options.delimiter.length !== 1) {
    throw new ConfigurationError('Delimiter must be a single character');
  }
  
  // Validate autoDetect
  if (options?.autoDetect !== undefined && typeof options.autoDetect !== 'boolean') {
    throw new ConfigurationError('autoDetect must be a boolean');
  }
  
  // Validate candidates
  if (options?.candidates && !Array.isArray(options.candidates)) {
    throw new ConfigurationError('candidates must be an array');
  }
  
  // Validate maxRows
  if (options?.maxRows !== undefined && (typeof options.maxRows !== 'number' || options.maxRows <= 0)) {
    throw new ConfigurationError('maxRows must be a positive number');
  }

  if (options?.warnExtraFields !== undefined && typeof options.warnExtraFields !== 'boolean') {
    throw new ConfigurationError('warnExtraFields must be a boolean');
  }
  
  return true;
}

/**
 * Валидация CSV ввода и опций
 * @private
 */
function validateCsvInput(csv, options) {
  // Validate CSV input
  if (typeof csv !== 'string') {
    throw new ValidationError('Input must be a CSV string');
  }
  
  return validateCsvOptions(options);
}

/**
 * Парсинг одной строки CSV с правильным экранированием
 * @private
 */
function parseCsvLine(line, lineNumber, delimiter) {
  const fields = [];
  let currentField = '';
  let insideQuotes = false;
  let escapeNext = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (escapeNext) {
      currentField += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      if (i + 1 === line.length) {
        // Обратный слеш в конце строки
        currentField += char;
      } else if (line[i + 1] === '\\') {
        // Двойной обратный слеш
        currentField += char;
        i++; // Пропустить следующий слеш
      } else {
        // Экранирование следующего символа
        escapeNext = true;
      }
      continue;
    }

    if (char === '"') {
      if (insideQuotes) {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Экранированная кавычка внутри кавычек
          currentField += '"';
          i++; // Пропустить следующую кавычку
          
          // Проверка конца поля
          let isEndOfField = false;
          let j = i + 1;
          while (j < line.length && (line[j] === ' ' || line[j] === '\t')) {
            j++;
          }
          if (j === line.length || line[j] === delimiter) {
            isEndOfField = true;
          }
          
          if (isEndOfField) {
            insideQuotes = false;
          }
        } else {
          // Проверка конца поля
          let isEndOfField = false;
          let j = i + 1;
          while (j < line.length && (line[j] === ' ' || line[j] === '\t')) {
            j++;
          }
          if (j === line.length || line[j] === delimiter) {
            isEndOfField = true;
          }
          
          if (isEndOfField) {
            insideQuotes = false;
          } else {
            currentField += '"';
          }
        }
      } else {
        // Начало поля в кавычках
        insideQuotes = true;
      }
      continue;
    }

    if (!insideQuotes && char === delimiter) {
      // Конец поля
      fields.push(currentField);
      currentField = '';
      continue;
    }

    currentField += char;
  }

  // Обработка незавершенного экранирования
  if (escapeNext) {
    currentField += '\\';
  }

  // Добавление последнего поля
  fields.push(currentField);

  // Проверка незакрытых кавычек
  if (insideQuotes) {
    throw new ParsingError('Unclosed quotes in CSV', lineNumber);
  }

  // Валидация количества полей
  if (fields.length === 0) {
    throw new ParsingError('No fields found', lineNumber);
  }

  return fields;
}

/**
 * Парсинг значения на основе опций
 * @private
 */
function parseCsvValue(value, options) {
  const { trim = true, parseNumbers = false, parseBooleans = false } = options;
  
  let result = value;
  
  if (trim) {
    result = result.trim();
  }
  
  // Удаление защиты формул Excel
  if (result.startsWith("'")) {
    result = result.substring(1);
  }
  
  // Парсинг чисел
  if (parseNumbers) {
    // Быстрая проверка числа: первый символ цифра, минус или точка
    const trimmed = result.trim();
    const firstChar = trimmed.charAt(0);
    if ((firstChar >= '0' && firstChar <= '9') || firstChar === '-' || firstChar === '.') {
      const num = parseFloat(trimmed);
      if (!isNaN(num) && isFinite(num)) {
        // Убедимся, что строка полностью соответствует числу (без лишних символов)
        if (String(num) === trimmed || (trimmed.includes('.') && !isNaN(Number(trimmed)))) {
          return num;
        }
      }
    }
  }
  
  // Парсинг булевых значений
  if (parseBooleans) {
    const lowerValue = result.toLowerCase();
    if (lowerValue === 'true') {
      return true; 
    }
    if (lowerValue === 'false') {
      return false; 
    }
  }
  
  // Пустые строки как null
  if (result === '') {
    return null;
  }
  
  return result;
}

function isSimpleCsv(csv) {
  return csv.indexOf('"') === -1 && csv.indexOf('\\') === -1;
}

function parseSimpleCsv(csv, delimiter, options) {
  const {
    hasHeaders = true,
    renameMap = {},
    trim = true,
    parseNumbers = false,
    parseBooleans = false,
    maxRows
  } = options;

  const result = [];
  let headers = null;
  let fieldStart = 0;
  let currentRow = [];
  let rowHasData = false;
  let rowCount = 0;

  const finalizeRow = (fields) => {
    if (fields.length === 1 && fields[0].trim() === '') {
      return;
    }

    if (!headers) {
      if (hasHeaders) {
        headers = fields.map(header => {
          const trimmed = trim ? header.trim() : header;
          return renameMap[trimmed] || trimmed;
        });
        return;
      }

      headers = fields.map((_, index) => `column${index + 1}`);
    }

    rowCount++;
    if (maxRows && rowCount > maxRows) {
      throw new LimitError(
        `CSV size exceeds maximum limit of ${maxRows} rows`,
        maxRows,
        rowCount
      );
    }

    const row = {};
    const fieldCount = Math.min(fields.length, headers.length);
    for (let i = 0; i < fieldCount; i++) {
      row[headers[i]] = parseCsvValue(fields[i], { trim, parseNumbers, parseBooleans });
    }

    result.push(row);
  };

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
        if (rowHasData || currentRow.length > 1) {
          finalizeRow(currentRow);
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

  return result;
}

/**
 * Автоматическое определение разделителя CSV
 * 
 * @param {string} csv - CSV строка
 * @param {Array} [candidates=[';', ',', '\t', '|']] - Кандидаты на разделитель
 * @returns {string} Определенный разделитель
 */
export function autoDetectDelimiter(csv, candidates = [';', ',', '\t', '|']) {
  if (!csv || typeof csv !== 'string') {
    return ';'; // значение по умолчанию
  }

  const lines = csv.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return ';'; // значение по умолчанию
  }

  // Использование первой непустой строки для определения
  const firstLine = lines[0];
  
  // Быстрый подсчёт вхождений кандидатов за один проход
  const counts = {};
  const candidateSet = new Set(candidates);
  for (let i = 0; i < firstLine.length; i++) {
    const char = firstLine[i];
    if (candidateSet.has(char)) {
      counts[char] = (counts[char] || 0) + 1;
    }
  }
  // Убедимся, что все кандидаты присутствуют в counts (даже с нулём)
  for (const delim of candidates) {
    if (!(delim in counts)) {
      counts[delim] = 0;
    }
  }

  // Поиск разделителя с максимальным количеством
  let maxCount = -1;
  let detectedDelimiter = ';'; // значение по умолчанию
  const maxDelimiters = [];
  
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxDelimiters.length = 0;
      maxDelimiters.push(delim);
    } else if (count === maxCount) {
      maxDelimiters.push(delim);
    }
  }

  // Если разделитель не найден или есть ничья, возвращаем стандартный
  if (maxCount === 0 || maxDelimiters.length > 1) {
    detectedDelimiter = ';';
  } else {
    detectedDelimiter = maxDelimiters[0];
  }

  return detectedDelimiter;
}

/**
 * Конвертирует CSV строку в JSON массив
 * 
 * @param {string} csv - CSV строка для конвертации
 * @param {Object} [options] - Опции конфигурации
 * @param {string} [options.delimiter] - CSV разделитель (по умолчанию: автоопределение)
 * @param {boolean} [options.autoDetect=true] - Автоопределение разделителя
 * @param {Array} [options.candidates=[';', ',', '\t', '|']] - Кандидаты для автоопределения
 * @param {boolean} [options.hasHeaders=true] - Есть ли заголовки в CSV
 * @param {Object} [options.renameMap={}] - Маппинг переименования заголовков
 * @param {boolean} [options.trim=true] - Обрезать пробелы
 * @param {boolean} [options.parseNumbers=false] - Парсить числовые значения
 * @param {boolean} [options.parseBooleans=false] - Парсить булевы значения
 * @param {number} [options.maxRows] - Максимальное количество строк
 * @returns {Array<Object>} JSON массив
 */
export function csvToJson(csv, options = {}) {
  return safeExecute(() => {
    // Валидация ввода
    validateCsvInput(csv, options);
    
    const opts = options && typeof options === 'object' ? options : {};
    
    const {
      delimiter,
      autoDetect = true,
      candidates = [';', ',', '\t', '|'],
      hasHeaders = true,
      renameMap = {},
      trim = true,
      parseNumbers = false,
      parseBooleans = false,
      maxRows,
      warnExtraFields = true
    } = opts;

    // Определение разделителя
    let finalDelimiter = delimiter;
    if (!finalDelimiter && autoDetect) {
      finalDelimiter = autoDetectDelimiter(csv, candidates);
    }
    finalDelimiter = finalDelimiter || ';'; // fallback

    // Обработка пустого CSV
    if (csv.trim() === '') {
      return [];
    }

    if (isSimpleCsv(csv)) {
      return parseSimpleCsv(csv, finalDelimiter, {
        hasHeaders,
        renameMap,
        trim,
        parseNumbers,
        parseBooleans,
        maxRows
      });
    }

    // Парсинг CSV с обработкой кавычек и переносов строк
    const lines = [];
    let currentLine = '';
    let insideQuotes = false;
    
    for (let i = 0; i < csv.length; i++) {
      const char = csv[i];
      
      if (char === '"') {
        if (insideQuotes && i + 1 < csv.length && csv[i + 1] === '"') {
          // Экранированная кавычка внутри кавычек
          currentLine += '"';
          i++; // Пропустить следующую кавычку
        } else {
          // Переключение режима кавычек
          insideQuotes = !insideQuotes;
        }
        currentLine += char;
        continue;
      }
      
      if (char === '\n' && !insideQuotes) {
        // Конец строки (вне кавычек)
        lines.push(currentLine);
        currentLine = '';
        continue;
      }
      
      if (char === '\r') {
        // Игнорировать carriage return
        continue;
      }
      
      currentLine += char;
    }
    
    // Добавление последней строки
    if (currentLine !== '' || insideQuotes) {
      lines.push(currentLine);
    }
    
    if (lines.length === 0) {
      return [];
    }

    // Предупреждение для больших наборов данных
    if (lines.length > 1000000 && !maxRows && process.env.NODE_ENV !== 'production') {
      console.warn(
        '⚠️ Warning: Processing >1M records in memory may be slow.\n' +
        '💡 Consider using Web Workers for better performance with large files.\n' +
        '📊 Current size: ' + lines.length.toLocaleString() + ' rows'
      );
    }

    // Применение ограничения по строкам
    if (maxRows && lines.length > maxRows) {
      throw new LimitError(
        `CSV size exceeds maximum limit of ${maxRows} rows`,
        maxRows,
        lines.length
      );
    }

    let headers = [];
    let startIndex = 0;
    
    // Парсинг заголовков если есть
    if (hasHeaders && lines.length > 0) {
      try {
        headers = parseCsvLine(lines[0], 1, finalDelimiter).map(header => {
          const trimmed = trim ? header.trim() : header;
          return renameMap[trimmed] || trimmed;
        });
        startIndex = 1;
      } catch (error) {
        if (error instanceof ParsingError) {
          throw new ParsingError(`Failed to parse headers: ${error.message}`, 1);
        }
        throw error;
      }
    } else {
      // Генерация числовых заголовков из первой строки
      try {
        const firstLineFields = parseCsvLine(lines[0], 1, finalDelimiter);
        headers = firstLineFields.map((_, index) => `column${index + 1}`);
      } catch (error) {
        if (error instanceof ParsingError) {
          throw new ParsingError(`Failed to parse first line: ${error.message}`, 1);
        }
        throw error;
      }
    }

    // Парсинг строк данных
    const result = [];
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      // Пропуск пустых строк
      if (line.trim() === '') {
        continue;
      }
      
      try {
        const fields = parseCsvLine(line, i + 1, finalDelimiter);
        
        // Обработка несоответствия количества полей
        const row = {};
        const fieldCount = Math.min(fields.length, headers.length);
        
        for (let j = 0; j < fieldCount; j++) {
          row[headers[j]] = parseCsvValue(fields[j], { trim, parseNumbers, parseBooleans });
        }
        
        // Предупреждение о лишних полях
        const isDev = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';
        if (fields.length > headers.length && warnExtraFields && isDev) {
          console.warn(`[jtcsv] Line ${i + 1}: ${fields.length - headers.length} extra fields ignored`);
        }
        
        result.push(row);
      } catch (error) {
        if (error instanceof ParsingError) {
          throw new ParsingError(`Line ${i + 1}: ${error.message}`, i + 1);
        }
        throw error;
      }
    }

    return result;
  }, 'PARSE_FAILED', { function: 'csvToJson' });
}

export async function* csvToJsonIterator(input, options = {}) {
  const opts = options && typeof options === 'object' ? options : {};
  validateCsvOptions(opts);

  if (typeof input === 'string') {
    const rows = csvToJson(input, options);
    for (const row of rows) {
      yield row;
    }
    return;
  }

  const {
    delimiter,
    autoDetect = true,
    candidates = [';', ',', '\t', '|'],
    hasHeaders = true,
    renameMap = {},
    trim = true,
    parseNumbers = false,
    parseBooleans = false,
    maxRows
  } = opts;

  const stream = (input instanceof Blob && input.stream) ? input.stream() : input;
  if (!stream || typeof stream.getReader !== 'function') {
    throw new ValidationError('Input must be a CSV string, Blob/File, or ReadableStream');
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let insideQuotes = false;
  let headers = null;
  let rowCount = 0;
  let lineNumber = 0;
  let finalDelimiter = delimiter;
  let delimiterResolved = Boolean(finalDelimiter);

  const processFields = (fields) => {
    if (fields.length === 1 && fields[0].trim() === '') {
      return null;
    }

    rowCount++;
    if (maxRows && rowCount > maxRows) {
      throw new LimitError(
        `CSV size exceeds maximum limit of ${maxRows} rows`,
        maxRows,
        rowCount
      );
    }

    const row = {};
    const fieldCount = Math.min(fields.length, headers.length);
    for (let j = 0; j < fieldCount; j++) {
      row[headers[j]] = parseCsvValue(fields[j], { trim, parseNumbers, parseBooleans });
    }
    return row;
  };

  const processLine = (line) => {
    lineNumber++;
    let cleanLine = line;
    if (cleanLine.endsWith('\r')) {
      cleanLine = cleanLine.slice(0, -1);
    }

    if (!delimiterResolved) {
      if (!finalDelimiter && autoDetect) {
        finalDelimiter = autoDetectDelimiter(cleanLine, candidates);
      }
      finalDelimiter = finalDelimiter || ';';
      delimiterResolved = true;
    }

    if (cleanLine.trim() === '') {
      return null;
    }

    if (!headers) {
      if (hasHeaders) {
        headers = parseCsvLine(cleanLine, lineNumber, finalDelimiter).map(header => {
          const trimmed = trim ? header.trim() : header;
          return renameMap[trimmed] || trimmed;
        });
        return null;
      }

      const fields = parseCsvLine(cleanLine, lineNumber, finalDelimiter);
      headers = fields.map((_, index) => `column${index + 1}`);
      return processFields(fields);
    }

    const fields = parseCsvLine(cleanLine, lineNumber, finalDelimiter);
    return processFields(fields);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let start = 0;
    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i];
      if (char === '"') {
        if (insideQuotes && buffer[i + 1] === '"') {
          i++;
          continue;
        }
        insideQuotes = !insideQuotes;
        continue;
      }

      if (char === '\n' && !insideQuotes) {
        const line = buffer.slice(start, i);
        start = i + 1;
        const row = processLine(line);
        if (row) {
          yield row;
        }
      }
    }

    buffer = buffer.slice(start);
  }

  if (buffer.length > 0) {
    const row = processLine(buffer);
    if (row) {
      yield row;
    }
  }

  if (insideQuotes) {
    throw new ParsingError('Unclosed quotes in CSV', lineNumber);
  }
}

// Экспорт для Node.js совместимости
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    csvToJson,
    autoDetectDelimiter,
    csvToJsonIterator
  };
}
