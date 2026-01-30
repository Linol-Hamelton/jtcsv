/**
 * JTCSV Excel Integration
 * Конвертация между JSON, CSV и Excel форматами
 * 
 * @version 1.0.0
 * @date 2026-01-23
 */

// Используем require для совместимости с существующим кодом
const ExcelJS = require('exceljs');

export interface ExcelToJsonOptions {
  sheetNumber?: number;
  sheetName?: string | null;
  hasHeaders?: boolean;
  headerRow?: number;
  dataStartRow?: number;
  includeEmptyRows?: boolean;
  columnMapping?: Record<string, string>;
  valueTransformers?: Record<string, (value: any, rowNumber: number, colNumber: number) => any>;
  csvOptions?: any;
}

export interface JsonToExcelOptions {
  sheetName?: string;
  includeHeaders?: boolean;
  headers?: string[] | null;
  columnStyles?: Record<string, any>;
  headerStyle?: any;
  autoWidth?: boolean;
  freezeHeader?: boolean;
  returnBuffer?: boolean;
  excelOptions?: any;
}

export interface MultiSheetResult {
  [sheetName: string]: {
    id: number;
    name: string;
    data: any[];
    rowCount: number;
    columnCount: number;
  };
}

export interface FormattingRules {
  [columnName: string]: {
    style?: any;
    format?: string;
    width?: number;
    alignment?: any;
  };
}

export class JtcsvExcel {
  /**
   * Конвертирует Excel файл в JSON
   * 
   * @param input - Путь к файлу или Buffer
   * @param options - Опции конвертации
   * @returns JSON данные
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
  static async fromExcel(input: string | Buffer, options: ExcelToJsonOptions = {}): Promise<any[]> {
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
      let worksheet: any;
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
      let headers: string[] = [];
      if (hasHeaders) {
        const headerRowData = worksheet.getRow(headerRow);
        const tempHeaders: string[] = [];
        
        headerRowData.eachCell((cell: any, colNumber: number) => {
          if (cell.value) {
            const header = String(cell.value).trim();
            tempHeaders[colNumber] = columnMapping ? (columnMapping[header] || header) : header;
          }
        });
        
        // Убираем пустые заголовки
        headers = tempHeaders.filter(h => h);
      } else {
        // Используем номера столбцов как заголовки
        const columnCount = worksheet.columnCount;
        for (let i = 1; i <= columnCount; i++) {
          headers.push(`column_${i}`);
        }
      }

      // Собираем данные
      const data: any[] = [];
      const rowCount = worksheet.rowCount;
      
      for (let rowNumber = dataStartRow; rowNumber <= rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData: Record<string, any> = {};
        let isEmptyRow = true;

        row.eachCell((cell: any, colNumber: number) => {
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
    } catch (error: any) {
      throw new Error(`Excel to JSON conversion failed: ${error.message}`);
    }
  }

  /**
   * Конвертирует JSON в Excel файл
   * 
   * @param data - JSON данные
   * @param output - Путь для сохранения или Buffer
   * @param options - Опции конвертации
   * @returns Путь к файлу или Buffer
   * 
   * @example
   * // Сохранение в файл
   * await JtcsvExcel.toExcel(data, 'output.xlsx');
   * 
   * @example
   * // Получение Buffer
   * const buffer = await JtcsvExcel.toExcel(data, null, { returnBuffer: true });
   */
  static async toExcel(
    data: any[], 
    output: string | null = 'output.xlsx', 
    options: JsonToExcelOptions = {}
  ): Promise<string | Buffer> {
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
      headerRow.eachCell((cell: any) => {
        Object.assign(cell, headerStyle);
      });
    }

    // Добавляем данные
    data.forEach((item, rowIndex) => {
      const rowValues = actualHeaders!.map(header => item[header]);
      const row = worksheet.addRow(rowValues);
      
      // Применяем стили к столбцам
      actualHeaders!.forEach((header, colIndex) => {
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
      actualHeaders!.forEach((_, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = Math.max(
          String(actualHeaders![index] || '').length * 1.2,
          ...data.map(row => String(row[actualHeaders![index]] || '').length * 1.1)
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
   * @param input - Путь к Excel файлу или Buffer
   * @param options - Опции конвертации
   * @returns CSV данные
   */
  static async excelToCsv(input: string | Buffer, options: ExcelToJsonOptions = {}): Promise<string> {
    const json = await this.fromExcel(input, options);
    const { jsonToCsv } = require('../../../index.js');
    return jsonToCsv(json, options.csvOptions || {});
  }

  /**
   * Конвертирует CSV в Excel
   * 
   * @param csv - CSV данные
   * @param output - Путь для сохранения или Buffer
   * @param options - Опции конвертации
   * @returns Путь к файлу или Buffer
   */
  static async csvToExcel(
    csv: string, 
    output: string | null = 'output.xlsx', 
    options: { csvOptions?: any; excelOptions?: JsonToExcelOptions } = {}
  ): Promise<string | Buffer> {
    const { csvToJson } = require('../../../index.js');
    const json = await csvToJson(csv, options.csvOptions || {});
    return this.toExcel(json, output, options.excelOptions || {});
  }

  /**
   * Читает несколько листов из Excel файла
   * 
   * @param input - Путь к файлу или Buffer
   * @param options - Опции
   * @returns Данные всех листов
   */
  static async readMultipleSheets(input: string | Buffer, options: ExcelToJsonOptions = {}): Promise<MultiSheetResult> {
    const workbook = new ExcelJS.Workbook();
    
    if (Buffer.isBuffer(input)) {
      await workbook.xlsx.load(input);
    } else {
      await workbook.xlsx.readFile(input);
    }

    const result: MultiSheetResult = {};
    
    workbook.eachSheet((worksheet: any, sheetId: number) => {
      const sheetData: any[] = [];
      const headers: string[] = [];
      
      // Читаем заголовки из первой строки
      const firstRow = worksheet.getRow(1);
      firstRow.eachCell((cell: any, colNumber: number) => {
        headers[colNumber] = cell.value ? String(cell.value).trim() : `column_${colNumber}`;
      });

      // Читаем данные
      worksheet.eachRow((row: any, rowNumber: number) => {
        if (rowNumber === 1) {
          return; // Пропускаем заголовки
        }
        
        const rowData: Record<string, any> = {};
        let isEmptyRow = true;
        
        row.eachCell((cell: any, colNumber: number) => {
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
   * @param sheetsData - Данные для листов { sheetName: dataArray }
   * @param output - Путь для сохранения или Buffer
   * @param options - Опции
   * @returns Путь к файлу или Buffer
   */
  static async createMultiSheetExcel(
    sheetsData: Record<string, any[]>, 
    output: string | null = 'output.xlsx', 
    options: { returnBuffer?: boolean } = {}
  ): Promise<string | Buffer> {
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
        headerRow.eachCell((cell: any) => {
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
   * Async version of fromExcel that uses worker threads for large files
   * 
   * @param input - Path to file or Buffer
   * @param options - Conversion options
   * @returns JSON data
   */
  static async fromExcelAsync(input: string | Buffer, options: ExcelToJsonOptions = {}): Promise<any[]> {
    // For large files, use worker pool
    if (Buffer.isBuffer(input) && input.length > 10 * 1024 * 1024) { // > 10MB
      const { createWorkerPool } = require('../../../src/workers/worker-pool');
      const pool = createWorkerPool({
        workerCount: Math.min(4, require('os').cpus().length),
        workerScript: require.resolve('../../../src/workers/excel-worker.js')
      });
      
      try {
        const result = await pool.execute({ 
          input: input.toString('base64'), 
          options,
          operation: 'excelToJson'
        });
        return result.data;
      } finally {
        await pool.terminate();
      }
    }
    
    // For small files, use regular method
    return this.fromExcel(input, options);
  }

  /**
   * Async version of toExcel that uses worker threads for large datasets
   * 
   * @param data - JSON data
   * @param output - Output path or Buffer
   * @param options - Conversion options
   * @returns Path or Buffer
   */
  static async toExcelAsync(
    data: any[], 
    output: string | null = 'output.xlsx', 
    options: JsonToExcelOptions = {}
  ): Promise<string | Buffer> {
    // For large datasets, use worker pool
    if (data.length > 10000) {
      const { createWorkerPool } = require('../../../src/workers/worker-pool');
      const pool = createWorkerPool({
        workerCount: Math.min(4, require('os').cpus().length),
        workerScript: require.resolve('../../../src/workers/excel-worker.js')
      });
      
      try {
        const result = await pool.execute({ 
          data, 
          output,
          options,
          operation: 'jsonToExcel'
        });
        
        if (options.returnBuffer || output === null) {
          return Buffer.from(result.buffer, 'base64');
        } else {
          return result.outputPath;
        }
      } finally {
        await pool.terminate();
      }
    }
    
    // For small datasets, use regular method
    return this.toExcel(data, output, options);
  }
}

export default JtcsvExcel;
