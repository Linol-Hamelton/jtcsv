#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Sync the VERSION constant in `bin/jtcsv.ts` with package.json.
 *
 * Background: the CLI has a hardcoded VERSION constant (we don't import
 * package.json at runtime — that would require @rollup/plugin-json and
 * a moving-part for every publish). To prevent drift, this script:
 *
 *   - reads package.json#version (e.g. 3.2.1)
 *   - rewrites the line `const VERSION = '...'` in bin/jtcsv.ts
 *   - exits non-zero with a clear message if no version line was found
 *
 * Wired into `prepublishOnly` so every publish has bin VERSION in sync.
 * Also can be run standalone via `npm run sync:cli-version`.
 *
 * Idempotent: running it twice with the same package.json yields the
 * same file. CI-safe: makes no network calls, no destructive operations.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(REPO_ROOT, 'package.json');
const CLI_PATH = path.join(REPO_ROOT, 'bin', 'jtcsv.ts');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const pkg = readJSON(PKG_PATH);
const desiredVersion = pkg.version;
if (!desiredVersion || typeof desiredVersion !== 'string') {
  console.error('sync-cli-version: package.json#version missing or not a string');
  process.exit(1);
}

const original = fs.readFileSync(CLI_PATH, 'utf8');
// Match: const VERSION = '3.2.1';   (single-quoted only — that's the
// canonical style in this file; keeps the patch unambiguous.)
const VERSION_RE = /^(\s*const VERSION\s*=\s*)'([^']+)'(\s*;\s*)$/m;
const match = original.match(VERSION_RE);
if (!match) {
  console.error('sync-cli-version: no `const VERSION = \'...\'` line found in bin/jtcsv.ts');
  console.error('Add such a line or update this script if the format changed.');
  process.exit(1);
}
const currentVersion = match[2];

if (currentVersion === desiredVersion) {
  console.log(`sync-cli-version: bin/jtcsv.ts VERSION already at ${desiredVersion}.`);
  process.exit(0);
}

const updated = original.replace(VERSION_RE, `$1'${desiredVersion}'$3`);
fs.writeFileSync(CLI_PATH, updated);
console.log(`sync-cli-version: bin/jtcsv.ts VERSION ${currentVersion} -> ${desiredVersion}`);

// Also verify by re-reading — defensive.
const verify = fs.readFileSync(CLI_PATH, 'utf8').match(VERSION_RE);
if (!verify || verify[2] !== desiredVersion) {
  console.error('sync-cli-version: verification re-read failed — file may be corrupt');
  process.exit(2);
}
process.exit(0);
