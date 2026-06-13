#!/usr/bin/env node
/**
 * fuzz-replay.js — re-run ONE fast-check property locally for triage.
 *
 * Usage:
 *   JTCSV_FUZZ_SEED=4242 node scripts/fuzz-replay.js "comma newlines"
 *
 * Pins JTCSV_FUZZ_RUNS=1 + JTCSV_FUZZ_VERBOSE=1 so a single shrunk
 * counter-example surfaces immediately with full fast-check output.
 * Both env vars are picked up by __tests__/setup-fc-seed.js.
 *
 * Exit codes mirror jest: 0 on pass, jest's exit code on failure,
 * 2 on usage errors.
 */
const propertyFilter = process.argv[2] || '';
if (!propertyFilter) {
  console.error(
    'Usage: JTCSV_FUZZ_SEED=N node scripts/fuzz-replay.js "<test name substring>"',
  );
  process.exit(2);
}

const seed = process.env.JTCSV_FUZZ_SEED;
if (!seed || !/^\d+$/.test(seed)) {
  console.error('Set JTCSV_FUZZ_SEED to a positive integer first.');
  process.exit(2);
}

process.env.JTCSV_FUZZ_RUNS = '1';
process.env.JTCSV_FUZZ_VERBOSE = '1';

const { spawnSync } = require('child_process');
const args = [
  'jest',
  '--testPathPattern',
  'fuzz-roundtrip',
  '-t',
  propertyFilter,
  '--no-coverage',
];
const res = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  args,
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);
process.exit(res.status ?? 1);
