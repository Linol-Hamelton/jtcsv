const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Mock console to avoid output in tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('CLI Interface', () => {
  const testDir = './test-cli-temp';
  const cliPath = path.join(__dirname, '../bin/jtcsv.js');
  
  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterAll(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  function runCli(args) {
    return new Promise((resolve, reject) => {
      exec(`node ${cliPath} ${args}`, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr });
      });
    });
  }
  
  test('should show help when no arguments provided', async () => {
    const { stdout } = await runCli('');
    expect(stdout).toContain('jtcsv CLI');
    expect(stdout).toContain('USAGE:');
    expect(stdout).toContain('COMMANDS:');
  });
  
  test('should show version with --version flag', async () => {
    const { stdout } = await runCli('--version');
    expect(stdout).toContain('jtcsv v');
  });
  
  test('should show version with -v flag', async () => {
    const { stdout } = await runCli('-v');
    expect(stdout).toContain('jtcsv v');
  });
  
  test('should show version with version command', async () => {
    const { stdout } = await runCli('version');
    expect(stdout).toContain('jtcsv v');
  });
  
  test('should show help with help command', async () => {
    const { stdout } = await runCli('help');
    expect(stdout).toContain('jtcsv CLI');
    expect(stdout).toContain('USAGE:');
  });
  
  describe('JSON to CSV conversion', () => {
    const jsonFile = path.join(testDir, 'test.json');
    const csvFile = path.join(testDir, 'test.csv');
    
    beforeAll(async () => {
      // Create test JSON file
      const testData = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ];
      
      await fs.writeFile(jsonFile, JSON.stringify(testData), 'utf8');
    });
    
    afterAll(async () => {
      // Cleanup test files
      await fs.unlink(jsonFile).catch(() => {});
      await fs.unlink(csvFile).catch(() => {});
    });
    
    test('should convert JSON to CSV', async () => {
      const { stdout } = await runCli(`json2csv ${jsonFile} ${csvFile} --delimiter=,`);
      
      expect(stdout).toContain('Converting 2 records');
      expect(stdout).toContain('✓ Converted');
      
      // Verify CSV file was created
      const csvContent = await fs.readFile(csvFile, 'utf8');
      expect(csvContent).toContain('id,name,email');
      expect(csvContent).toContain('1,John,john@example.com');
      expect(csvContent).toContain('2,Jane,jane@example.com');
    });
    
    test('should handle missing output file', async () => {
      const { stderr } = await runCli('json2csv input.json');
      expect(stderr).toContain('Error');
      expect(stderr).toContain('Input and output files required');
    });
  });
  
  describe('CSV to JSON conversion', () => {
    const csvFile = path.join(testDir, 'test-input.csv');
    const jsonFile = path.join(testDir, 'test-output.json');
    
    beforeAll(async () => {
      // Create test CSV file
      const csvContent = 'id,name,email\n1,John,john@example.com\n2,Jane,jane@example.com';
      await fs.writeFile(csvFile, csvContent, 'utf8');
    });
    
    afterAll(async () => {
      // Cleanup test files
      await fs.unlink(csvFile).catch(() => {});
      await fs.unlink(jsonFile).catch(() => {});
    });
    
    test('should convert CSV to JSON', async () => {
      const { stdout } = await runCli(`csv2json ${csvFile} ${jsonFile} --delimiter=,`);
      
      expect(stdout).toContain('Reading CSV file');
      expect(stdout).toContain('✓ Converted');
      
      // Verify JSON file was created
      const jsonContent = await fs.readFile(jsonFile, 'utf8');
      const jsonData = JSON.parse(jsonContent);
      
      expect(jsonData).toHaveLength(2);
      expect(jsonData[0]).toEqual({ id: '1', name: 'John', email: 'john@example.com' });
      expect(jsonData[1]).toEqual({ id: '2', name: 'Jane', email: 'jane@example.com' });
    });
    
    test('should parse numbers with --parse-numbers flag', async () => {
      const { stdout } = await runCli(`csv2json ${csvFile} ${jsonFile} --delimiter=, --parse-numbers`);
      
      expect(stdout).toContain('✓ Converted');
      
      // Verify JSON file was created with parsed numbers
      const jsonContent = await fs.readFile(jsonFile, 'utf8');
      const jsonData = JSON.parse(jsonContent);
      
      expect(jsonData[0].id).toBe(1); // Should be number, not string
    });
  });
  
  describe('Error handling', () => {
    test('should show error for unknown command', async () => {
      const { stderr } = await runCli('unknown-command');
      expect(stderr).toContain('Error');
      expect(stderr).toContain('Unknown command');
    });
    
    test('should handle non-existent input file', async () => {
      const { stderr } = await runCli('json2csv non-existent.json output.csv');
      expect(stderr).toContain('Error');
    });
  });
});


