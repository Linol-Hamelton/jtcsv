import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { exec, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

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

  function runCliArgs(args) {
    return new Promise((resolve) => {
      const child = spawn('node', [cliPath, ...args], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
    });
  }

  function runCliWithInput(args, input) {
    return new Promise((resolve) => {
      const child = spawn('node', [cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      child.stdin.write(input);
      child.stdin.end();
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

    test('should handle unicode paths', async () => {
      const unicodeJson = path.join(testDir, 'тест данные.json');
      const unicodeCsv = path.join(testDir, 'выход файл.csv');
      const testData = [{ id: 1, name: 'Иван', email: 'ivan@example.com' }];

      await fs.writeFile(unicodeJson, JSON.stringify(testData), 'utf8');

      const { stdout } = await runCliArgs(['json2csv', unicodeJson, unicodeCsv, '--delimiter=,']);

      expect(stdout).toContain('Converting 1 records');

      const csvContent = await fs.readFile(unicodeCsv, 'utf8');
      expect(csvContent).toContain('id,name,email');
      expect(csvContent).toContain('1,Иван,ivan@example.com');
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

  describe('STDIN/STDOUT', () => {
    test('should convert JSON to CSV via stdin/stdout', async () => {
      const inputJson = JSON.stringify([{ id: 1, name: 'Alice' }]);
      const { stdout, stderr, code } = await runCliWithInput(
        ['json2csv', '-', '-', '--delimiter=,'],
        inputJson
      );

      expect(code).toBe(0);
      expect(stderr).toBe('');
      expect(stdout).toContain('id,name');
      expect(stdout).toContain('1,Alice');
    });

    test('should convert CSV to JSON via stdin/stdout', async () => {
      const inputCsv = 'id,name\n1,Alice\n2,Bob';
      const { stdout, stderr, code } = await runCliWithInput(
        ['csv2json', '-', '-', '--delimiter=,'],
        inputCsv
      );

      expect(code).toBe(0);
      expect(stderr).toBe('');
      const parsed = JSON.parse(stdout);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ id: '1', name: 'Alice' });
    });
  });
});
