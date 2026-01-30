const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

const files = [
  'jtcsv.umd.js',
  'jtcsv.esm.js',
  'jtcsv.cjs.js',
  'jtcsv-core.umd.js',
  'jtcsv-core.esm.js',
  'jtcsv-core.cjs.js',
  'jtcsv-full.umd.js',
  'jtcsv-full.esm.js',
  'jtcsv-full.cjs.js',
  'jtcsv-workers.umd.js',
  'jtcsv-workers.esm.js'
];

const missing = files.filter((file) => !fs.existsSync(path.join(dist, file)));
if (missing.length > 0) {
  console.error('Missing build artifacts:', missing);
  process.exit(1);
}

const workersEsm = fs.readFileSync(path.join(dist, 'jtcsv-workers.esm.js'), 'utf8');
if (!workersEsm.includes('WorkerPool') && !workersEsm.includes('worker')) {
  console.error('Workers bundle does not appear to include worker exports.');
  process.exit(1);
}

console.log('Browser build artifacts verified.');
