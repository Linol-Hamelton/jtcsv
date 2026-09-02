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

// Same exclusions as `test:ci`. The benchmark suite asserts on measured
// ops/sec, which flips with runner noise: it failed a coverage gate on a
// commit that touched nothing it measures. Wall-clock assertions belong in
// benchmark.yml, where a slow runner costs a re-run rather than a red gate.
// These suites contribute no coverage of their own — they exercise the same
// code the unit tests already walk.
const EXCLUDED = [
  '__tests__/benchmark-suite\\.test',
  '__tests__/load-tests\\.test',
  '__tests__/soak-memory\\.test',
  '__tests__/memory-profiling\\.test'
].join('|');

const jestBin = require.resolve('jest/bin/jest');
const result = spawnSync(
  process.execPath,
  [jestBin, '--coverage', `--testPathIgnorePatterns=(${EXCLUDED})`],
  { stdio: 'inherit' }
);

process.exit(result.status ?? 1);
