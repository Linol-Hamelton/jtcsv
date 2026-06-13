/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * setup-fc-seed.js — make fast-check property tests reproducible
 * and centrally tunable from the environment.
 *
 * Wires three env vars into a *single* fc.configureGlobal call so
 * fast-check sees the configuration atomically (avoids partial-merge
 * surprises if internals change):
 *
 *   - JTCSV_FUZZ_SEED    : positive integer    → global seed (default CI: 4242)
 *   - JTCSV_FUZZ_RUNS    : positive integer    → global numRuns
 *   - JTCSV_FUZZ_VERBOSE : '1' or 'true'       → verbose=2 (Verbose level)
 *
 * Loaded via jest.setupFilesAfterEach so it runs *after* fast-check is
 * imported by the test file but *before* the property starts.
 *
 * Invalid env values emit a console.warn (instead of the prior silent
 * skip — typos like JTCSV_FUZZ_SEED=4242x previously ran unseeded with
 * no signal at all).
 */
const seedEnv = process.env.JTCSV_FUZZ_SEED;
const runsEnv = process.env.JTCSV_FUZZ_RUNS;
const verboseEnv = process.env.JTCSV_FUZZ_VERBOSE;

const options = {};

if (seedEnv !== undefined && seedEnv !== '') {
  if (/^\d+$/.test(seedEnv)) {
    options.seed = Number(seedEnv);
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `[setup-fc-seed] Ignoring invalid JTCSV_FUZZ_SEED=${JSON.stringify(seedEnv)} — expected positive integer (regex /^\\d+$/).`,
    );
  }
}

if (runsEnv !== undefined && runsEnv !== '') {
  if (/^\d+$/.test(runsEnv)) {
    options.numRuns = Number(runsEnv);
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `[setup-fc-seed] Ignoring invalid JTCSV_FUZZ_RUNS=${JSON.stringify(runsEnv)} — expected positive integer (regex /^\\d+$/).`,
    );
  }
}

if (verboseEnv !== undefined && verboseEnv !== '') {
  if (verboseEnv === '1' || verboseEnv === 'true') {
    // 2 === fc.VerbosityLevel.Verbose; using the numeric literal avoids
    // pulling in the TS enum at runtime in a plain-JS setup file.
    options.verbose = 2;
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `[setup-fc-seed] Ignoring invalid JTCSV_FUZZ_VERBOSE=${JSON.stringify(verboseEnv)} — expected '1' or 'true'.`,
    );
  }
}

if (Object.keys(options).length > 0) {
  // fast-check is an optional devDep at the moment; skip silently when
  // running a partial test slice that doesn't pull it in.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fc = require('fast-check');
    // Single atomic configureGlobal so fast-check applies all three knobs
    // in one shot — internal merging semantics may change between releases.
    fc.configureGlobal(options);
  } catch {
    // Not installed — fuzz tests won't run anyway.
  }
}
