const { csvToJson, csvToJsonIterator } = require('../csv-to-json');

describe('csvToJson fast-path integration', () => {
  test('parses basic CSV with numbers and booleans', () => {
    const csv = 'id,name,age,active\n1,John,30,true\n2,Jane,25,false';
    const result = csvToJson(csv, {
      useFastPath: true,
      parseNumbers: true,
      parseBooleans: true
    });

    expect(result).toEqual([
      { id: 1, name: 'John', age: 30, active: true },
      { id: 2, name: 'Jane', age: 25, active: false }
    ]);
  });

  test('respects renameMap and trims headers', () => {
    const csv = ' id , full_name \n1,John Doe\n2,Jane Doe';
    const result = csvToJson(csv, {
      useFastPath: true,
      trim: true,
      renameMap: { full_name: 'name' }
    });

    expect(result).toEqual([
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Doe' }
    ]);
  });

  test('handles quoted fields with delimiters and newlines', () => {
    const csv = 'id,notes\n1,"hello, world"\n2,"line1\nline2"';
    const result = csvToJson(csv, { useFastPath: true });

    expect(result).toEqual([
      { id: '1', notes: 'hello, world' },
      { id: '2', notes: 'line1\nline2' }
    ]);
  });

  test('generates column headers when hasHeaders is false', () => {
    const csv = '1,John,30\n2,Jane,25';
    const result = csvToJson(csv, {
      useFastPath: true,
      hasHeaders: false,
      parseNumbers: true
    });

    expect(result).toEqual([
      { column1: 1, column2: 'John', column3: 30 },
      { column1: 2, column2: 'Jane', column3: 25 }
    ]);
  });

  test('supports compact mode for fast-path', () => {
    const csv = 'id,name,age\n1,John,30\n2,Jane,25';
    const result = csvToJson(csv, {
      useFastPath: true,
      fastPathMode: 'compact',
      parseNumbers: true
    });

    expect(result).toEqual([
      [1, 'John', 30],
      [2, 'Jane', 25]
    ]);
  });

  test('csvToJsonIterator yields rows in fast-path mode', async () => {
    const csv = 'id,name,age\n1,John,30\n2,Jane,25';
    const rows = [];

    for await (const row of csvToJsonIterator(csv, {
      useFastPath: true,
      parseNumbers: true
    })) {
      rows.push(row);
    }

    expect(rows).toEqual([
      { id: 1, name: 'John', age: 30 },
      { id: 2, name: 'Jane', age: 25 }
    ]);
  });

  test('csvToJsonIterator yields compact rows when configured', async () => {
    const csv = 'id,name,age\n1,John,30\n2,Jane,25';
    const rows = [];

    for await (const row of csvToJsonIterator(csv, {
      useFastPath: true,
      fastPathMode: 'compact',
      parseNumbers: true
    })) {
      rows.push(row);
    }

    expect(rows).toEqual([
      [1, 'John', 30],
      [2, 'Jane', 25]
    ]);
  });
});
