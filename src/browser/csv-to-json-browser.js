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
 * Валидация CSV ввода и опций
 * @private
 */
function validateCsvInput(csv, options) {
  // Validate CSV input
  if (typeof csv !== 'string') {
    throw new ValidationError('Input must be a CSV string');
  }
  
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
  
  return true;
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
  if (parseNumbers && /^-?\d+(\.\d+)?$/.test(result)) {
    const num = parseFloat(result);
    if (!isNaN(num)) {
      return num;
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
  
  const counts = {};
  candidates.forEach(delim => {
    const escapedDelim = delim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedDelim, 'g');
    const matches = firstLine.match(regex);
    counts[delim] = matches ? matches.length : 0;
  });

  // Поиск разделителя с максимальным количеством
  let maxCount = -1;
  let detectedDelimiter = ';'; // значение по умолчанию
  
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedDelimiter = delim;
    }
  }

  // Если разделитель не найден или ничья
  if (maxCount === 0) {
    return ';'; // значение по умолчанию
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
      maxRows
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
        if (fields.length > headers.length && process.env.NODE_ENV === 'development') {
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

// Экспорт для Node.js совместимости
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    csvToJson,
    autoDetectDelimiter
  };
}
