const { spawnSync } = require('child_process');

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find(value => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

const target = readArg('target', 'ts');
const scope = readArg('scope', 'full');
const strict = readArg('strict', '0');

process.env.JTCSV_COVERAGE_TARGET = target;
process.env.JTCSV_COVERAGE_SCOPE = scope;
process.env.JTCSV_COVERAGE_STRICT = strict;

const jestBin = require.resolve('jest/bin/jest');
const result = spawnSync(process.execPath, [jestBin, '--coverage'], {
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
