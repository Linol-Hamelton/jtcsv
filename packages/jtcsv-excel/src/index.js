/**
 * JTCSV Excel Integration
 * Конвертация между JSON, CSV и Excel форматами
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

const ExcelJS = require('exceljs');

class JtcsvExcel {
  /**
   * Конвертирует Excel файл в JSON
   * 
   * @param {string|Buffer} input - Путь к файлу или Buffer
   * @param {Object} options - Опции конвертации
   * @returns {Promise<Array>} JSON данные
   * 
   * @example
   * // Из файла
   * const json = await JtcsvExcel.fromExcel('data.xlsx');
   * 
   * @example
   * // Из Buffer
   * const fs = require('fs');
   * const buffer = fs.readFileSync('data.xlsx');
   * const json = await JtcsvExcel.fromExcel(buffer);
   */
  static async fromExcel(input, options = {}) {
    const {
      sheetNumber = 1,
      sheetName = null,
      hasHeaders = true,
      headerRow = 1,
      dataStartRow = 2,
      includeEmptyRows = false,
      columnMapping = null,
      valueTransformers = {}
    } = options;

    const workbook = new ExcelJS.Workbook();
    
    try {
      // Загружаем workbook
      if (Buffer.isBuffer(input)) {
        await workbook.xlsx.load(input);
      } else if (typeof input === 'string') {
        await workbook.xlsx.readFile(input);
      } else {
        throw new Error('Input must be a file path or Buffer');
      }

      // Получаем worksheet
      let worksheet;
      if (sheetName) {
        worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
          throw new Error(`Worksheet "${sheetName}" not found`);
        }
      } else {
        worksheet = workbook.worksheets[sheetNumber - 1];
        if (!worksheet) {
          throw new Error(`Worksheet number ${sheetNumber} not found`);
        }
      }

      // Определяем заголовки
      let headers = [];
      if (hasHeaders) {
        const headerRowData = worksheet.getRow(headerRow);
        headerRowData.eachCell((cell, colNumber) => {
          if (cell.value) {
            const header = String(cell.value).trim();
            headers[colNumber] = columnMapping ? (columnMapping[header] || header) : header;
          }
        });
        
        // Убираем пустые заголовки
        headers = headers.filter(h => h);
      } else {
        // Используем номера столбцов как заголовки
        const columnCount = worksheet.columnCount;
        for (let i = 1; i <= columnCount; i++) {
          headers.push(`column_${i}`);
        }
      }

      // Собираем данные
      const data = [];
      const rowCount = worksheet.rowCount;
      
      for (let rowNumber = dataStartRow; rowNumber <= rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData = {};
        let isEmptyRow = true;

        row.eachCell((cell, colNumber) => {
          if (colNumber <= headers.length) {
            const header = headers[colNumber - 1];
            let value = cell.value;
            
            // Применяем трансформации если есть
            if (valueTransformers[header]) {
              value = valueTransformers[header](value, rowNumber, colNumber);
            }
            
            // Конвертируем даты Excel в JavaScript Date
            if (cell.type === ExcelJS.ValueType.Date) {
              value = new Date(value);
            }
            
            // Конвертируем формулы в значения
            if (cell.type === ExcelJS.ValueType.Formula) {
              value = cell.result;
            }
            
            rowData[header] = value;
            
            if (value !== null && value !== undefined && value !== '') {
              isEmptyRow = false;
            }
          }
        });

        if (!isEmptyRow || includeEmptyRows) {
          data.push(rowData);
        }
      }

      return data;
    } catch (error) {
      throw new Error(`Excel to JSON conversion failed: ${error.message}`);
    }
  }

  /**
   * Конвертирует JSON в Excel файл
   * 
   * @param {Array} data - JSON данные
   * @param {string|Buffer} output - Путь для сохранения или Buffer
   * @param {Object} options - Опции конвертации
   * @returns {Promise<string|Buffer>} Путь к файлу или Buffer
   * 
   * @example
   * // Сохранение в файл
   * await JtcsvExcel.toExcel(data, 'output.xlsx');
   * 
   * @example
   * // Получение Buffer
   * const buffer = await JtcsvExcel.toExcel(data, null, { returnBuffer: true });
   */
  static async toExcel(data, output = 'output.xlsx', options = {}) {
    const {
      sheetName = 'Sheet1',
      includeHeaders = true,
      headers = null,
      columnStyles = {},
      headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      },
      autoWidth = true,
      freezeHeader = true,
      returnBuffer = false
    } = options;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Определяем заголовки
    let actualHeaders = headers;
    if (!actualHeaders) {
      actualHeaders = Object.keys(data[0]);
    }

    // Добавляем заголовки
    if (includeHeaders) {
      const headerRow = worksheet.addRow(actualHeaders);
      
      // Применяем стиль к заголовкам
      headerRow.eachCell((cell, colNumber) => {
        Object.assign(cell, headerStyle);
      });
    }

    // Добавляем данные
    data.forEach((item, rowIndex) => {
      const rowValues = actualHeaders.map(header => item[header]);
      const row = worksheet.addRow(rowValues);
      
      // Применяем стили к столбцам
      actualHeaders.forEach((header, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        const style = columnStyles[header];
        
        if (style) {
          Object.assign(cell, style);
        }
        
        // Автоматическое форматирование на основе типа данных
        const value = item[header];
        if (typeof value === 'number') {
          if (Number.isInteger(value)) {
            cell.numFmt = '0';
          } else {
            cell.numFmt = '0.00';
          }
        } else if (value instanceof Date) {
          cell.numFmt = 'yyyy-mm-dd';
        }
      });
    });

    // Автоматическая ширина столбцов
    if (autoWidth) {
      actualHeaders.forEach((_, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = Math.max(
          String(actualHeaders[index] || '').length * 1.2,
          ...data.map(row => String(row[actualHeaders[index]] || '').length * 1.1)
        );
      });
    }

    // Закрепление заголовков
    if (freezeHeader && includeHeaders) {
      worksheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
      ];
    }

    // Сохраняем или возвращаем Buffer
    if (returnBuffer || output === null) {
      return workbook.xlsx.writeBuffer();
    } else {
      await workbook.xlsx.writeFile(output);
      return output;
    }
  }

  /**
   * Конвертирует Excel в CSV
   * 
   * @param {string|Buffer} input - Путь к Excel файлу или Buffer
   * @param {Object} options - Опции конвертации
   * @returns {Promise<string>} CSV данные
   */
  static async excelToCsv(input, options = {}) {
    const json = await this.fromExcel(input, options);
    const { jsonToCsv } = require('../../../index.js');
    return jsonToCsv(json, options.csvOptions || {});
  }

  /**
   * Конвертирует CSV в Excel
   * 
   * @param {string} csv - CSV данные
   * @param {string|Buffer} output - Путь для сохранения или Buffer
   * @param {Object} options - Опции конвертации
   * @returns {Promise<string|Buffer>} Путь к файлу или Buffer
   */
  static async csvToExcel(csv, output = 'output.xlsx', options = {}) {
    const { csvToJson } = require('../../../index.js');
    const json = await csvToJson(csv, options.csvOptions || {});
    return this.toExcel(json, output, options.excelOptions || {});
  }

  /**
   * Читает несколько листов из Excel файла
   * 
   * @param {string|Buffer} input - Путь к файлу или Buffer
   * @param {Object} options - Опции
   * @returns {Promise<Object>} Данные всех листов
   */
  static async readMultipleSheets(input, options = {}) {
    const workbook = new ExcelJS.Workbook();
    
    if (Buffer.isBuffer(input)) {
      await workbook.xlsx.load(input);
    } else {
      await workbook.xlsx.readFile(input);
    }

    const result = {};
    
    workbook.eachSheet((worksheet, sheetId) => {
      const sheetData = [];
      const headers = [];
      
      // Читаем заголовки из первой строки
      const firstRow = worksheet.getRow(1);
      firstRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value ? String(cell.value).trim() : `column_${colNumber}`;
      });

      // Читаем данные
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Пропускаем заголовки
        
        const rowData = {};
        let isEmptyRow = true;
        
        row.eachCell((cell, colNumber) => {
          if (colNumber <= headers.length) {
            const header = headers[colNumber - 1];
            let value = cell.value;
            
            if (cell.type === ExcelJS.ValueType.Date) {
              value = new Date(value);
            }
            
            if (cell.type === ExcelJS.ValueType.Formula) {
              value = cell.result;
            }
            
            rowData[header] = value;
            
            if (value !== null && value !== undefined && value !== '') {
              isEmptyRow = false;
            }
          }
        });

        if (!isEmptyRow) {
          sheetData.push(rowData);
        }
      });

      result[worksheet.name] = {
        id: sheetId,
        name: worksheet.name,
        data: sheetData,
        rowCount: worksheet.rowCount,
        columnCount: worksheet.columnCount
      };
    });

    return result;
  }

  /**
   * Создает Excel файл с несколькими листами
   * 
   * @param {Object} sheetsData - Данные для листов { sheetName: dataArray }
   * @param {string|Buffer} output - Путь для сохранения или Buffer
   * @param {Object} options - Опции
   * @returns {Promise<string|Buffer>} Путь к файлу или Buffer
   */
  static async createMultiSheetExcel(sheetsData, output = 'output.xlsx', options = {}) {
    const workbook = new ExcelJS.Workbook();
    
    Object.entries(sheetsData).forEach(([sheetName, data]) => {
      if (!Array.isArray(data)) {
        throw new Error(`Data for sheet "${sheetName}" must be an array`);
      }
      
      const worksheet = workbook.addWorksheet(sheetName);
      
      if (data.length > 0) {
        // Заголовки
        const headers = Object.keys(data[0]);
        const headerRow = worksheet.addRow(headers);
        
        // Стиль заголовков
        headerRow.eachCell((cell) => {
          Object.assign(cell, {
            font: { bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
            alignment: { horizontal: 'center' }
          });
        });

        // Данные
        data.forEach(item => {
          const rowValues = headers.map(header => item[header]);
          worksheet.addRow(rowValues);
        });

        // Автоматическая ширина
        headers.forEach((_, index) => {
          const column = worksheet.getColumn(index + 1);
          column.width = Math.max(
            String(headers[index]).length * 1.2,
            ...data.map(row => String(row[headers[index]] || '').length * 1.1)
          );
        });
      }
    });

    if (options.returnBuffer || output === null) {
      return workbook.xlsx.writeBuffer();
    } else {
      await workbook.xlsx.writeFile(output);
      return output;
    }
  }

  /**
   * Экспортирует данные в Excel с форматированием
   * 
   * @param {Array} data - Данные для экспорта
   * @param {Object} formatting - Правила форматирования
   * @param {string|Buffer} output - Путь для сохранения или Buffer
   * @returns {Promise<string|Buffer>} Путь к файлу или Buffer
   */
  static async exportWithFormatting(data, formatting = {}, output = 'output.xlsx') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]);
    
    // Заголовки
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      Object.assign(cell, formatting.headerStyle || {
        font: { bold: true, size: 12 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
      });
    });

    // Данные
    data.forEach((item, rowIndex) => {
      const rowValues = headers.map(header => item[header]);
      const row = worksheet.addRow(rowValues);
      
      // Применяем условное форматирование
      headers.forEach((header, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        const value = item[header];
        
        // Правила форматирования
        if (formatting.rules && formatting.rules[header]) {
          const rules = formatting.rules[header];
          
          for (const rule of rules) {
            if (rule.condition(value, item, rowIndex)) {
              Object.assign(cell, rule.style);
              break;
            }
          }
        }
        
        // Автоматическое форматирование
        if (typeof value === 'number') {
          if (formatting.numberFormat) {
            cell.numFmt = formatting.numberFormat;
          } else if (Number.isInteger(value)) {
            cell.numFmt = '#,##0';
          } else {
            cell.numFmt = '#,##0.00';
          }
        } else if (value instanceof Date) {
          cell.numFmt = formatting.dateFormat || 'yyyy-mm-dd';
        }
      });
    });

    // Автоматическая ширина
    headers.forEach((_, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = Math.max(
        String(headers[index]).length * 1.3,
        ...data.map(row => String(row[headers[index]] || '').length * 1.2)
      );
    });

    // Добавляем фильтры если нужно
    if (formatting.addFilters) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: data.length + 1, column: headers.length }
      };
    }

    // Закрепляем заголовки
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    if (output === null) {
      return workbook.xlsx.writeBuffer();
    } else {
      await workbook.xlsx.writeFile(output);
      return output;
    }
  }

  /**
   * Создает плагин для JTCSV
   * 
   * @returns {Object} Плагин для JTCSV
   */
  static createJtcsvPlugin() {
    return {
      name: 'jtcsv-excel',
      version: '1.0.0',
      description: 'Excel integration for JTCSV',
      hooks: {
        'before:parse': async (input, context) => {
          if (context.options.format === 'excel') {
            return await this.fromExcel(input, context.options.excelOptions || {});
          }
          return input;
        },
        
        'after:serialize': async (output, context) => {
          if (context.options.format === 'excel') {
            const buffer = await this.toExcel(output, null, {
              ...context.options.excelOptions,
              returnBuffer: true
            });
            return buffer.toString('base64');
          }
          return output;
        }
      }
    };
  }

  /**
      * Получает метаданные Excel файла
   * 
   * @param {string|Buffer} input - Путь к файлу или Buffer
   * @returns {Promise<Object>} Метаданные файла
   */
  static async getExcelMetadata(input) {
    const workbook = new ExcelJS.Workbook();
    
    try {
      if (Buffer.isBuffer(input)) {
        await workbook.xlsx.load(input);
      } else {
        await workbook.xlsx.readFile(input);
      }

      const metadata = {
        creator: workbook.creator,
        lastModifiedBy: workbook.lastModifiedBy,
        created: workbook.created,
        modified: workbook.modified,
        lastPrinted: workbook.lastPrinted,
        company: workbook.company,
        manager: workbook.manager,
        title: workbook.title,
        subject: workbook.subject,
        keywords: workbook.keywords,
        category: workbook.category,
        description: workbook.description,
        language: workbook.language,
        revision: workbook.revision,
        contentStatus: workbook.contentStatus,
        worksheets: []
      };

      workbook.eachSheet((worksheet, sheetId) => {
        metadata.worksheets.push({
          id: sheetId,
          name: worksheet.name,
          state: worksheet.state,
          rowCount: worksheet.rowCount,
          columnCount: worksheet.columnCount,
          dimensions: worksheet.dimensions,
          hasHeaderRow: worksheet.hasHeaderRow,
          properties: worksheet.properties
        });
      });

      return metadata;
    } catch (error) {
      throw new Error(`Failed to read Excel metadata: ${error.message}`);
    }
  }

  /**
   * Создает шаблон Excel файла
   * 
   * @param {Array} headers - Заголовки столбцов
   * @param {Object} options - Опции шаблона
   * @returns {Promise<Buffer>} Buffer с шаблоном
   */
  static async createTemplate(headers, options = {}) {
    const {
      sheetName = 'Template',
      instructions = null,
      exampleData = null,
      validationRules = null
    } = options;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Инструкции если есть
    if (instructions) {
      const instructionRow = worksheet.addRow(['Инструкции:']);
      instructionRow.font = { bold: true, size: 12 };
      worksheet.addRow([instructions]);
      worksheet.addRow([]); // Пустая строка
    }

    // Заголовки
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B5' } };
      cell.alignment = { horizontal: 'center', vertical: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Пример данных если есть
    if (exampleData && Array.isArray(exampleData)) {
      worksheet.addRow(['Пример данных:']);
      exampleData.forEach((example, index) => {
        const exampleRow = worksheet.addRow(headers.map(h => example[h] || ''));
        if (index === 0) {
          exampleRow.font = { italic: true, color: { argb: 'FF808080' } };
        }
      });
      worksheet.addRow([]);
    }

    // Правила валидации если есть
    if (validationRules) {
      const validationRow = worksheet.addRow(['Правила валидации:']);
      validationRow.font = { bold: true };
      
      Object.entries(validationRules).forEach(([header, rules]) => {
        const ruleText = `${header}: ${rules.join(', ')}`;
        worksheet.addRow([ruleText]);
      });
    }

    // Автоматическая ширина столбцов
    headers.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = Math.max(header.length * 1.3, 15);
    });

    return workbook.xlsx.writeBuffer();
  }
}

// Экспортируем класс
module.exports = JtcsvExcel;

// Экспортируем утилиты
module.exports.fromExcel = JtcsvExcel.fromExcel;
module.exports.toExcel = JtcsvExcel.toExcel;
module.exports.excelToCsv = JtcsvExcel.excelToCsv;
module.exports.csvToExcel = JtcsvExcel.csvToExcel;
module.exports.readMultipleSheets = JtcsvExcel.readMultipleSheets;
module.exports.createMultiSheetExcel = JtcsvExcel.createMultiSheetExcel;
module.exports.exportWithFormatting = JtcsvExcel.exportWithFormatting;
module.exports.getExcelMetadata = JtcsvExcel.getExcelMetadata;
module.exports.createTemplate = JtcsvExcel.createTemplate;

// Экспортируем плагин
module.exports.jtcsvPlugin = JtcsvExcel.createJtcsvPlugin;

// Экспортируем ExcelJS для расширенного использования
module.exports.ExcelJS = ExcelJS;