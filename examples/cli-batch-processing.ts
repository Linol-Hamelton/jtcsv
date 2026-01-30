import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jtcsv-batch-'));
const inputDir = path.join(tempDir, 'input');
const outputDir = path.join(tempDir, 'output');

fs.mkdirSync(inputDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const sampleData = [
  [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }],
  [{ id: 3, name: 'Max' }, { id: 4, name: 'Eva' }]
];

sampleData.forEach((data, idx) => {
  const filePath = path.join(inputDir, `data-${idx + 1}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});

const cliPath = path.join(__dirname, '..', 'bin', 'jtcsv.js');

const result = spawnSync('node', [
  cliPath,
  'batch',
  'json-to-csv',
  path.join(inputDir, '*.json'),
  outputDir,
  '--delimiter=,'
], { stdio: 'inherit' });

if (result.status !== 0) {
  process.exit(result.status);
}

console.log('Output files:', fs.readdirSync(outputDir));