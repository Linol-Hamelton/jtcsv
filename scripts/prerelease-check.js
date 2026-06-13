#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Pre-publish guardrail — verify that the changesets prerelease mode
 * matches the shape of the version in root package.json.
 *
 * Runs from `prepublishOnly` and is also exposed as `npm run
 * prerelease:check`. The intent is to make it impossible to publish a
 * tarball whose dist-tag is wrong by accident:
 *
 *   - If package.json#version looks like a prerelease (e.g. 3.3.0-beta.0)
 *     then .changeset/pre.json MUST exist — otherwise `changeset publish`
 *     would tag it as `latest`, not `next`, and consumers running
 *     `npm install jtcsv` would suddenly get a beta.
 *
 *   - If package.json#version is a clean semver (e.g. 3.3.0) then
 *     .changeset/pre.json MUST NOT exist — otherwise `changeset publish`
 *     would tag it as `next`, hiding the stable release.
 *
 * Exit codes:
 *   0 — mode and version agree (clean ↔ no pre.json, beta ↔ pre.json present)
 *   1 — mismatch; remediation printed to stderr.
 *
 * No external deps; CJS only so this script runs identically under
 * Node 18+ with no build step.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
const VERSION = PKG.version;

const PRE_JSON_PATH = path.join(REPO_ROOT, '.changeset', 'pre.json');

const PRERELEASE_RE = /-(beta|rc|alpha)\.\d+$/;
const isPrerelease = PRERELEASE_RE.test(VERSION);
const preJsonExists = fs.existsSync(PRE_JSON_PATH);

if (isPrerelease && !preJsonExists) {
  console.error('[prerelease:check] FAIL');
  console.error('');
  console.error(`  package.json#version is "${VERSION}" — a prerelease tag,`);
  console.error('  but .changeset/pre.json is missing.');
  console.error('');
  console.error('  Without pre.json, `changeset publish` would tag this');
  console.error('  tarball as "latest" instead of "next", so consumers');
  console.error('  running `npm install jtcsv` would unexpectedly receive');
  console.error('  a beta build.');
  console.error('');
  console.error('  Fix — enter prerelease mode before bumping again:');
  console.error('');
  console.error('      npx changeset pre enter next');
  console.error('      npx changeset version');
  console.error('');
  process.exit(1);
}

if (!isPrerelease && preJsonExists) {
  console.error('[prerelease:check] FAIL');
  console.error('');
  console.error(`  package.json#version is "${VERSION}" — a clean semver,`);
  console.error('  but .changeset/pre.json still exists.');
  console.error('');
  console.error('  In prerelease mode `changeset publish` tags every');
  console.error('  publish as "next", so the stable release would be');
  console.error('  hidden from `npm install jtcsv`.');
  console.error('');
  console.error('  Fix — exit prerelease mode and re-version:');
  console.error('');
  console.error('      npx changeset pre exit');
  console.error('      npx changeset version');
  console.error('');
  process.exit(1);
}

const mode = isPrerelease ? 'prerelease (next)' : 'stable (latest)';
console.log(`[prerelease:check] OK — version=${VERSION}, mode=${mode}`);
process.exit(0);
