const { jsonToCsv, preprocessData, deepUnwrap, validateFilePath } = require('../index');

describe('Simple Test', () => {
  test('jsonToCsv should work', () => {
    const data = [{ id: 1, name: 'John' }];
    const result = jsonToCsv(data);
    expect(typeof result).toBe('string');
    expect(result).toContain('id;name');
    expect(result).toContain('1;John');
  });

  test('preprocessData should work', () => {
    const data = [{ id: 1, user: { name: 'John' } }];
    const result = preprocessData(data);
    expect(result[0].id).toBe(1);
    expect(typeof result[0].user).toBe('string');
  });

  test('deepUnwrap should work', () => {
    const result = deepUnwrap({ a: 1, b: 2 });
    expect(result).toBe('{"a":1,"b":2}');
  });

  test('validateFilePath should work', () => {
    expect(() => validateFilePath('test.csv')).not.toThrow();
    expect(() => validateFilePath('')).toThrow();
  });
});


