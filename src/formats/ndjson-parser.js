/**
 * NDJSON (Newline Delimited JSON) парсер
 * Поддержка потоковой обработки больших JSON файлов
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

function createTextDecoder() {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8');
  }
  try {
    const { TextDecoder: UtilTextDecoder } = require('util');
    return new UtilTextDecoder('utf-8');
  } catch (error) {
    return null;
  }
}

function getTransformStream() {
  if (typeof TransformStream !== 'undefined') {
    return TransformStream;
  }
  try {
    return require('stream/web').TransformStream;
  } catch (error) {
    return null;
  }
}

class NdjsonParser {
  /**
   * Парсит NDJSON поток и возвращает async iterator
   * @param {ReadableStream|string} input - Входные данные (поток или строка)
   * @param {Object} options - Опции парсинга
   * @returns {AsyncGenerator} Async iterator с объектами JSON
   * 
   * @example
   * // Использование с потоком
   * const stream = fs.createReadStream('data.ndjson');
   * for await (const obj of NdjsonParser.parseStream(stream)) {
   *   console.log(obj);
   * }
   * 
   * @example
   * // Использование со строкой
   * const ndjson = '{"name":"John"}\n{"name":"Jane"}';
   * for await (const obj of NdjsonParser.parseStream(ndjson)) {
   *   console.log(obj);
   * }
   */
  static async *parseStream(input, options = {}) {
    const {
      bufferSize: _bufferSize = 64 * 1024, // 64KB буфер
      maxLineLength = 10 * 1024 * 1024, // 10MB максимальная длина строки
      onError = null
    } = options;

    let buffer = '';
    let lineNumber = 0;

    // Если входные данные - строка, преобразуем в async iterator
    if (typeof input === 'string') {
      const lines = input.split('\n');
      for (const line of lines) {
        lineNumber++;
        if (line.trim()) {
          try {
            yield JSON.parse(line);
          } catch (error) {
            if (onError) {
              onError(error, line, lineNumber);
            } else {
              console.error(`Ошибка парсинга NDJSON строки ${lineNumber}:`, error.message);
            }
          }
        }
      }
      return;
    }

    // Если входные данные - поток
    const reader = input.getReader ? input.getReader() : input;
    const decoder = createTextDecoder();
    if (!decoder) {
      throw new Error('TextDecoder is not available in this environment');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Обрабатываем оставшиеся данные в буфере
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              lineNumber++;
              if (line.trim()) {
                try {
                  yield JSON.parse(line);
                } catch (error) {
                  if (onError) {
                    onError(error, line, lineNumber);
                  }
                }
              }
            }
          }
          break;
        }

        // Добавляем новые данные в буфере
        buffer += decoder.decode(value, { stream: true });
        
        // Проверяем длину буфера
        if (buffer.length > maxLineLength) {
          throw new Error(`Строка превышает максимальную длину ${maxLineLength} байт`);
        }

        // Обрабатываем полные строки
        const lines = buffer.split('\n');
        
        // Оставляем последнюю (возможно неполную) строку в буфере
        buffer = lines.pop() || '';
        
        // Обрабатываем полные строки
        for (const line of lines) {
          lineNumber++;
          if (line.trim()) {
            try {
              yield JSON.parse(line);
            } catch (error) {
              if (onError) {
                onError(error, line, lineNumber);
              } else {
                console.error(`Ошибка парсинга NDJSON строки ${lineNumber}:`, error.message);
              }
            }
          }
        }
      }
    } finally {
      // Освобождаем ресурсы
      if (reader.releaseLock) {
        reader.releaseLock();
      }
    }
  }

  /**
   * Конвертирует массив объектов в NDJSON строку
   * @param {Array} data - Массив объектов
   * @param {Object} options - Опции форматирования
   * @returns {string} NDJSON строка
   * 
   * @example
   * const data = [{ name: 'John' }, { name: 'Jane' }];
   * const ndjson = NdjsonParser.toNdjson(data);
   * // Результат: '{"name":"John"}\n{"name":"Jane"}'
   */
  static toNdjson(data, options = {}) {
    if (!Array.isArray(data)) {
      throw new Error('Input must be an array');
    }

    const {
      replacer = null,
      space = 0
    } = options;

    return data
      .map(item => JSON.stringify(item, replacer, space))
      .join('\n');
  }

  /**
   * Конвертирует NDJSON строку в массив объектов
   * @param {string} ndjsonString - NDJSON строка
   * @param {Object} options - Опции парсинга
   * @returns {Array} Массив объектов
   * 
   * @example
   * const ndjson = '{"name":"John"}\n{"name":"Jane"}';
   * const data = NdjsonParser.fromNdjson(ndjson);
   * // Результат: [{ name: 'John' }, { name: 'Jane' }]
   */
  static fromNdjson(ndjsonString, options = {}) {
    const {
      filter = null,
      transform = null,
      onError = null
    } = options;

    return ndjsonString
      .split('\n')
      .map((line, index) => {
        if (!line.trim()) {
          return null;
        }
        
        try {
          const obj = JSON.parse(line);
          
          // Применяем фильтр если задан
          if (filter && !filter(obj, index)) {
            return null;
          }
          
          // Применяем трансформацию если задана
          return transform ? transform(obj, index) : obj;
        } catch (error) {
          if (onError) {
            onError(error, line, index + 1);
          }
          return null;
        }
      })
      .filter(obj => obj !== null);
  }

  /**
   * Создает преобразователь NDJSON в CSV
   * @param {Object} options - Опции конвертации
   * @returns {TransformStream} Transform stream
   */
  static createNdjsonToCsvStream(options = {}) {
    const {
      delimiter = ',',
      includeHeaders = true,
      ..._csvOptions
    } = options;

    let headers = null;
    let firstChunk = true;

    const TransformStreamCtor = getTransformStream();
    if (!TransformStreamCtor) {
      throw new Error('TransformStream is not available in this environment');
    }

    return new TransformStreamCtor({
      async transform(chunk, controller) {
        try {
          const obj = JSON.parse(chunk);
          
          // Определяем заголовки при первом объекте
          if (firstChunk && includeHeaders) {
            headers = Object.keys(obj);
            controller.enqueue(headers.join(delimiter) + '\n');
            firstChunk = false;
          }
          
          // Конвертируем объект в CSV строку
          const row = headers 
            ? headers.map(header => this._escapeCsvField(obj[header], delimiter))
            : Object.values(obj).map(value => this._escapeCsvField(value, delimiter));
          
          controller.enqueue(row.join(delimiter) + '\n');
        } catch (error) {
          console.error('Ошибка преобразования NDJSON в CSV:', error);
        }
      },
      
      _escapeCsvField(value, delimiter) {
        if (value === null || value === undefined) {
          return '';
        }
        
        const str = String(value);
        
        // Экранируем если содержит delimiter, кавычки или перенос строки
        if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        
        return str;
      }
    });
  }

  /**
   * Создает преобразователь CSV в NDJSON
   * @param {Object} options - Опции конвертации
   * @returns {TransformStream} Transform stream
   */
  static createCsvToNdjsonStream(options = {}) {
    const {
      delimiter = ',',
      hasHeaders = true,
      ..._csvOptions
    } = options;

    let headers = null;
    let firstLine = true;

    const TransformStreamCtor = getTransformStream();
    if (!TransformStreamCtor) {
      throw new Error('TransformStream is not available in this environment');
    }

    return new TransformStreamCtor({
      transform(chunk, controller) {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }
          
          const fields = this._parseCsvLine(line, delimiter);
          
          if (firstLine && hasHeaders) {
            headers = fields;
            firstLine = false;
          } else {
            const obj = headers 
              ? headers.reduce((acc, header, index) => {
                acc[header] = fields[index] || '';
                return acc;
              }, {})
              : fields.reduce((acc, field, index) => {
                acc[`field_${index}`] = field;
                return acc;
              }, {});
            
            controller.enqueue(JSON.stringify(obj) + '\n');
          }
        }
      },
      
      _parseCsvLine(line, delimiter) {
        const fields = [];
        let currentField = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"') {
            if (insideQuotes && nextChar === '"') {
              currentField += '"';
              i++;
            } else {
              insideQuotes = !insideQuotes;
            }
          } else if (char === delimiter && !insideQuotes) {
            fields.push(currentField);
            currentField = '';
          } else {
            currentField += char;
          }
        }
        
        fields.push(currentField);
        return fields;
      }
    });
  }

  /**
   * Статистика по NDJSON файлу
   * @param {string|ReadableStream} input - Входные данные
   * @returns {Promise<Object>} Статистика
   */
  static async getStats(input) {
    const stats = {
      totalLines: 0,
      validLines: 0,
      errorLines: 0,
      totalBytes: 0,
      errors: []
    };

    if (typeof input === 'string') {
      stats.totalBytes = Buffer.byteLength(input, 'utf8');
      const lines = input.split('\n');
      stats.totalLines = lines.length;
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            JSON.parse(line);
            stats.validLines++;
          } catch (error) {
            stats.errorLines++;
            stats.errors.push({
              line: stats.totalLines,
              error: error.message,
              content: line.substring(0, 100)
            });
          }
        }
      }
    } else {
      // Для потоков
      const reader = input.getReader();
      const decoder = createTextDecoder();
      if (!decoder) {
        throw new Error('TextDecoder is not available in this environment');
      }
      let buffer = '';
      
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Обрабатываем оставшийся буфер
            if (buffer.trim()) {
              stats.totalLines++;
              try {
                JSON.parse(buffer.trim());
                stats.validLines++;
              } catch (error) {
                stats.errorLines++;
              }
            }
            break;
          }
          
          stats.totalBytes += value.length;
          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            stats.totalLines++;
            if (line.trim()) {
              try {
                JSON.parse(line);
                stats.validLines++;
              } catch (error) {
                stats.errorLines++;
                stats.errors.push({
                  line: stats.totalLines,
                  error: error.message,
                  content: line.substring(0, 100)
                });
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    stats.successRate = stats.totalLines > 0 ? (stats.validLines / stats.totalLines) * 100 : 0;
    return stats;
  }
}

module.exports = NdjsonParser;
