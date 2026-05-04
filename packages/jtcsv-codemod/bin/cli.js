#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * jtcsv-codemod CLI — convenience wrapper around jscodeshift.
 *
 * Usage:
 *   npx jtcsv-codemod papaparse src/
 *   npx jtcsv-codemod papaparse "src/**\/*.{js,ts,tsx}" --dry
 */

const path = require('path');
const { execFileSync } = require('child_process');

const TRANSFORMS = {
  papaparse: 'papaparse-to-jtcsv',
};

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`jtcsv-codemod
Apply jscodeshift transforms to migrate to jtcsv.

Usage:
  jtcsv-codemod <transform> <path...> [-- <jscodeshift-args>]

Transforms:
  papaparse    Migrate from papaparse → jtcsv

Common jscodeshift flags (after --):
  --dry        Don't write changes; print a diff.
  --print      Print the transformed source.
  --extensions=js,jsx,ts,tsx
`);
  process.exit(args.length === 0 ? 1 : 0);
}

const transformName = args.shift();
const transform = TRANSFORMS[transformName];
if (!transform) {
  console.error(`Unknown transform: ${transformName}. Run with --help.`);
  process.exit(1);
}

const transformPath = path.resolve(__dirname, '..', 'transforms', `${transform}.js`);
const jscodeshift = require.resolve('jscodeshift/bin/jscodeshift.js');

const passThrough = ['-t', transformPath, '--extensions=js,jsx,ts,tsx', ...args];
const result = execFileSync(process.execPath, [jscodeshift, ...passThrough], { stdio: 'inherit' });
process.exit(result?.status ?? 0);
