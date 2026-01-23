/**
 * Пример использования JTCSV Excel
 * 
 * Запуск: node basic-usage.js
 * Требуется: npm install exceljs
 */

const { JtcsvExcel } = require('../src/index');
const fs = require('fs').promises;
const path = require('path');

console.log('🚀 JTCSV Excel - Примеры использования\n');

async function runExamples() {
  try {
    // Создаем тестовые данные
    const testData = [
      { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, salary: 50000, hireDate: new Date('2023-01-15') },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, salary: 45000, hireDate: new Date('2023-03-20') },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35, salary: 60000, hireDate: new Date('2022-11-10') },
      { id: 4, name: 'Alice Brown', email: 'alice@example.com', age: 28, salary: 52000, hireDate: new Date('2023-05-05') }
    ];

    // Пример 1: JSON → Excel
    console.log('1. Конвертация JSON в Excel:');
    const excelFile = path.join(__dirname, 'test-output.xlsx');
    
    await JtcsvExcel.toExcel(testData, excelFile, {
      sheetName: 'Employees',
      includeHeaders: true,
      autoWidth: true,
      freezeHeader: true,
      columnStyles: {
        salary: { numFmt: '$#,##0.00' },
        hireDate: { numFmt: 'yyyy-mm-dd' }
      },
      headerStyle: {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B5' } },
        alignment: { horizontal: 'center' }
      }
    });

    console.log(`✅ Excel файл создан: ${excelFile}`);
    console.log();

    // Пример 2: Excel → JSON
    console.log('2. Конвертация Excel в JSON:');
    const jsonData = await JtcsvExcel.fromExcel(excelFile, {
      sheetName: 'Employees',
      hasHeaders: true,
      valueTransformers: {
        salary: (value) => parseFloat(value),
        hireDate: (value) => new Date(value)
      }
    });

    console.log('Прочитано записей:', jsonData.length);
    console.log('Первая запись:', JSON.stringify(jsonData[0], null, 2));
    console.log();

    // Пример 3: Excel → CSV
    console.log('3. Конвертация Excel в CSV:');
    const csvData = await JtcsvExcel.excelToCsv(excelFile, {
      csvOptions: { delimiter: ',', includeHeaders: true }
    });

    console.log('CSV данные (первые 200 символов):');
    console.log(csvData.substring(0, 200) + '...');
    console.log();

    // Пример 4: CSV → Excel
    console.log('4. Конвертация CSV в Excel:');
    const csvToExcelFile = path.join(__dirname, 'csv-converted.xlsx');
    
    await JtcsvExcel.csvToExcel(csvData, csvToExcelFile, {
      csvOptions: { delimiter: ',' },
      excelOptions: {
        sheetName: 'CSV Import',
        autoWidth: true
      }
    });

    console.log(`✅ CSV конвертирован в Excel: ${csvToExcelFile}`);
    console.log();

    // Пример 5: Несколько листов
    console.log('5. Создание Excel с несколькими листами:');
    const multiSheetData = {
      'Employees': testData,
      'Departments': [
        { id: 1, name: 'Engineering', manager: 'John Doe', budget: 500000 },
        { id: 2, name: 'Marketing', manager: 'Jane Smith', budget: 300000 },
        { id: 3, name: 'Sales', manager: 'Bob Johnson', budget: 400000 }
      ],
      'Summary': [
        { metric: 'Total Employees', value: testData.length },
        { metric: 'Average Salary', value: testData.reduce((sum, emp) => sum + emp.salary, 0) / testData.length },
        { metric: 'Average Age', value: testData.reduce((sum, emp) => sum + emp.age, 0) / testData.length }
      ]
    };

    const multiSheetFile = path.join(__dirname, 'multi-sheet.xlsx');
    await JtcsvExcel.createMultiSheetExcel(multiSheetData, multiSheetFile);
    console.log(`✅ Многостраничный Excel создан: ${multiSheetFile}`);
    console.log();

    // Пример 6: Чтение нескольких листов
    console.log('6. Чтение нескольких листов из Excel:');
    const sheets = await JtcsvExcel.readMultipleSheets(multiSheetFile);
    
    console.log('Найдено листов:', Object.keys(sheets).length);
    Object.entries(sheets).forEach(([sheetName, sheetInfo]) => {
      console.log(`  ${sheetName}: ${sheetInfo.data.length} записей`);
    });
    console.log();

    // Пример 7: Форматированный экспорт
    console.log('7. Экспорт с условным форматированием:');
    const formattedFile = path.join(__dirname, 'formatted.xlsx');
    
    await JtcsvExcel.exportWithFormatting(testData, {
      headerStyle: {
        font: { bold: true, size: 12 },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }
      },
      rules: {
        salary: [
          {
            condition: (value) => value > 55000,
            style: { font: { bold: true, color: { argb: 'FF00FF00' } } }
          },
          {
            condition: (value) => value < 47000,
            style: { font: { italic: true, color: { argb: 'FFFF0000' } } }
          }
        ],
        age: [
          {
            condition: (value) => value > 30,
            style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } } }
          }
        ]
      },
      numberFormat: '$#,##0.00',
      dateFormat: 'yyyy-mm-dd',
      addFilters: true
    }, formattedFile);

    console.log(`✅ Форматированный Excel создан: ${formattedFile}`);
    console.log();

    // Пример 8: Метаданные Excel
    console.log('8. Чтение метаданных Excel файла:');
    const metadata = await JtcsvExcel.getExcelMetadata(formattedFile);
    
    console.log('Метаданные:');
    console.log('  Создатель:', metadata.creator);
    console.log('  Дата создания:', metadata.created);
    console.log('  Листов:', metadata.worksheets.length);
    metadata.worksheets.forEach(ws => {
      console.log(`  - ${ws.name}: ${ws.rowCount} строк, ${ws.columnCount} столбцов`);
    });
    console.log();

    // Пример 9: Создание шаблона
    console.log('9. Создание шаблона Excel:');
    const templateHeaders = ['ID', 'Full Name', 'Email', 'Department', 'Salary', 'Hire Date'];
    const templateExample = [
      { 'ID': 1, 'Full Name': 'John Doe', 'Email': 'john@example.com', 'Department': 'Engineering', 'Salary': 50000, 'Hire Date': '2023-01-15' }
    ];
    
    const templateBuffer = await JtcsvExcel.createTemplate(templateHeaders, {
      sheetName: 'Employee Template',
      instructions: 'Заполните данные сотрудников. ID должен быть уникальным числом.',
      exampleData: templateExample,
      validationRules: {
        'ID': ['Только числа', 'Уникальный'],
        'Email': ['Должен содержать @', 'Валидный email'],
        'Salary': ['Только числа', 'Больше 0']
      }
    });

    const templateFile = path.join(__dirname, 'employee-template.xlsx');
    await fs.writeFile(templateFile, templateBuffer);
    console.log(`✅ Шаблон Excel создан: ${templateFile}`);
    console.log();

    // Очистка тестовых файлов
    console.log('🧹 Очистка тестовых файлов...');
    const filesToDelete = [
      excelFile,
      csvToExcelFile,
      multiSheetFile,
      formattedFile,
      templateFile
    ];

    for (const file of filesToDelete) {
      try {
        await fs.unlink(file);
        console.log(`  Удален: ${path.basename(file)}`);
      } catch (error) {
        // Игнорируем ошибки если файл не существует
      }
    }

    console.log('\n✅ Все примеры выполнены успешно!');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Запускаем примеры
runExamples();