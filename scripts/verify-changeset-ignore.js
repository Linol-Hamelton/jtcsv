#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Sanity-check `.changeset/config.json`'s `ignore` list against the actual
 * workspace.
 *
 * Reasons an ignore entry can drift out of sync with reality:
 *   - the workspace member was renamed (e.g. @jtcsv/codemod -> jtcsv-codemod)
 *     but its old name is still in ignore[]
 *   - the workspace member was deleted entirely
 *   - someone added an ignore[] entry by typo
 *
 * Exits non-zero if any entry in ignore[] does NOT match a workspace
 * package.json#name. CI gate via prepublishOnly.
 *
 * Conversely warns (but does not fail) if a workspace package is private
 * AND missing from ignore[] — that's usually fine (changesets skips
 * private packages automatically) but is worth noticing on rename.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(REPO_ROOT, '.changeset', 'config.json');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function listWorkspaceManifests() {
  const root = readJSON(path.join(REPO_ROOT, 'package.json'));
  const patterns = root.workspaces || [];
  const manifests = [];
  for (const pattern of patterns) {
    // Workspaces here are concrete paths like "packages/jtcsv-codemod"
    // (no globs in this repo). Read each one.
    const candidate = path.join(REPO_ROOT, pattern, 'package.json');
    if (fs.existsSync(candidate)) {
      manifests.push({ path: candidate, pkg: readJSON(candidate), dir: pattern });
    }
  }
  // Plus the root itself.
  manifests.push({ path: path.join(REPO_ROOT, 'package.json'), pkg: root, dir: '.' });
  return manifests;
}

const config = readJSON(CONFIG_PATH);
const ignore = config.ignore || [];
const manifests = listWorkspaceManifests();
const names = new Set(manifests.map((m) => m.pkg.name));

let failures = 0;
let warnings = 0;

console.log('');
console.log('  Verifying .changeset/config.json `ignore` list');
console.log('  ----------------------------------------------');

for (const entry of ignore) {
  if (names.has(entry)) {
    console.log(`  OK    ignore  ${entry}`);
  } else {
    console.log(`  \x1b[31mFAIL\x1b[0m  ignore  ${entry} — no workspace package with this name`);
    failures++;
  }
}

console.log('');
console.log('  Workspace packages NOT in ignore (informational only)');
console.log('  -----------------------------------------------------');
for (const m of manifests) {
  if (ignore.includes(m.pkg.name)) continue;
  if (m.pkg.private) {
    console.log(`  \x1b[33mWARN\x1b[0m  ${m.pkg.name.padEnd(36)}  (private) — ${m.dir}`);
    warnings++;
  } else {
    console.log(`  publishable ${m.pkg.name.padEnd(30)}  ${m.dir}`);
  }
}

console.log('');
if (failures) {
  console.error(`  \x1b[31m${failures} entries in ignore[] do not match any workspace package.\x1b[0m`);
  console.error('  Either rename them or remove them from .changeset/config.json.');
  console.error('');
  process.exit(1);
}
if (warnings) {
  console.log(`  \x1b[33m${warnings} private workspace package(s) not listed in ignore[]. That's usually fine\x1b[0m`);
  console.log("  (changesets skips private packages), but flag if you intend to publish them.");
}
console.log('  \x1b[32mAll ignore[] entries match real workspace packages.\x1b[0m');
console.log('');
process.exit(0);
