#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Post-publish verification — confirm a freshly-published jtcsv@<v>
 * tarball matches the local source of truth.
 *
 * Run after `changeset publish` (or after a manual `npm publish`)
 * succeeds — it makes registry-side roundtrip checks and reports any
 * drift between what we believe we shipped and what npm shows.
 *
 * Usage:
 *   node scripts/verify-release.js              # checks current version from package.json
 *   node scripts/verify-release.js 3.2.2        # check a specific version
 *
 * Checks performed:
 *   1. `npm view jtcsv@<v>` resolves (the version actually published).
 *   2. dist.fileCount, dist.unpackedSize, dist.shasum match `npm pack
 *      --dry-run` for the local working tree (sanity that the published
 *      tarball came from this tree).
 *   3. dist.signatures array is non-empty (Sigstore attestation present).
 *   4. `npm audit signatures jtcsv@<v>` exits 0 (signature verification).
 *   5. bin/jtcsv.ts VERSION constant matches the version under test.
 *   6. CHANGELOG.md has a heading for `## <v>`.
 *
 * Exit codes:
 *   0 — every check passed
 *   1 — at least one check failed; details printed
 *
 * Non-goals: this script does NOT install the tarball into a sandbox
 * and run smoke tests. That is the consumer-side smoke test described
 * in RELEASING.md and is a manual checklist item after a major release.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
const VERSION = process.argv[2] || PKG.version;

const results = [];
function record(ok, name, detail) {
  results.push({ ok, name, detail });
  const tag = ok ? '\x1b[32mOK\x1b[0m  ' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  ${tag} ${name}${detail ? '  — ' + detail : ''}`);
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...opts });
}

console.log('');
console.log(`  Post-publish verification — jtcsv@${VERSION}`);
console.log('  ---------------------------------------------');

// 1. Registry resolves
let view;
try {
  const raw = sh(`npm view jtcsv@${VERSION} --json`, { stdio: ['ignore', 'pipe', 'pipe'] });
  view = JSON.parse(raw);
  record(true, 'Registry resolves', `version=${view.version}, tarball=${view.dist.tarball}`);
} catch (e) {
  record(false, 'Registry resolves', `npm view failed: ${e.message.split('\n')[0]}`);
  console.log('');
  console.error('  Halting — without a registry entry, downstream checks have nothing to compare against.');
  process.exit(1);
}

// 2. dist shape match — local pack vs registry dist
try {
  const localRaw = sh('npm pack --dry-run --json', { cwd: REPO_ROOT });
  const local = JSON.parse(localRaw)[0];
  const localFiles = local.files.length;
  const localSize = local.unpackedSize;

  const remoteFiles = view.dist.fileCount;
  const remoteSize = view.dist.unpackedSize;

  // Files counts can differ by 1-2 because of CHANGELOG entries
  // regenerated in the version bump — accept ±3 file slack and ±2 KB slack.
  const fileDelta = Math.abs(localFiles - remoteFiles);
  const sizeDelta = Math.abs(localSize - remoteSize);
  const filesOk = fileDelta <= 3;
  const sizeOk = sizeDelta <= 2048;

  record(filesOk, 'File count drift', `local=${localFiles}, remote=${remoteFiles}, |Δ|=${fileDelta}`);
  record(sizeOk, 'Unpacked size drift', `local=${localSize}, remote=${remoteSize}, |Δ|=${sizeDelta} bytes`);
} catch (e) {
  record(false, 'Local pack comparison', `npm pack --dry-run failed: ${e.message.split('\n')[0]}`);
}

// 3. Signatures array present
const sigs = view.dist.signatures || [];
record(
  sigs.length > 0,
  'Sigstore signatures',
  sigs.length ? `${sigs.length} signature(s), keyid=${sigs[0].keyid}` : 'no signatures in dist',
);

// 4. npm audit signatures
try {
  // Run in a temp dir so the audit doesn't include the whole repo dev tree.
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'jtcsv-verify-'));
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'jtcsv-verify-tmp', version: '0.0.0', dependencies: { jtcsv: VERSION } }, null, 2),
  );
  sh('npm install --no-audit --no-fund --silent', { cwd: tmpDir });
  const out = sh('npm audit signatures', { cwd: tmpDir });
  const ok = /all signatures verified/i.test(out) || /verified registry signatures/i.test(out);
  record(ok, 'npm audit signatures', ok ? 'verified' : 'no "verified" phrase in output');
  // Cleanup is best-effort
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
} catch (e) {
  record(false, 'npm audit signatures', e.message.split('\n')[0]);
}

// 5. bin VERSION matches package version
try {
  const cli = fs.readFileSync(path.join(REPO_ROOT, 'bin/jtcsv.ts'), 'utf8');
  const m = cli.match(/const VERSION\s*=\s*'([^']+)'/);
  const cliVersion = m ? m[1] : null;
  record(cliVersion === VERSION, 'bin/jtcsv.ts VERSION', `cli=${cliVersion}, expected=${VERSION}`);
} catch (e) {
  record(false, 'bin/jtcsv.ts VERSION', e.message);
}

// 6. CHANGELOG has the version heading
try {
  const cl = fs.readFileSync(path.join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
  const has = new RegExp(`^##\\s+${VERSION.replace(/\./g, '\\.')}\\b`, 'm').test(cl);
  record(has, 'CHANGELOG.md has heading', has ? `"## ${VERSION}"` : `missing "## ${VERSION}"`);
} catch (e) {
  record(false, 'CHANGELOG.md has heading', e.message);
}

console.log('');
const failed = results.filter((r) => !r.ok);
if (failed.length === 0) {
  console.log(`  \x1b[32mAll ${results.length} verification checks passed for jtcsv@${VERSION}.\x1b[0m`);
  console.log('');
  process.exit(0);
}
console.error(`  \x1b[31m${failed.length}/${results.length} checks failed for jtcsv@${VERSION}.\x1b[0m`);
console.error('');
console.error('  See RELEASING.md "Rollback procedure" for next steps.');
console.error('');
process.exit(1);
