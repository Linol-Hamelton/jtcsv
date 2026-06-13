#!/usr/bin/env node
/**
 * coverage-badge.js — Produce a shields.io badge URL from Jest coverage summary.
 *
 * Reads coverage/coverage-summary.json (emitted by Jest when 'json-summary' is
 * present in coverageReporters) and writes coverage/badge.json with the four
 * percentages (lines, statements, functions, branches) rounded to 1 decimal.
 *
 * stdout:
 *   1. A shields.io URL keyed on the lines percentage
 *   2. A trailing 'BADGE=<url>' line for easy CI capture
 *
 * Usage:
 *   npm run test:coverage && node scripts/coverage-badge.js
 *
 * This script does NOT run tests. It only consumes existing output.
 * Exits 1 if coverage-summary.json is missing.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SUMMARY_PATH = path.join(ROOT, 'coverage', 'coverage-summary.json');
const BADGE_PATH = path.join(ROOT, 'coverage', 'badge.json');

function fail(msg) {
  process.stderr.write(`coverage-badge: ${msg}\n`);
  process.exit(1);
}

function colorFor(n) {
  if (n < 60) return 'red';
  if (n < 75) return 'orange';
  if (n < 85) return 'yellow';
  if (n < 90) return 'yellowgreen';
  if (n < 95) return 'green';
  return 'brightgreen';
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

if (!fs.existsSync(SUMMARY_PATH)) {
  fail(
    `coverage-summary.json not found at ${SUMMARY_PATH}. ` +
    `Run \`npm run test:coverage\` first (jest.config.js must include ` +
    `'json-summary' in coverageReporters).`
  );
}

let summary;
try {
  summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8'));
} catch (err) {
  fail(`failed to parse ${SUMMARY_PATH}: ${err.message}`);
}

const total = summary && summary.total;
if (!total) {
  fail(`coverage-summary.json has no "total" key — unexpected shape.`);
}

const pct = {
  lines: round1(Number(total.lines && total.lines.pct) || 0),
  statements: round1(Number(total.statements && total.statements.pct) || 0),
  functions: round1(Number(total.functions && total.functions.pct) || 0),
  branches: round1(Number(total.branches && total.branches.pct) || 0),
};

fs.writeFileSync(BADGE_PATH, JSON.stringify(pct, null, 2) + '\n', 'utf8');

const n = pct.lines;
const color = colorFor(n);
const url = `https://img.shields.io/badge/coverage-${n}%25-${color}.svg`;

process.stdout.write(`${url}\n`);
process.stdout.write(`BADGE=${url}\n`);
