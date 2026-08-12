#!/usr/bin/env node
/**
 * Sync every hardcoded version constant in the source tree with
 * package.json#version.
 *
 * Background: several entry points carry a hardcoded version string (we
 * don't import package.json at runtime — that would require
 * @rollup/plugin-json and a moving part for every publish). To prevent
 * drift, this script:
 *
 *   - reads package.json#version (e.g. 3.2.3)
 *   - rewrites the version literal in each target below
 *   - exits non-zero with a clear message if a target has no match
 *
 * Targets:
 *   - bin/jtcsv.ts          `const VERSION = '...'`   (CLI --version)
 *   - src/browser/index.ts  `version: '...'`          (jtcsv/browser)
 *   - src/browser/core.ts   `version: '...'`          (browser core)
 *
 * The two browser entries previously reported '2.0.0-browser' and
 * '3.0.0-core' — frozen years behind the real package version. They now
 * report the package version verbatim; which bundle you loaded is
 * already evident from the import path.
 *
 * Wired into `prepublishOnly` so every publish ships versions in sync.
 * Also can be run standalone via `npm run sync:cli-version`.
 *
 * Idempotent: running it twice with the same package.json yields the
 * same files. CI-safe: makes no network calls, no destructive operations.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PKG_PATH = path.join(REPO_ROOT, 'package.json');

// Each target names the file, the regex capturing (prefix)(version)(suffix),
// and a label for the log line.
const TARGETS = [
  {
    label: 'bin/jtcsv.ts VERSION',
    file: path.join(REPO_ROOT, 'bin', 'jtcsv.ts'),
    // const VERSION = '3.2.3';  — single-quoted only, the canonical style.
    re: /^(\s*const VERSION\s*=\s*)'([^']+)'(\s*;\s*)$/m,
    hint: "a `const VERSION = '...'` line"
  },
  {
    label: 'src/browser/index.ts version',
    file: path.join(REPO_ROOT, 'src', 'browser', 'index.ts'),
    // version: '3.2.3'  — the last field of the exported jtcsv object.
    re: /^(\s*version:\s*)'([^']+)'(\s*)$/m,
    hint: "a `version: '...'` field"
  },
  {
    label: 'src/browser/core.ts version',
    file: path.join(REPO_ROOT, 'src', 'browser', 'core.ts'),
    re: /^(\s*version:\s*)'([^']+)'(\s*)$/m,
    hint: "a `version: '...'` field"
  }
];

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const pkg = readJSON(PKG_PATH);
const desiredVersion = pkg.version;
if (!desiredVersion || typeof desiredVersion !== 'string') {
  console.error('sync-cli-version: package.json#version missing or not a string');
  process.exit(1);
}

for (const { label, file, re, hint } of TARGETS) {
  const original = fs.readFileSync(file, 'utf8');
  const match = original.match(re);
  if (!match) {
    console.error(`sync-cli-version: no ${hint} found in ${path.relative(REPO_ROOT, file)}`);
    console.error('Add such a line or update this script if the format changed.');
    process.exit(1);
  }

  const currentVersion = match[2];
  if (currentVersion === desiredVersion) {
    console.log(`sync-cli-version: ${label} already at ${desiredVersion}.`);
    continue;
  }

  fs.writeFileSync(file, original.replace(re, `$1'${desiredVersion}'$3`));
  console.log(`sync-cli-version: ${label} ${currentVersion} -> ${desiredVersion}`);

  // Verify by re-reading — defensive.
  const verify = fs.readFileSync(file, 'utf8').match(re);
  if (!verify || verify[2] !== desiredVersion) {
    console.error('sync-cli-version: verification re-read failed — file may be corrupt');
    process.exit(2);
  }
}

process.exit(0);
