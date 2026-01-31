const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const nodeModules = path.join(root, 'node_modules');

function ensurePackage(name, typesPath, mainPath) {
  const dir = path.join(nodeModules, name);
  fs.mkdirSync(dir, { recursive: true });
  const pkg = {
    name,
    private: true,
    types: typesPath
  };
  if (mainPath) {
    pkg.main = mainPath;
  }
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
}

ensurePackage('jtcsv', '../../index.d.ts', '../../dist/index.js');
ensurePackage('jtcsv-browser-json', '../../src/browser/json-to-csv-browser.d.ts');
ensurePackage('jtcsv-browser-csv', '../../src/browser/csv-to-json-browser.d.ts');

const tsdBin = path.join(
  nodeModules,
  '.bin',
  process.platform === 'win32' ? 'tsd.cmd' : 'tsd'
);

const result = spawnSync(tsdBin, [], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
process.exit(typeof result.status === 'number' ? result.status : 1);
