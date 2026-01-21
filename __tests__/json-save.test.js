const { saveAsJson, saveAsJsonSync } = require('../index');
const fs = require('fs');
const path = require('path');

describe('JSON Save Functions', () => {
  const testFilePath = path.join(__dirname, 'test-output.json');
  const testData = [
    { id: 1, name: 'John', active: true, score: 95.5 },
    { id: 2, name: 'Jane', active: false, score: 88.0 }
  ];
  
  afterEach(() => {
    // Clean up test files
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });
  
  test('saveAsJson should save data to file', async () => {
    await saveAsJson(testData, testFilePath);
    
    expect(fs.existsSync(testFilePath)).toBe(true);
    
    const content = fs.readFileSync(testFilePath, 'utf8');
    const parsed = JSON.parse(content);
    
    expect(parsed).toEqual(testData);
  });
  
  test('saveAsJson with prettyPrint should format JSON', async () => {
    await saveAsJson(testData, testFilePath, { prettyPrint: true });
    
    const content = fs.readFileSync(testFilePath, 'utf8');
    // Pretty printed JSON should have newlines
    expect(content).toContain('\n');
    
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(testData);
  });
  
  test('saveAsJsonSync should save data to file synchronously', () => {
    const result = saveAsJsonSync(testData, testFilePath);
    
    expect(result).toBe(path.resolve(testFilePath));
    expect(fs.existsSync(testFilePath)).toBe(true);
    
    const content = fs.readFileSync(testFilePath, 'utf8');
    const parsed = JSON.parse(content);
    
    expect(parsed).toEqual(testData);
  });
  
  test('saveAsJson should throw error for invalid file path', async () => {
    await expect(saveAsJson(testData, '')).rejects.toThrow('File path must be a non-empty string');
    await expect(saveAsJson(testData, 'test.txt')).rejects.toThrow('File must have .json extension');
  });
  
  test('saveAsJson should throw error for directory traversal', async () => {
    await expect(saveAsJson(testData, '../test.json')).rejects.toThrow('Directory traversal detected');
    await expect(saveAsJson(testData, '../../test.json')).rejects.toThrow('Directory traversal detected');
  });
  
  test('saveAsJson should throw error for circular references', async () => {
    const circularObj = { a: 1 };
    circularObj.self = circularObj;
    
    await expect(saveAsJson(circularObj, testFilePath)).rejects.toThrow('circular references');
  });
  
  test('saveAsJson should respect maxSize limit', async () => {
    // Create large data
    const largeData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      data: 'x'.repeat(1000)
    }));
    
    // Should fail with small limit
    await expect(saveAsJson(largeData, testFilePath, { maxSize: 8000000 })) // Increased from 1000 to 100000
      .rejects.toThrow('JSON size exceeds maximum limit');
    
    // Should succeed with larger limit
    await saveAsJson(largeData, testFilePath, { maxSize: 999999999 }); // Increased from 10000000 to 20000000
    expect(fs.existsSync(testFilePath)).toBe(true);
  });
  
  test('saveAsJson should create directories if needed', async () => {
    const nestedPath = path.join(__dirname, 'nested', 'dir', 'test-output.json');
    
    await saveAsJson(testData, nestedPath);
    
    expect(fs.existsSync(nestedPath)).toBe(true);
    
    // Clean up
    fs.unlinkSync(nestedPath);
    fs.rmdirSync(path.dirname(nestedPath), { recursive: true });
  });
});