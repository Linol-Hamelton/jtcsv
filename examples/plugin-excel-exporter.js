/**
 * Пример плагина: Excel Exporter для JTCSV
 * Демонстрирует возможности плагинной системы
 * 
 * @version 1.0.0
 * @date 2026-01-22
 */

const ExcelJS = require('exceljs');

/**
 * Плагин для экспорта в Excel формат
 */
const excelExporterPlugin = {
  name: 'Excel Exporter',
  version: '1.0.0',
  description: 'Экспорт данных в Excel формат с форматированием',
  
  hooks: {
    /**
     * После конвертации JSON в CSV, предлагаем экспорт в Excel
     */
    'after:jsonToCsv': async (csv, context) => {
      if (context.options?.exportToExcel) {
        console.log('📊 Экспорт в Excel...');
        
        // Парсим CSV обратно в JSON для Excel
        const json = await context.instance.csvToJson(csv, {
          ...context.options,
          useFastPath: false
        });
        
        // Экспортируем в Excel
        const excelPath = await exportToExcel(json, context.options);
        
        console.log(`✅ Excel файл создан: ${excelPath}`);
        
        // Возвращаем путь к Excel файлу вместо CSV
        return {
          csv,
          excel: excelPath,
          format: 'excel'
        };
      }
      
      return csv;
    },
    
    /**
     * После чтения CSV файла, предлагаем конвертацию в Excel
     */
    'after:readCsvAsJson': async (json, context) => {
      if (context.options?.convertToExcel) {
        const excelPath = await exportToExcel(json, context.options);
        console.log(`✅ CSV конвертирован в Excel: ${excelPath}`);
        
        return {
          json,
          excel: excelPath
        };
      }
      
      return json;
    }
  },
  
  middlewares: [
    /**
     * Middleware для добавления информации о Excel экспорте
     */
    async (ctx, next) => {
      if (ctx.operation === 'jsonToCsv' && ctx.options?.exportToExcel) {
        console.log('🔄 Excel экспорт активирован');
        ctx.metadata.excelExport = {
          requested: true,
          timestamp: new Date().toISOString()
        };
      }
      
      await next();
      
      if (ctx.metadata?.excelExport) {
        ctx.metadata.excelExport.completed = true;
        ctx.metadata.excelExport.duration = Date.now() - ctx.startTime;
      }
    }
  ]
};

/**
 * Экспортирует данные в Excel файл
 */
async function exportToExcel(data, options = {}) {
  const {
    outputPath = `export-${Date.now()}.xlsx`,
    sheetName = 'Data',
    includeHeaders = true,
    autoWidth = true,
    styling = true
  } = options;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Данные должны быть непустым массивом');
  }

  // Получаем заголовки
  const headers = Object.keys(data[0]);
  
  // Добавляем заголовки
  if (includeHeaders) {
    const headerRow = worksheet.addRow(headers);
    
    // Форматирование заголовков
    if (styling) {
      headerRow.font = { 
        bold: true, 
        color: { argb: 'FFFFFFFF' },
        size: 12
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' } // Синий
      };
      headerRow.alignment = { 
        horizontal: 'center', 
        vertical: 'middle' 
      };
      headerRow.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }

  // Добавляем данные
  data.forEach((item, rowIndex) => {
    const values = headers.map(header => item[header]);
    const row = worksheet.addRow(values);
    
    // Чередующаяся раскраска строк
    if (styling && rowIndex % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' } // Светло-серый
      };
    }
    
    // Форматирование числовых значений
    headers.forEach((header, colIndex) => {
      const value = item[header];
      const cell = row.getCell(colIndex + 1);
      
      if (typeof value === 'number') {
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right' };
      } else if (value instanceof Date) {
        cell.numFmt = 'dd.mm.yyyy';
        cell.alignment = { horizontal: 'center' };
      } else if (typeof value === 'boolean') {
        cell.value = value ? 'Да' : 'Нет';
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

  // Автоматическая ширина колонок
  if (autoWidth) {
    headers.forEach((_, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = Math.max(
        15, // Минимальная ширина
        Math.min(
          50, // Максимальная ширина
          headers[index]?.length || 10
        )
      );
    });
  }

  // Добавляем фильтры
  if (includeHeaders) {
    worksheet.autoFilter = {
      from: 'A1',
      to: `${String.fromCharCode(65 + headers.length - 1)}1`
    };
  }

  // Сохраняем файл
  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

/**
 * Плагин для импорта из Excel
 */
const excelImporterPlugin = {
  name: 'Excel Importer',
  version: '1.0.0',
  description: 'Импорт данных из Excel файлов',
  
  hooks: {
    /**
     * Перехватывает чтение CSV файлов и поддерживает Excel
     */
    'before:readCsvAsJson': async (filePath, context) => {
      if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
        console.log(`📥 Обнаружен Excel файл: ${filePath}`);
        
        const data = await importFromExcel(filePath, context.options);
        
        // Пропускаем стандартную обработку CSV
        context.skipStandardProcessing = true;
        
        return data;
      }
      
      return filePath;
    }
  }
};

/**
 * Импортирует данные из Excel файла
 */
async function importFromExcel(filePath, options = {}) {
  const {
    sheetIndex = 1,
    hasHeaders = true,
    skipRows = 0
  } = options;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.worksheets[sheetIndex - 1] || workbook.getWorksheet(1);
  
  if (!worksheet) {
    throw new Error('Лист не найден в Excel файле');
  }

  const data = [];
  let headers = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= skipRows) {
      return;
    }
    
    if (hasHeaders && rowNumber === skipRows + 1) {
      // Первая строка - заголовки
      headers = row.values.slice(1); // Пропускаем первый пустой элемент
    } else {
      const rowData = {};
      const values = row.values.slice(1); // Пропускаем первый пустой элемент
      
      values.forEach((value, index) => {
        const header = headers[index] || `column_${index + 1}`;
        
        // Конвертируем Excel типы в JavaScript типы
        if (value instanceof Date) {
          rowData[header] = value.toISOString();
        } else if (value && typeof value === 'object' && value.formula) {
          // Формулы - сохраняем как строку
          rowData[header] = value.formula;
        } else if (value === null || value === undefined) {
          rowData[header] = '';
        } else {
          rowData[header] = value;
        }
      });
      
      data.push(rowData);
    }
  });

  console.log(`✅ Импортировано ${data.length} строк из Excel`);
  return data;
}

/**
 * Пример использования плагинов
 */
async function exampleUsage() {
  console.log('🚀 Пример использования плагинов JTCSV\n');
  
  // Создаем экземпляр JTCSV с плагинами
  const JtcsvWithPlugins = require('../src/index-with-plugins');
  const jtcsv = JtcsvWithPlugins.create({
    enablePlugins: true,
    enableFastPath: true
  });
  
  // Регистрируем плагины
  jtcsv.use('excel-exporter', excelExporterPlugin);
  jtcsv.use('excel-importer', excelImporterPlugin);
  
  console.log('📋 Зарегистрированные плагины:');
  jtcsv.listPlugins().forEach(plugin => {
    console.log(`  • ${plugin.name} v${plugin.version} - ${plugin.description}`);
  });
  
  console.log('\n📊 Пример 1: Конвертация JSON в CSV с экспортом в Excel');
  
  const sampleData = [
    { id: 1, name: 'John Doe', age: 30, salary: 50000, hired: new Date('2023-01-15') },
    { id: 2, name: 'Jane Smith', age: 25, salary: 45000, hired: new Date('2023-03-20') },
    { id: 3, name: 'Bob Johnson', age: 35, salary: 60000, hired: new Date('2022-11-10') }
  ];
  
  try {
    // Конвертируем в CSV с опцией экспорта в Excel
    const result = await jtcsv.jsonToCsv(sampleData, {
      delimiter: ',',
      exportToExcel: true,
      outputPath: 'example-export.xlsx',
      styling: true
    });
    
    console.log('✅ Результат:', result);
    
    // Показываем статистику
    const stats = jtcsv.getStats();
    console.log('\n📈 Статистика:');
    console.log('  Плагины:', stats.plugins.plugins);
    console.log('  Hooks выполнено:', stats.plugins.hookExecutions);
    console.log('  Middleware выполнено:', stats.plugins.middlewareExecutions);
    console.log('  Fast Path парсеры:', stats.fastPath.simpleParserCount);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
  
  console.log('\n📥 Пример 2: Импорт из Excel файла');
  
  try {
    // Создаем тестовый Excel файл
    const testWorkbook = new ExcelJS.Workbook();
    const testSheet = testWorkbook.addWorksheet('Test Data');
    
    testSheet.addRow(['ID', 'Name', 'Department', 'Score']);
    testSheet.addRow([1, 'Alice', 'Engineering', 95]);
    testSheet.addRow([2, 'Bob', 'Marketing', 88]);
    testSheet.addRow([3, 'Charlie', 'Sales', 92]);
    
    await testWorkbook.xlsx.writeFile('test-import.xlsx');
    
    // Импортируем из Excel
    const importedData = await jtcsv.readCsvAsJson('test-import.xlsx', {
      convertToExcel: false // Просто импортируем
    });
    
    console.log('✅ Импортированные данные:');
    console.log(JSON.stringify(importedData, null, 2));
    
    // Конвертируем импортированные данные в CSV
    const csvFromExcel = await jtcsv.jsonToCsv(importedData, {
      delimiter: ';'
    });
    
    console.log('\n📄 CSV из импортированных данных:');
    console.log(csvFromExcel);
    
  } catch (error) {
    console.error('❌ Ошибка импорта:', error.message);
  }
  
  console.log('\n🎯 Пример 3: Использование NDJSON');
  
  try {
    // Конвертируем в NDJSON
    const ndjson = jtcsv.toNdjson(sampleData, { space: 2 });
    console.log('📝 NDJSON:');
    console.log(ndjson);
    
    // Парсим NDJSON обратно
    const parsed = await jtcsv.parseNdjson(ndjson);
    console.log('\n🔁 Парсированный NDJSON:');
    console.log(JSON.stringify(parsed, null, 2));
    
  } catch (error) {
    console.error('❌ Ошибка NDJSON:', error.message);
  }
  
  console.log('\n🏁 Пример завершен!');
}

// Экспортируем плагины и функции
module.exports = {
  excelExporterPlugin,
  excelImporterPlugin,
  exportToExcel,
  importFromExcel,
  exampleUsage
};

// Если файл запущен напрямую
if (require.main === module) {
  exampleUsage().catch(console.error);
}
