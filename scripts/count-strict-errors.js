#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Strict TS regression gate.
 *
 * Runs `tsc --noEmit --project tsconfig.strict.json` and counts the errors.
 * Fails if the count exceeds the recorded baseline. The baseline is the
 * number of strict-mode errors at the time strict typing was first measured;
 * we ratchet it down as files get cleaned up but never let it grow.
 *
 * Usage:
 *   node scripts/count-strict-errors.js          # check vs baseline
 *   node scripts/count-strict-errors.js --update # set baseline = current
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASELINE_FILE = path.join(__dirname, '..', '.strict-baseline.json');
const UPDATE = process.argv.includes('--update');

function runTsc() {
  try {
    execSync('npx tsc --noEmit --project tsconfig.strict.json', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { count: 0, byFile: {} };
  } catch (err) {
    const out = (err.stdout || '') + (err.stderr || '');
    const lines = out.split('\n').filter((l) => /\): error TS\d+/.test(l));
    const byFile = {};
    for (const line of lines) {
      const m = line.match(/^([^(]+)\(/);
      if (m) {
        const file = m[1].replace(/\\/g, '/');
        byFile[file] = (byFile[file] || 0) + 1;
      }
    }
    return { count: lines.length, byFile };
  }
}

const { count, byFile } = runTsc();

if (UPDATE) {
  fs.writeFileSync(
    BASELINE_FILE,
    JSON.stringify({ baseline: count, recordedAt: new Date().toISOString(), byFile }, null, 2) + '\n',
  );
  console.log(`Recorded strict baseline: ${count} errors across ${Object.keys(byFile).length} files`);
  process.exit(0);
}

let baseline = Infinity;
if (fs.existsSync(BASELINE_FILE)) {
  baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')).baseline;
} else {
  console.warn('No .strict-baseline.json found. Run with --update to record one.');
  process.exit(0);
}

const fmt = (n) => n.toString().padStart(3);
console.log(`\n  Strict TS errors: ${count} (baseline ${baseline})`);

if (count > baseline) {
  console.error(`\n  \x1b[31mFAIL: strict-mode error count grew (+${count - baseline}). Fix the new errors or run with --update if intentional.\x1b[0m\n`);
  const sorted = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.error('  Top files by error count:');
  for (const [file, n] of sorted) console.error(`    ${fmt(n)}  ${file}`);
  console.error('');
  process.exit(1);
}

if (count < baseline) {
  console.log(`  \x1b[32mGOOD: strict errors decreased by ${baseline - count}. Run --update to ratchet baseline down.\x1b[0m\n`);
} else {
  console.log(`  \x1b[32mOK: strict error count matches baseline.\x1b[0m\n`);
}
