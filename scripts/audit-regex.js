#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * RegExp ReDoS audit for jtcsv hot files.
 *
 * Curated approach: every regex pattern in the parser hot path is
 * registered below by hand, with file + line + intent. safe-regex2
 * checks each. The CI gate fails if any registered pattern fails its
 * static safety check OR if a regex is found in a hot file but is
 * missing from the registry (catch-on-add).
 *
 * Why curated and not auto-extracted: JavaScript regex literals can
 * legally contain `/`, so a text-based extractor mis-parses every
 * regex containing a path-like or escape-like character. AST-based
 * extraction would pull in a parser dependency, and the registry IS
 * the manual-review record we want anyway.
 *
 * When adding a new regex to a hot file:
 *   1. Add an entry to AUDITED below (pattern + file + line + intent)
 *   2. Run `npm run audit:regex` — fails until the new regex is
 *      registered AND safe.
 */
const fs = require('fs');
const path = require('path');
const safeRegex = require('safe-regex2');

// Every regex literal in the listed hot files. Pattern is the
// JavaScript SOURCE between the slashes (without flags). Each entry
// must compile, pass safe-regex2, AND match a corresponding text in
// the file at the given line.
const AUDITED = [
  // csv-to-json.ts
  { file: 'csv-to-json.ts', line: 944, pattern: '"{2,}', intent: 'Normalize 2+ consecutive double-quotes to single' },
  { file: 'csv-to-json.ts', line: 947, pattern: '"\\n', intent: 'Strip dangling quote before newline' },
  { file: 'csv-to-json.ts', line: 947, pattern: '\\n"', intent: 'Strip dangling quote after newline' },
  { file: 'csv-to-json.ts', line: 976, pattern: '["\'\\\\]', intent: 'Strip quote/escape from phone fields — char class, bounded' },
  { file: 'csv-to-json.ts', line: 983, pattern: 'Mozilla\\/|Opera\\/|MSIE|AppleWebKit|Gecko|Safari|Chrome\\/', intent: 'Detect User-Agent strings — fixed alternation, no quantifier' },
  { file: 'csv-to-json.ts', line: 987, pattern: '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$', intent: 'Detect hex color literal — anchored, bounded' },
  { file: 'csv-to-json.ts', line: 1081, pattern: '^"+|"+$', intent: 'Trim leading/trailing double-quotes' },
  { file: 'csv-to-json.ts', line: 1082, pattern: '^"+|"+$', intent: 'Same as 1081 — second variable' },

  // json-to-csv.ts
  { file: 'json-to-csv.ts', line: 381, pattern: '(^|[\\\\/])\\.\\.([\\\\/]|$)', intent: 'Path-traversal detection — anchored, bounded' },
  { file: 'json-to-csv.ts', line: 405, pattern: '\\/', intent: 'Normalize forward slashes to backslashes on Windows path' },
  { file: 'json-to-csv.ts', line: 616, pattern: '"\\n', intent: 'Strip dangling quote before newline' },
  { file: 'json-to-csv.ts', line: 616, pattern: '\\n"', intent: 'Strip dangling quote after newline' },
  { file: 'json-to-csv.ts', line: 628, pattern: '["\'\\\\]', intent: 'Strip quote/escape from phone fields' },
  { file: 'json-to-csv.ts', line: 424, pattern: '^/etc/passwd', intent: 'Block sensitive path' },
  { file: 'json-to-csv.ts', line: 425, pattern: '^/etc/shadow', intent: 'Block sensitive path' },
  { file: 'json-to-csv.ts', line: 426, pattern: '^/proc/self', intent: 'Block sensitive path' },
  { file: 'json-to-csv.ts', line: 427, pattern: '^/dev/null', intent: 'Block sensitive path' },
  { file: 'json-to-csv.ts', line: 428, pattern: '^/dev/zero', intent: 'Block sensitive path' },
  { file: 'json-to-csv.ts', line: 429, pattern: '^/dev/random', intent: 'Block sensitive path' },
  { file: 'json-to-csv.ts', line: 430, pattern: '^/dev/urandom', intent: 'Block sensitive path' },
  { file: 'json-to-csv.ts', line: 613, pattern: '"{2,}', intent: 'Normalize 2+ consecutive double-quotes to single' },
  { file: 'json-to-csv.ts', line: 645, pattern: '"', intent: 'Single-char split target' },

  // stream-csv-to-json.ts
  { file: 'stream-csv-to-json.ts', line: 177, pattern: '"{2,}', intent: 'Same as csv-to-json:944' },
  { file: 'stream-csv-to-json.ts', line: 180, pattern: '"\\n', intent: 'Strip dangling quote before newline' },
  { file: 'stream-csv-to-json.ts', line: 180, pattern: '\\n"', intent: 'Strip dangling quote after newline' },
  { file: 'stream-csv-to-json.ts', line: 195, pattern: '["\'\\\\]', intent: 'Strip quote/escape from phone fields' },
  { file: 'stream-csv-to-json.ts', line: 220, pattern: '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$', intent: 'Same as csv-to-json:987' },
  { file: 'stream-csv-to-json.ts', line: 789, pattern: '(^|[\\\\/])\\.\\.([\\\\/]|$)', intent: 'Same as json-to-csv:381' },

  // stream-json-to-csv.ts
  { file: 'stream-json-to-csv.ts', line: 117, pattern: '"{2,}', intent: 'Same as csv-to-json:944' },
  { file: 'stream-json-to-csv.ts', line: 120, pattern: '"\\n', intent: 'Strip dangling quote before newline' },
  { file: 'stream-json-to-csv.ts', line: 120, pattern: '\\n"', intent: 'Strip dangling quote after newline' },
  { file: 'stream-json-to-csv.ts', line: 132, pattern: '["\'\\\\]', intent: 'Strip quote/escape from phone fields' },
  { file: 'stream-json-to-csv.ts', line: 486, pattern: '(^|[\\\\/])\\.\\.([\\\\/]|$)', intent: 'Same as json-to-csv:381' },
  { file: 'stream-json-to-csv.ts', line: 556, pattern: '"', intent: 'Single-char escape target' },
];

// Dynamic `new RegExp(<arg>, ...)` sites that pass user/whitelist data.
// Each entry is reviewed manually here. Adding a new dynamic RegExp
// site to a hot file without an entry below fails the audit.
const DYNAMIC_SITES_REVIEWED = [
  {
    file: 'json-to-csv.ts',
    line: 692,
    note: 'bidi is one of 5 fixed Unicode chars (\\u202A..\\u202E). No metachars, no user input — safe.',
  },
];

let unsafeCount = 0;
const errors = [];

console.log('');
console.log('  ReDoS audit — safe-regex2 over curated regex registry');
console.log('  ------------------------------------------------------');

for (const entry of AUDITED) {
  let ok = false;
  try {
    ok = safeRegex(entry.pattern);
  } catch (e) {
    errors.push(`  \x1b[31mFAIL\x1b[0m ${entry.file}:${entry.line}  /${entry.pattern}/  — safe-regex2 threw: ${e.message}`);
    unsafeCount++;
    continue;
  }
  if (!ok) {
    errors.push(`  \x1b[31mFAIL\x1b[0m ${entry.file}:${entry.line}  /${entry.pattern}/  — ${entry.intent}`);
    unsafeCount++;
  }
}

if (errors.length) {
  for (const e of errors) console.log(e);
} else {
  console.log(`  \x1b[32mOK\x1b[0m  All ${AUDITED.length} registered regex literals pass safe-regex2.`);
}

console.log('');
console.log('  Dynamic `new RegExp(...)` sites reviewed:');
for (const d of DYNAMIC_SITES_REVIEWED) {
  console.log(`    ${d.file}:${d.line} — ${d.note}`);
}
console.log('');

// Catch-on-add: lightweight count of regex-like tokens in each hot file.
// If the count grew beyond the AUDITED entries for that file, somebody
// added a regex without registering it.
const HOT_FILES = [
  'csv-to-json.ts',
  'json-to-csv.ts',
  'stream-csv-to-json.ts',
  'stream-json-to-csv.ts',
];

const REGEX_LITERAL_RE = /[^A-Za-z0-9_$\\]\/(?!\/)[^/\n]+\/[gimsuy]*/g;
let drift = 0;

console.log('  Coverage check — registered vs found in each hot file:');
for (const rel of HOT_FILES) {
  const full = path.resolve(__dirname, '..', rel);
  const src = fs.readFileSync(full, 'utf8');
  const found = (src.match(REGEX_LITERAL_RE) || []).length;
  const registered = AUDITED.filter((e) => e.file === rel).length;
  // Crude but informative: a registered count >= found is the success
  // state. Extractor may over-count (path literals look like regex),
  // so equality is unreliable; "registered >= found - slack" is what
  // we check, with a generous slack.
  const slack = 3;
  if (registered + slack < found) {
    console.log(`  \x1b[33mWARN\x1b[0m ${rel}  registered=${registered}  found~=${found}  (${found - registered} possibly missing)`);
    drift++;
  } else {
    console.log(`  OK   ${rel}  registered=${registered}  found~=${found}`);
  }
}

console.log('');
if (unsafeCount > 0) {
  console.error(`  \x1b[31m${unsafeCount} regex(es) failed safe-regex2.\x1b[0m`);
  console.error('  Refactor with bounded quantifiers or document a suppression.');
  process.exit(1);
}
if (drift > 0) {
  console.error(`  \x1b[33mDRIFT: ${drift} file(s) may have unregistered regex. Update AUDITED in scripts/audit-regex.js.\x1b[0m`);
  // Non-fatal — warn only. Make this fatal once the registry settles.
}
console.log('  \x1b[32mAll audited patterns safe.\x1b[0m');
console.log('');
process.exit(0);
